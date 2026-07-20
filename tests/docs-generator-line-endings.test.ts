import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function convertToCrlf(file: string): void {
  const normalized = readFileSync(file, "utf8").replace(/\r\n?/gu, "\n");
  writeFileSync(file, normalized.replace(/\n/gu, "\r\n"), "utf8");
}

describe("documentation generator portability", () => {
  it("accepts generated documentation checked out with CRLF line endings", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "runtime-human-docs-"));

    try {
      cpSync(join(ROOT, "docs"), join(temporaryRoot, "docs"), { recursive: true });
      mkdirSync(join(temporaryRoot, "scripts"), { recursive: true });
      cpSync(
        join(ROOT, "scripts", "build-toc.mjs"),
        join(temporaryRoot, "scripts", "build-toc.mjs"),
      );

      convertToCrlf(join(temporaryRoot, "docs", "MANIFEST.jsonc"));
      convertToCrlf(join(temporaryRoot, "docs", "CATALOG.md"));

      expect(() =>
        execFileSync(process.execPath, [join(temporaryRoot, "scripts", "build-toc.mjs"), "--check"], {
          cwd: temporaryRoot,
          encoding: "utf8",
          stdio: "pipe",
        }),
      ).not.toThrow();
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
