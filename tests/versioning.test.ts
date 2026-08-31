import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bumpGameVersion,
  checkVersionState,
  nextGameVersion,
  readVersionState,
} from "../scripts/versioning.mjs";

const tempRoots: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop()!, { recursive: true, force: true });
  }
});

function writeFixture(version = "0.0.1") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-version-"));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, "apps", "desktop", "src-tauri"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({ name: "runtime-human", version }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(root, "apps", "desktop", "package.json"),
    `${JSON.stringify({ name: "@runtime-human/desktop", version }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(root, "apps", "desktop", "src-tauri", "tauri.conf.json"),
    `${JSON.stringify({ productName: "Runtime Human", version }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(root, "apps", "desktop", "src-tauri", "Cargo.toml"),
    `[package]\nname = "runtime-human-desktop"\nversion = "${version}"\nedition = "2024"\n`,
  );
  fs.writeFileSync(
    path.join(root, "apps", "desktop", "src-tauri", "Cargo.lock"),
    `version = 4\n\n[[package]]\nname = "dependency"\nversion = "1.2.3"\n\n[[package]]\nname = "runtime-human-desktop"\nversion = "${version}"\ndependencies = []\n`,
  );
  return root;
}

describe("Runtime Human game version contract", () => {
  it("accepts synchronized 0.0.N mirrors and treats Tauri config as canonical", () => {
    const state = readVersionState(writeFixture("0.0.1"));
    expect(state.canonical).toBe("0.0.1");
    expect(checkVersionState(state)).toEqual({ ok: true, version: "0.0.1", errors: [] });
  });

  it("rejects mirror drift and unsupported version syntax", () => {
    const driftRoot = writeFixture("0.0.1");
    const rootPackagePath = path.join(driftRoot, "package.json");
    const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, "utf8")) as {
      name: string;
      version: string;
    };
    rootPackage.version = "0.0.2";
    fs.writeFileSync(rootPackagePath, `${JSON.stringify(rootPackage, null, 2)}\n`);
    const drift = checkVersionState(readVersionState(driftRoot));
    expect(drift.ok).toBe(false);
    expect(drift.errors.join("\n")).toContain("package.json");

    const invalid = checkVersionState(readVersionState(writeFixture("0.1.0")));
    expect(invalid.ok).toBe(false);
    expect(invalid.errors.join("\n")).toContain("0.0.N");
  });

  it("increments only the third component by exactly one", () => {
    expect(nextGameVersion("0.0.1")).toBe("0.0.2");
    expect(nextGameVersion("0.0.9")).toBe("0.0.10");
    expect(() => nextGameVersion("0.1.0")).toThrow(/0\.0\.N/u);
  });

  it("updates every mirror and refuses a skipped explicit target", () => {
    const root = writeFixture("0.0.9");
    expect(() => bumpGameVersion(root, "0.0.11")).toThrow(/immediate next version/u);

    const bumped = bumpGameVersion(root, "0.0.10");
    expect(bumped).toEqual({ previous: "0.0.9", version: "0.0.10" });
    const state = readVersionState(root);
    expect(checkVersionState(state).ok).toBe(true);
    expect(state).toMatchObject({
      canonical: "0.0.10",
      rootPackage: "0.0.10",
      desktopPackage: "0.0.10",
      cargoPackage: "0.0.10",
      cargoLockPackage: "0.0.10",
    });
  });

  it("restores every mirror when a write fails mid-bump", () => {
    const root = writeFixture("0.0.9");
    const before = readVersionState(root);
    const originalWrite = fs.writeFileSync.bind(fs);
    let writes = 0;
    vi.spyOn(fs, "writeFileSync").mockImplementation(
      ((...args: Parameters<typeof fs.writeFileSync>) => {
        writes += 1;
        if (writes === 3) throw new Error("simulated write failure");
        return originalWrite(...args);
      }) as typeof fs.writeFileSync,
    );

    expect(() => bumpGameVersion(root, "0.0.10")).toThrow(/simulated write failure/u);
    vi.restoreAllMocks();
    expect(readVersionState(root)).toEqual(before);
  });
});
