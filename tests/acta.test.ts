import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, test } from "node:test";

import {
  addMember,
  createGroup,
  createSession,
  createUser,
  getDb,
  getMemberStanding,
  listMembers,
  resetDbForTests,
  userForSessionToken,
} from "../lib/db";
import { interpretCritique, standingLevel } from "../lib/interpret";
import { hashPassword, verifyPassword } from "../lib/passwords";
import { joinUrl, safeNext } from "../lib/paths";
import { submitLog } from "../lib/submit-log";

process.env.ACTA_DATA_DIR = mkdtempSync(path.join(tmpdir(), "acta-"));
resetDbForTests();

function wipe() {
  const db = getDb();
  db.exec("DELETE FROM logs");
  db.exec("DELETE FROM memberships");
  db.exec("DELETE FROM sessions");
  db.exec("DELETE FROM groups");
  db.exec("DELETE FROM users");
}

beforeEach(() => {
  wipe();
});

function ownerWithGroup() {
  const owner = createUser({
    name: "Ada",
    email: "ada@example.com",
    passwordHash: hashPassword("password1"),
  });
  const group = createGroup(owner.id, "Evening group");
  return { owner, group };
}

test("standing follows the critique result, not the wording", async () => {
  const { owner, group } = ownerWithGroup();
  const moved = await submitLog({
    groupId: group.id,
    userId: owner.id,
    text: "updated my CV",
    critique: async () => ({ move: 0.97, hold: 0 }),
  });
  assert.equal(moved.status, "updated");
  assert.equal(getMemberStanding(group.id, owner.id), standingLevel(0.97));

  wipe();
  const { owner: again, group: quietGroup } = ownerWithGroup();
  const held = await submitLog({
    groupId: quietGroup.id,
    userId: again.id,
    text: "Applied to three roles, one reply",
    critique: async () => ({ move: 0, hold: 1 }),
  });
  assert.equal(held.status, "unchanged");
  assert.equal(getMemberStanding(quietGroup.id, again.id), null);
});

test("an empty log closes without scoring", async () => {
  const { owner, group } = ownerWithGroup();
  let calls = 0;
  const result = await submitLog({
    groupId: group.id,
    userId: owner.id,
    text: "   ",
    critique: async () => {
      calls += 1;
      return { move: 0.99, hold: 0 };
    },
  });
  assert.equal(calls, 0);
  assert.equal(result.status, "unchanged");
  assert.equal(getMemberStanding(group.id, owner.id), null);
});

test("a score failure leaves the board where it is", async () => {
  const { owner, group } = ownerWithGroup();
  const result = await submitLog({
    groupId: group.id,
    userId: owner.id,
    text: "Applied to three roles, one reply",
    critique: async () => {
      throw new Error("model unavailable");
    },
  });
  assert.equal(result.status, "error");
  assert.equal(getMemberStanding(group.id, owner.id), null);

  const bad = await submitLog({
    groupId: group.id,
    userId: owner.id,
    text: "Applied to three roles, one reply",
    critique: async () => ({ move: Number.NaN, hold: 1 }),
  });
  assert.equal(bad.status, "error");
  assert.equal(getMemberStanding(group.id, owner.id), null);
});

test("a second log the same day moves the board only when the score changes", async () => {
  const { owner, group } = ownerWithGroup();
  const first = await submitLog({
    groupId: group.id,
    userId: owner.id,
    text: "Applied to three roles, one reply",
    critique: async () => ({ move: 0.96, hold: 0 }),
  });
  const second = await submitLog({
    groupId: group.id,
    userId: owner.id,
    text: "Sent the notes again",
    critique: async () => ({ move: 0.96, hold: 0 }),
  });
  assert.equal(first.status, "updated");
  assert.equal(second.status, "unchanged");
  assert.equal(getMemberStanding(group.id, owner.id), 4);

  const third = await submitLog({
    groupId: group.id,
    userId: owner.id,
    text: "The coach named me captain",
    critique: async () => ({ move: 0.9, hold: 0 }),
  });
  assert.equal(third.status, "updated");
  assert.equal(getMemberStanding(group.id, owner.id), 3);

  const rows = getDb()
    .prepare("SELECT outcome, created_at FROM logs ORDER BY created_at")
    .all() as { outcome: string; created_at: string }[];
  assert.deepEqual(
    rows.map((row) => row.outcome),
    ["updated", "unchanged", "updated"],
  );
  assert.equal(rows[0].created_at.slice(0, 10), rows[1].created_at.slice(0, 10));
});

test("membership is the account id", () => {
  const ada = createUser({
    name: "Sam",
    email: "sam-one@example.com",
    passwordHash: "x",
  });
  const other = createUser({
    name: "Sam",
    email: "sam-two@example.com",
    passwordHash: "y",
  });
  const group = createGroup(ada.id, "Batch");
  addMember(group.id, other.id);
  const members = listMembers(group.id);
  assert.deepEqual(
    members.map((member) => member.userId).sort(),
    [ada.id, other.id].sort(),
  );
  const token = createSession(other.id);
  assert.equal(userForSessionToken(token)?.id, other.id);
  assert.equal(verifyPassword("password1", hashPassword("password1")), true);
});

test("next returns only a join or board path", () => {
  assert.equal(safeNext("/join/abc_DEF-123"), "/join/abc_DEF-123");
  assert.equal(
    safeNext("/groups/550e8400-e29b-41d4-a716-446655440000"),
    "/groups/550e8400-e29b-41d4-a716-446655440000",
  );
  assert.equal(safeNext("/download"), null);
  assert.equal(safeNext("/profile"), null);
  assert.equal(safeNext("https://evil.example/join/abc"), null);
  assert.equal(safeNext("//evil.example/join/abc"), null);
  assert.equal(safeNext("/join/abc/../../download"), null);
  assert.equal(joinUrl("http://localhost:3000", "abc"), "http://localhost:3000/join/abc");
  assert.equal(joinUrl("https://preview.example/", "abc"), "https://preview.example/join/abc");
});

test("interpretCritique does not invent a level for a weak reading", () => {
  assert.deepEqual(interpretCritique(null, { move: 0.2, hold: 1 }), {
    ok: true,
    standing: null,
  });
  assert.deepEqual(interpretCritique(4, { move: 0.96, hold: 0 }), {
    ok: true,
    standing: 4,
  });
  assert.equal(interpretCritique(null, { move: Number.NaN, hold: 0 }).ok, false);
});

test("the site keeps the locked copy and skips the forbidden product strings", () => {
  const files = sourceFiles(path.join(process.cwd(), "app")).concat(
    sourceFiles(path.join(process.cwd(), "components")),
    sourceFiles(path.join(process.cwd(), "lib")),
  );
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.match(source, /Create a group\./);
  assert.match(source, /Share this link to join\./);
  assert.match(source, /What did you do\?/);
  assert.match(source, /The score could not be worked out\./);
  assert.equal(/rounded-(md|lg|xl|2xl|3xl|full)\b/.test(source), false);
  assert.equal(source.includes("pmgiunkurflqrlczaxjf"), false);
  assert.equal(/HPSHCC/i.test(source), false);
  assert.equal(/updated my CV/.test(readFileSync(path.join(process.cwd(), "lib/critique.ts"), "utf8")), false);
  assert.equal(/updated my CV/.test(readFileSync(path.join(process.cwd(), "lib/interpret.ts"), "utf8")), false);
});

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...sourceFiles(full));
    } else if (/\.(tsx|ts)$/.test(entry)) {
      found.push(full);
    }
  }
  return found;
}
