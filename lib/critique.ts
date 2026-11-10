import path from "node:path";

import { dataDir } from "@/lib/data-dir";
import type { CritiqueScores } from "@/lib/interpret";

const MODEL_ID = "Xenova/nli-deberta-v3-small";

// Questions the entailment model answers about the log. These are not a word list.
const MOVE_HYPOTHESES = [
  "Another person replied to the writer.",
  "Someone else used the work.",
] as const;

const MOVE_FLOOR = 0.8;

type Entailment = {
  entailment: number;
  entailed: boolean;
};

type NliModel = {
  entail: (premise: string, hypothesis: string) => Promise<Entailment>;
};

let loading: Promise<NliModel> | null = null;

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map((value) => value / sum);
}

async function loadModel(): Promise<NliModel> {
  if (!loading) {
    loading = createModel().catch((error: unknown) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

async function createModel(): Promise<NliModel> {
  const { env, AutoModelForSequenceClassification, AutoTokenizer } = await import(
    "@huggingface/transformers"
  );
  env.cacheDir = path.join(dataDir(), "models");
  const modelId = process.env.ACTA_CRITIQUE_MODEL || MODEL_ID;
  const tokenizer = await AutoTokenizer.from_pretrained(modelId);
  const model = await AutoModelForSequenceClassification.from_pretrained(modelId, {
    dtype: "q8",
  });
  const label2id = (
    model.config as unknown as { label2id?: Record<string, number> }
  ).label2id;
  const entailmentId = label2id?.entailment;
  const contradictionId = label2id?.contradiction;
  const neutralId = label2id?.neutral;
  if (
    typeof entailmentId !== "number" ||
    typeof contradictionId !== "number" ||
    typeof neutralId !== "number"
  ) {
    throw new Error("critique model labels are missing");
  }

  return {
    async entail(premise: string, hypothesis: string): Promise<Entailment> {
      const inputs = tokenizer(premise, {
        text_pair: hypothesis,
        padding: true,
        truncation: true,
      });
      const outputs = await model(inputs);
      const logits = Array.from(outputs.logits.data as ArrayLike<number>);
      if (logits.length < 3 || logits.some((value) => !Number.isFinite(value))) {
        throw new Error("critique model returned no score");
      }
      const probabilities = softmax(logits);
      const entailment = probabilities[entailmentId];
      if (entailment === undefined || !Number.isFinite(entailment)) {
        throw new Error("critique model returned no score");
      }
      const top = probabilities.indexOf(Math.max(...probabilities));
      return { entailment, entailed: top === entailmentId && entailment >= MOVE_FLOOR };
    },
  };
}

export function warmCritique(): Promise<void> {
  return loadModel().then(() => undefined);
}

export async function critiqueText(text: string): Promise<CritiqueScores> {
  const model = await loadModel();
  let move = 0;
  for (const hypothesis of MOVE_HYPOTHESES) {
    const reading = await model.entail(text, hypothesis);
    if (reading.entailed && reading.entailment > move) {
      move = reading.entailment;
    }
  }
  return { move, hold: move > 0 ? 0 : 1 };
}
