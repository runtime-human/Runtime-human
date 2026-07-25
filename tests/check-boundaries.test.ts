import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { validateWorkspace } from "../scripts/check-boundaries.mjs";

const temporaryRoots: string[] = [];

function createRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-boundaries-"));
  temporaryRoots.push(root);
  return root;
}

function addPackage(
  root: string,
  location: "apps" | "packages",
  shortName: string,
  dependencies: readonly string[] = [],
  source = "export {};\n",
): void {
  const directory = path.join(root, location, shortName);
  fs.mkdirSync(path.join(directory, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(directory, "package.json"),
    `${JSON.stringify(
      {
        name: `@runtime-human/${shortName}`,
        private: true,
        dependencies: Object.fromEntries(
          dependencies.map((dependency) => [`@runtime-human/${dependency}`, "workspace:*"]),
        ),
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(path.join(directory, "src", "index.ts"), source);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("validateWorkspace", () => {
  it("accepts the approved Foundation dependency graph", () => {
    const root = createRoot();
    addPackage(root, "packages", "shared-kernel");
    addPackage(root, "packages", "game-schema", ["shared-kernel"]);
    addPackage(root, "packages", "game-core", ["shared-kernel", "game-schema"]);
    addPackage(root, "packages", "game-content", ["shared-kernel", "game-schema"]);
    addPackage(root, "packages", "game-content-compiler", [
      "game-schema",
      "game-core",
      "game-content",
    ]);
    addPackage(root, "packages", "game-persistence-contracts", ["shared-kernel", "game-schema"]);
    addPackage(root, "packages", "game-platform-contracts", ["shared-kernel", "game-schema"]);
    addPackage(root, "packages", "game-application", [
      "shared-kernel",
      "game-schema",
      "game-core",
      "game-persistence-contracts",
      "game-platform-contracts",
    ]);
    addPackage(root, "packages", "game-ui", ["game-application"]);
    addPackage(root, "packages", "game-ui-fixtures", [
      "game-schema",
      "game-application",
      "game-persistence-contracts",
      "game-platform-contracts",
      "game-ui",
    ]);
    addPackage(root, "apps", "desktop", [
      "game-schema",
      "game-core",
      "game-application",
      "game-content",
      "game-ui",
      "game-ui-fixtures",
    ]);

    expect(validateWorkspace(root)).toEqual([]);
  });

  it("accepts only the approved desktop composition-root imports", () => {
    const root = createRoot();
    addPackage(root, "packages", "shared-kernel");
    addPackage(root, "packages", "game-schema", ["shared-kernel"]);
    addPackage(root, "packages", "game-core", ["shared-kernel", "game-schema"]);
    addPackage(root, "packages", "game-content", ["shared-kernel", "game-schema"]);
    addPackage(root, "packages", "game-application", ["game-schema", "game-core"]);
    addPackage(root, "packages", "game-ui", ["game-application"]);
    addPackage(root, "packages", "game-ui-fixtures", ["game-ui"]);
    addPackage(
      root,
      "apps",
      "desktop",
      ["game-schema", "game-core", "game-application", "game-content", "game-ui"],
      [
        'import "@runtime-human/game-schema";',
        'import "@runtime-human/game-core";',
        'import "@runtime-human/game-application";',
        'import "@runtime-human/game-content";',
        'import "@runtime-human/game-ui";',
      ].join("\n"),
    );

    expect(validateWorkspace(root)).toEqual([]);
  });

  it("rejects game-core depending on game-content", () => {
    const root = createRoot();
    addPackage(root, "packages", "game-content");
    addPackage(root, "packages", "game-core", ["game-content"]);

    expect(validateWorkspace(root)).toContainEqual(
      expect.stringContaining("game-core cannot depend on game-content"),
    );
  });

  it("rejects game-ui depending on game-core", () => {
    const root = createRoot();
    addPackage(root, "packages", "game-core");
    addPackage(root, "packages", "game-ui", ["game-core"]);

    expect(validateWorkspace(root)).toContainEqual(
      expect.stringContaining("game-ui cannot depend on game-core"),
    );
  });

  it("rejects source imports that bypass the declared dependency graph", () => {
    const root = createRoot();
    addPackage(root, "packages", "game-core");
    addPackage(root, "packages", "game-ui", [], 'import "@runtime-human/game-core";\n');

    expect(validateWorkspace(root)).toContainEqual(
      expect.stringContaining("game-ui cannot import game-core"),
    );
  });

  it("rejects deep workspace imports", () => {
    const root = createRoot();
    addPackage(root, "packages", "game-ui");
    addPackage(
      root,
      "packages",
      "game-ui-fixtures",
      ["game-ui"],
      'export { FoundationStatus } from "@runtime-human/game-ui/src/foundation-status";\n',
    );

    expect(validateWorkspace(root)).toContainEqual(
      expect.stringContaining("deep workspace import @runtime-human/game-ui/src/foundation-status"),
    );
  });
});
