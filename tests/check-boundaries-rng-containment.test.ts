import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { validateWorkspace } from "../scripts/check-boundaries.mjs";

const temporaryRoots: string[] = [];

function createRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-rng-boundaries-"));
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

describe("production RNG authority containment", () => {
  it("rejects the public Xoshiro escape from game-core into game-application", () => {
    const root = createRoot();
    addPackage(root, "packages", "game-core");
    addPackage(
      root,
      "packages",
      "game-application",
      ["game-core"],
      [
        'import { Xoshiro256StarStar } from "@runtime-human/game-core";',
        "export const rogueAuthority = Xoshiro256StarStar.fromSeed(42n);",
      ].join("\n"),
    );

    expect(validateWorkspace(root)).toContainEqual(
      expect.stringContaining("production runtime cannot import raw Xoshiro RNG authority"),
    );
  });

  it("rejects a namespace Xoshiro escape from game-core into desktop", () => {
    const root = createRoot();
    addPackage(root, "packages", "game-core");
    addPackage(
      root,
      "apps",
      "desktop",
      ["game-core"],
      [
        'import * as gameCore from "@runtime-human/game-core";',
        "export const rogueAuthority = gameCore.Xoshiro256StarStar.fromSeed(42n);",
      ].join("\n"),
    );

    expect(validateWorkspace(root)).toContainEqual(
      expect.stringContaining("production runtime cannot import raw Xoshiro RNG authority"),
    );
  });

  it("allows production composition to seed only serialized root RNG state", () => {
    const root = createRoot();
    addPackage(root, "packages", "game-core");
    addPackage(
      root,
      "packages",
      "game-application",
      ["game-core"],
      [
        'import { createRootRngState } from "@runtime-human/game-core";',
        "export const initialRngState = createRootRngState(42n);",
      ].join("\n"),
    );

    expect(validateWorkspace(root)).toEqual([]);
  });

  it("does not classify offline game-simulation RNG construction as production authority", () => {
    const root = createRoot();
    addPackage(root, "packages", "game-core");
    addPackage(
      root,
      "packages",
      "game-simulation",
      ["game-core"],
      [
        'import { Xoshiro256StarStar } from "@runtime-human/game-core";',
        "export const simulationRandom = Xoshiro256StarStar.fromSeed(42n);",
      ].join("\n"),
    );

    expect(validateWorkspace(root)).toEqual([]);
  });
});
