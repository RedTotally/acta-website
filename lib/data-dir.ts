import fs from "node:fs";
import path from "node:path";

export function dataDir(): string {
  const dir = process.env.ACTA_DATA_DIR
    ? path.resolve(process.env.ACTA_DATA_DIR)
    : path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
