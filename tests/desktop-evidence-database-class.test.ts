import { basename } from "node:path";

import { describe, expect, it } from "vitest";

import { parseStartupCaptureArguments } from "../tools/desktop-evidence/src/capture-options.js";

const COMMIT = "a".repeat(40);

function captureArguments(database: string): string[] {
  return [
    `--commit=${COMMIT}`,
    "--process=cold-process",
    "--os-cache=warm-os-cache",
    `--database=${database}`,
    "--sample-role=measurement",
    "--sample-index=7",
  ];
}

describe("desktop evidence database class", () => {
  it("accepts an existing database as a distinct startup evidence population", () => {
    const options = parseStartupCaptureArguments(captureArguments("existing-database"), process.cwd());

    expect(options.database).toBe("existing-database");
    expect(basename(options.outputPath)).toBe(
      "startup-shell-fmp-cold-process-warm-os-cache-existing-database-measurement-7.json",
    );
  });

  it("keeps the original new-database population valid", () => {
    const options = parseStartupCaptureArguments(captureArguments("new-database"), process.cwd());

    expect(options.database).toBe("new-database");
  });

  it("rejects database classes without implemented capture semantics", () => {
    expect(() => parseStartupCaptureArguments(captureArguments("mystery-database"))).toThrow(
      "--database has an unsupported value",
    );
  });
});
