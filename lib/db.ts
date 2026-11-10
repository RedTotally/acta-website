import { createHash, randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { dataDir } from "@/lib/data-dir";
import type { Member } from "@/lib/types";

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
};

let database: DatabaseSync | null = null;

export function resetDbForTests(): void {
  database?.close();
  database = null;
}

export function getDb(): DatabaseSync {
  if (database) return database;
  const file = path.join(dataDir(), "acta.sqlite");
  const db = new DatabaseSync(file, { timeout: 5000 });
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      join_token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memberships (
      group_id TEXT NOT NULL REFERENCES groups(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      standing INTEGER,
      standing_log TEXT,
      standing_at TEXT,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (group_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      outcome TEXT NOT NULL,
      standing_before INTEGER,
      standing_after INTEGER,
      score_move REAL,
      score_hold REAL,
      created_at TEXT NOT NULL
    );
  `);
  database = db;
  return db;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function now(): string {
  return new Date().toISOString();
}

export function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): { id: string; email: string; name: string } {
  const id = randomUUID();
  getDb()
    .prepare(
      "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(id, input.email, input.name, input.passwordHash, now());
  return { id, email: input.email, name: input.name };
}

export function findUserByEmail(email: string): UserRow | null {
  const row = getDb()
    .prepare(
      "SELECT id, email, name, password_hash FROM users WHERE email = ?",
    )
    .get(email) as UserRow | undefined;
  return row ?? null;
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  getDb()
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    )
    .run(hashToken(token), userId, expires);
  return token;
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function userForSessionToken(
  token: string,
): { id: string; email: string; name: string } | null {
  const row = getDb()
    .prepare(
      `SELECT u.id AS id, u.email AS email, u.name AS name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), now()) as
    | { id: string; email: string; name: string }
    | undefined;
  return row ?? null;
}

export function createGroup(
  ownerId: string,
  name: string,
): { id: string; joinToken: string } {
  const id = randomUUID();
  const joinToken = randomBytes(18).toString("base64url");
  const created = now();
  const db = getDb();
  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO groups (id, name, owner_id, join_token, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(id, name, ownerId, joinToken, created);
    db.prepare(
      `INSERT INTO memberships (group_id, user_id, standing, standing_log, standing_at, joined_at)
       VALUES (?, ?, NULL, NULL, NULL, ?)`,
    ).run(id, ownerId, created);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { id, joinToken };
}

export function listGroupsForUser(
  userId: string,
): { id: string; name: string }[] {
  return getDb()
    .prepare(
      `SELECT g.id AS id, g.name AS name
       FROM groups g
       JOIN memberships m ON m.group_id = g.id
       WHERE m.user_id = ?
       ORDER BY m.joined_at DESC`,
    )
    .all(userId) as { id: string; name: string }[];
}

export function groupByToken(
  token: string,
): { id: string; name: string } | null {
  const row = getDb()
    .prepare("SELECT id, name FROM groups WHERE join_token = ?")
    .get(token) as { id: string; name: string } | undefined;
  return row ?? null;
}

export function addMember(groupId: string, userId: string): void {
  getDb()
    .prepare(
      `INSERT INTO memberships (group_id, user_id, standing, standing_log, standing_at, joined_at)
       VALUES (?, ?, NULL, NULL, NULL, ?)
       ON CONFLICT (group_id, user_id) DO NOTHING`,
    )
    .run(groupId, userId, now());
}

export function listMembers(groupId: string): Member[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id AS userId,
              u.name AS name,
              m.standing AS standing,
              m.standing_log AS standingLog,
              CASE WHEN g.owner_id = u.id THEN 1 ELSE 0 END AS owner
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       JOIN groups g ON g.id = m.group_id
       WHERE m.group_id = ?
       ORDER BY m.standing IS NULL, m.standing DESC, m.joined_at ASC`,
    )
    .all(groupId) as {
    userId: string;
    name: string;
    standing: number | null;
    standingLog: string | null;
    owner: number;
  }[];

  return rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    standing: row.standing,
    standingLog: row.standingLog,
    owner: row.owner === 1,
  }));
}

export function groupForMember(
  groupId: string,
  userId: string,
): { id: string; name: string; joinToken: string; members: Member[] } | null {
  const row = getDb()
    .prepare(
      `SELECT g.id AS id, g.name AS name, g.join_token AS joinToken
       FROM groups g
       JOIN memberships m ON m.group_id = g.id AND m.user_id = ?
       WHERE g.id = ?`,
    )
    .get(userId, groupId) as
    | { id: string; name: string; joinToken: string }
    | undefined;
  if (!row) return null;
  return { ...row, members: listMembers(groupId) };
}

export function getMemberStanding(
  groupId: string,
  userId: string,
): number | null | undefined {
  const row = getDb()
    .prepare(
      "SELECT standing FROM memberships WHERE group_id = ? AND user_id = ?",
    )
    .get(groupId, userId) as { standing: number | null } | undefined;
  if (!row) return undefined;
  return row.standing;
}

export function setStanding(
  groupId: string,
  userId: string,
  standing: number,
  log: string,
): number {
  const result = getDb()
    .prepare(
      `UPDATE memberships
       SET standing = ?, standing_log = ?, standing_at = ?
       WHERE group_id = ? AND user_id = ?`,
    )
    .run(standing, log, now(), groupId, userId);
  return Number(result.changes);
}

export function insertLog(input: {
  groupId: string;
  userId: string;
  body: string;
  outcome: string;
  standingBefore: number | null;
  standingAfter: number | null;
  scoreMove: number | null;
  scoreHold: number | null;
}): void {
  getDb()
    .prepare(
      `INSERT INTO logs (
         id, group_id, user_id, body, outcome, standing_before, standing_after,
         score_move, score_hold, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      input.groupId,
      input.userId,
      input.body,
      input.outcome,
      input.standingBefore,
      input.standingAfter,
      input.scoreMove,
      input.scoreHold,
      now(),
    );
}
