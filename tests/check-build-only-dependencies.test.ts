import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateBuildOnlyDependencies } from "../scripts/check-build-only-dependencies.mjs";

const temporaryRoots: string[] = [];

function createRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-build-only-"));
  temporaryRoots.push(root);
  return root;
}

function addPackage(
  root: string,
  shortName: string,
  dependencies: Readonly<Record<string, string>>,
): void {
  const directory = path.join(root, "packages", shortName);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "package.json"),
    `${JSON.stringify(
      {
        name: `@runtime-human/${shortName}`,
        private: true,
        dependencies,
      },
      null,
      2,
    )}\n`,
  );
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("validateBuildOnlyDependencies", () => {
  it("allows Ajv and jsonc-parser only in the compiler package", () => {
    const root = createRoot();
    addPackage(root, "game-content-compiler", {
      ajv: "8.20.0",
      "jsonc-parser": "3.3.1",
    });

    expect(validateBuildOnlyDependencies(root)).toEqual([]);
  });

  it("rejects Ajv in a runtime content package", () => {
    const root = createRoot();
    addPackage(root, "game-content", { ajv: "8.20.0" });

    expect(validateBuildOnlyDependencies(root)).toContainEqual(
      expect.stringContaining("game-content cannot depend on build-only external dependency ajv"),
    );
  });

  it("rejects jsonc-parser in a renderer package", () => {
    const root = createRoot();
    addPackage(root, "desktop", { "jsonc-parser": "3.3.1" });

    expect(validateBuildOnlyDependencies(root)).toContainEqual(
      expect.stringContaining(
        "desktop cannot depend on build-only external dependency jsonc-parser",
      ),
    );
  });
});
