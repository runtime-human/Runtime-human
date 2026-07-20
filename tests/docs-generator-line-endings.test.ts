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

function createFixtureRoot(): string {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "runtime-human-docs-"));
  cpSync(join(ROOT, "docs"), join(temporaryRoot, "docs"), { recursive: true });
  mkdirSync(join(temporaryRoot, "scripts"), { recursive: true });
  cpSync(
    join(ROOT, "scripts", "build-toc.mjs"),
    join(temporaryRoot, "scripts", "build-toc.mjs"),
  );
  return temporaryRoot;
}

function runGenerator(temporaryRoot: string, ...arguments_: string[]): void {
  execFileSync(
    process.execPath,
    [join(temporaryRoot, "scripts", "build-toc.mjs"), ...arguments_],
    {
      cwd: temporaryRoot,
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

function convertToCrlf(file: string): void {
  const normalized = readFileSync(file, "utf8").replace(/\r\n?/gu, "\n");
  writeFileSync(file, normalized.replace(/\n/gu, "\r\n"), "utf8");
}

describe("documentation generator portability", () => {
  it("accepts generated documentation checked out with CRLF line endings", () => {
    const temporaryRoot = createFixtureRoot();

    try {
      convertToCrlf(join(temporaryRoot, "docs", "MANIFEST.jsonc"));
      convertToCrlf(join(temporaryRoot, "docs", "CATALOG.md"));

      expect(() => runGenerator(temporaryRoot, "--check")).not.toThrow();
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("rejects unknown front-matter keys instead of assigning them dynamically", () => {
    const temporaryRoot = createFixtureRoot();

    try {
      writeFileSync(
        join(temporaryRoot, "docs", "prototype-pollution-probe.md"),
        `---
title: "Prototype pollution probe"
type: index
status: draft
canon: false
updated: 2026-07-20
__proto__: [polluted]
---

# Prototype pollution probe
`,
        "utf8",
      );

      expect(() => runGenerator(temporaryRoot)).toThrow();
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
