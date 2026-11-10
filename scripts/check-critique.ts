import { critiqueText } from "../lib/critique";
import { interpretCritique } from "../lib/interpret";

async function judge(text: string, current: number | null) {
  const scores = await critiqueText(text);
  const reading = interpretCritique(current, scores);
  console.log(JSON.stringify({ text, scores, reading }));
  return reading;
}

async function main() {
  const applied = await judge("Applied to three roles, one reply", null);
  if (!applied.ok || applied.standing === null) {
    throw new Error("a log with a reply should change standing");
  }

  const again = await judge("Applied to three roles, one reply", applied.standing);
  if (!again.ok || again.standing !== applied.standing) {
    throw new Error("the same log again should leave standing where it is");
  }

  const cv = await judge("updated my CV", null);
  if (!cv.ok || cv.standing !== null) {
    throw new Error("a CV update with no outside result should leave standing");
  }

  const cvReply = await judge(
    "I rewrote my CV and a hiring manager replied the same day",
    null,
  );
  if (!cvReply.ok || cvReply.standing === null) {
    throw new Error("a checkable reply should change standing");
  }

  const hello = await judge("hello", null);
  if (!hello.ok || hello.standing !== null) {
    throw new Error("hello should not change standing");
  }

  console.log("critique checks passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
