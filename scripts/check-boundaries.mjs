#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WORKSPACE_PREFIX = "@runtime-human/";
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);

const ALLOWED_WORKSPACE_DEPENDENCIES = new Map([
  ["shared-kernel", new Set()],
  ["game-schema", new Set(["shared-kernel"])],
  ["game-core", new Set(["shared-kernel", "game-schema"])],
  [
    "game-application",
    new Set([
      "shared-kernel",
      "game-schema",
      "game-core",
      "game-persistence-contracts",
      "game-platform-contracts",
    ]),
  ],
  ["game-content", new Set(["shared-kernel", "game-schema"])],
  ["game-persistence-contracts", new Set(["shared-kernel", "game-schema"])],
  ["game-platform-contracts", new Set(["shared-kernel", "game-schema"])],
  ["game-ui", new Set(["game-application"])],
  [
    "game-ui-fixtures",
    new Set([
      "game-schema",
      "game-application",
      "game-persistence-contracts",
      "game-platform-contracts",
      "game-ui",
    ]),
  ],
  ["desktop", new Set(["game-ui", "game-ui-fixtures"])],
]);

function listDirectories(root, relativeParent) {
  const parent = path.join(root, relativeParent);
  if (!fs.existsSync(parent)) return [];
  return fs
    .readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(parent, entry.name))
    .sort((left, right) => left.localeCompare(right, "en"));
}

function readManifest(directory) {
  const manifestPath = path.join(directory, "package.json");
  if (!fs.existsSync(manifestPath)) return null;
  return {
    directory,
    manifestPath,
    manifest: JSON.parse(fs.readFileSync(manifestPath, "utf8")),
  };
}

function workspaceDependencies(manifest) {
  const groups = [manifest.dependencies, manifest.devDependencies, manifest.peerDependencies];
  return groups
    .flatMap((group) => Object.keys(group ?? {}))
    .filter((name) => name.startsWith(WORKSPACE_PREFIX))
    .map((name) => name.slice(WORKSPACE_PREFIX.length))
    .sort((left, right) => left.localeCompare(right, "en"));
}

function walkSourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walkSourceFiles(fullPath);
      return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : [];
    })
    .sort((left, right) => left.localeCompare(right, "en"));
}

function findWorkspaceImports(file) {
  const source = fs.readFileSync(file, "utf8");
  const imports = [];
  const pattern = /["'](@runtime-human\/([^/"']+)(\/[^"']+)?)['"]/g;
  for (const match of source.matchAll(pattern)) {
    if (match[1] && match[2]) {
      imports.push({
        specifier: match[1],
        dependency: match[2],
        deep: Boolean(match[3]),
      });
    }
  }
  return imports;
}

export function validateWorkspace(root) {
  const diagnostics = [];
  const packageDirectories = [
    ...listDirectories(root, "packages"),
    ...listDirectories(root, "apps"),
  ];
  const packages = packageDirectories.map(readManifest).filter(Boolean);
  const knownPackages = new Set(
    packages
      .map(({ manifest }) => manifest.name)
      .filter((name) => typeof name === "string" && name.startsWith(WORKSPACE_PREFIX))
      .map((name) => name.slice(WORKSPACE_PREFIX.length)),
  );

  for (const { directory, manifestPath, manifest } of packages) {
    const packageName = String(manifest.name ?? path.basename(directory));
    const shortName = packageName.startsWith(WORKSPACE_PREFIX)
      ? packageName.slice(WORKSPACE_PREFIX.length)
      : packageName;
    const allowed = ALLOWED_WORKSPACE_DEPENDENCIES.get(shortName);

    if (!allowed) {
      diagnostics.push(
        `${path.relative(root, manifestPath)}: unknown workspace package ${packageName}`,
      );
      continue;
    }

    for (const dependency of workspaceDependencies(manifest)) {
      if (!knownPackages.has(dependency)) {
        diagnostics.push(
          `${path.relative(root, manifestPath)}: unknown workspace dependency ${WORKSPACE_PREFIX}${dependency}`,
        );
      } else if (!allowed.has(dependency)) {
        diagnostics.push(
          `${path.relative(root, manifestPath)}: ${shortName} cannot depend on ${dependency}`,
        );
      }
    }

    for (const file of walkSourceFiles(path.join(directory, "src"))) {
      for (const workspaceImport of findWorkspaceImports(file)) {
        if (workspaceImport.deep) {
          diagnostics.push(
            `${path.relative(root, file)}: deep workspace import ${workspaceImport.specifier} is forbidden`,
          );
        }
        if (workspaceImport.dependency === shortName) continue;
        if (!knownPackages.has(workspaceImport.dependency)) {
          diagnostics.push(
            `${path.relative(root, file)}: unknown workspace import ${WORKSPACE_PREFIX}${workspaceImport.dependency}`,
          );
        } else if (!allowed.has(workspaceImport.dependency)) {
          diagnostics.push(
            `${path.relative(root, file)}: ${shortName} cannot import ${workspaceImport.dependency}`,
          );
        }
      }
    }
  }

  return diagnostics.sort((left, right) => left.localeCompare(right, "en"));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const diagnostics = validateWorkspace(process.cwd());
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) console.error(`[boundaries] ${diagnostic}`);
    console.error(`[boundaries] FAIL: ${diagnostics.length} violation(s)`);
    process.exit(1);
  }
  console.log("[boundaries] OK: workspace dependency graph is valid");
}
