import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadPrompt(name) {
  const path = join(__dirname, "../prompts", `${name}.txt`);
  return readFileSync(path, "utf-8").trim();
}
