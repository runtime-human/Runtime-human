import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  parseDesktopEvidenceCapture,
  type DesktopEvidenceCapture,
} from "../../../scripts/performance/desktop-evidence-contract.mjs";

export async function writeValidatedCapture(
  outputPath: string,
  capture: unknown,
): Promise<DesktopEvidenceCapture> {
  const validated = parseDesktopEvidenceCapture(capture);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  return validated;
}
