export type CritiqueScores = {
  move: number;
  hold: number;
};

export type CritiqueReading =
  | { ok: true; standing: number | null }
  | { ok: false };

function isUnit(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function standingLevel(move: number): number {
  if (move >= 0.95) return 4;
  if (move >= 0.88) return 3;
  return 2;
}

// Standing changes only when the critique's move reading is confident.
export function interpretCritique(
  current: number | null,
  scores: CritiqueScores,
): CritiqueReading {
  const { move, hold } = scores;
  if (!isUnit(move) || !isUnit(hold)) return { ok: false };
  if (move < 0.8) return { ok: true, standing: current };
  return { ok: true, standing: standingLevel(move) };
}
