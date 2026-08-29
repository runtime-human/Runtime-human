#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WORKSPACE_PREFIX = "@runtime-human/";
const BUILD_ONLY_OWNERS = new Map([
  ["ajv", new Set(["game-content-compiler"])],
  ["jsonc-parser", new Set(["game-content-compiler"])],
  ["typebox", new Set(["game-authoring-schema"])],
]);

function listPackageDirectories(root) {
  return ["packages", "apps"].flatMap((parent) => {
    const directory = path.join(root, parent);
    if (!fs.existsSync(directory)) return [];
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(directory, entry.name));
  });
}

function dependencyNames(manifest) {
  return [manifest.dependencies, manifest.devDependencies, manifest.peerDependencies]
    .flatMap((group) => Object.keys(group ?? {}))
    .filter((name) => !name.startsWith(WORKSPACE_PREFIX));
}

export function validateBuildOnlyDependencies(root) {
  const diagnostics = [];

  for (const directory of listPackageDirectories(root)) {
    const manifestPath = path.join(directory, "package.json");
    if (!fs.existsSync(manifestPath)) continue;

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const packageName = String(manifest.name ?? path.basename(directory));
    const shortName = packageName.startsWith(WORKSPACE_PREFIX)
      ? packageName.slice(WORKSPACE_PREFIX.length)
      : packageName;

    for (const dependency of dependencyNames(manifest)) {
      const owners = BUILD_ONLY_OWNERS.get(dependency);
      if (owners !== undefined && !owners.has(shortName)) {
        diagnostics.push(
          `${path.relative(root, manifestPath)}: ${shortName} cannot depend on build-only external dependency ${dependency}`,
        );
      }
    }
  }

  return diagnostics.sort((left, right) => left.localeCompare(right, "en"));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const diagnostics = validateBuildOnlyDependencies(process.cwd());
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) console.error(`[build-only-boundaries] ${diagnostic}`);
    console.error(`[build-only-boundaries] FAIL: ${diagnostics.length} violation(s)`);
    process.exit(1);
  }
  console.log("[build-only-boundaries] OK: build-only dependencies are isolated");
}
