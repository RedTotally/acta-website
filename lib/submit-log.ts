import {
  getMemberStanding,
  insertLog,
  listMembers,
  setStanding,
} from "@/lib/db";
import { interpretCritique, type CritiqueScores } from "@/lib/interpret";
import type { LogResult } from "@/lib/types";

export type Critique = (text: string) => Promise<CritiqueScores>;

const MAX_LOG_LENGTH = 4000;

export async function submitLog(input: {
  groupId: string;
  userId: string;
  text: string;
  critique: Critique;
}): Promise<LogResult> {
  const before = getMemberStanding(input.groupId, input.userId);
  if (before === undefined) return { status: "forbidden" };

  const text = input.text.trim();
  if (!text) return { status: "unchanged" };
  if (text.length > MAX_LOG_LENGTH) return { status: "too-long" };

  let scores: CritiqueScores;
  try {
    scores = await input.critique(text);
  } catch {
    return { status: "error" };
  }

  const judged = interpretCritique(before, scores);
  if (!judged.ok) return { status: "error" };

  if (judged.standing === before) {
    insertLog({
      groupId: input.groupId,
      userId: input.userId,
      body: text,
      outcome: "unchanged",
      standingBefore: before,
      standingAfter: before,
      scoreMove: scores.move,
      scoreHold: scores.hold,
    });
    return { status: "unchanged" };
  }

  if (judged.standing === null) return { status: "unchanged" };

  const written = setStanding(input.groupId, input.userId, judged.standing, text);
  if (written !== 1) return { status: "error" };

  insertLog({
    groupId: input.groupId,
    userId: input.userId,
    body: text,
    outcome: "updated",
    standingBefore: before,
    standingAfter: judged.standing,
    scoreMove: scores.move,
    scoreHold: scores.hold,
  });

  return { status: "updated", members: listMembers(input.groupId) };
}
