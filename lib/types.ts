export type Member = {
  userId: string;
  name: string;
  standing: number | null;
  standingLog: string | null;
  owner: boolean;
};

export type LogResult =
  | { status: "unchanged" }
  | { status: "updated"; members: Member[] }
  | { status: "error" }
  | { status: "forbidden" }
  | { status: "too-long" };

export type LogActionResult = LogResult | { status: "signed-out" };

export type FormState = { error: string } | null;
