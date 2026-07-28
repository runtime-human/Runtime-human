import type { DesktopEvidenceReport } from "./performance/desktop-evidence-contract.mjs";

export type DesktopEvidenceCliOptions = Readonly<{
  inputs: readonly string[];
  output: string;
}>;

export function parseDesktopEvidenceArguments(
  args: readonly string[],
): DesktopEvidenceCliOptions;

export function runDesktopEvidenceCli(
  args: readonly string[],
  log?: (message: string) => void,
): Promise<DesktopEvidenceReport>;
