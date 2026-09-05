#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WORKSPACE_PREFIX = "@runtime-human/";
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const GAME_CORE_DIRECT_XOSHIRO_ALLOWLIST = new Set([
  "packages/game-core/src/determinism/rng-derivation.ts",
  "packages/game-core/src/determinism/xoshiro256ss.ts",
  "packages/game-core/src/index.ts",
  "packages/game-core/src/january-1990/january-month-steps.ts",
]);
const JANUARY_LEGACY_RUNTIME_IDENTIFIER_ALLOWLIST = new Set([
  "packages/game-application/src/index.ts",
  "packages/game-application/src/january-1990/create-january-authority-cutover-runtime.ts",
  "packages/game-application/src/january-1990/create-january-runtime.ts",
  "packages/game-application/src/january-1990/index.ts",
]);

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
  ["game-content-compiler", new Set(["game-schema", "game-core", "game-content"])],
  [
    "game-devtools",
    new Set(["game-authoring-schema", "game-content-compiler", "game-schema", "game-simulation"]),
  ],
  ["game-simulation", new Set(["game-schema", "game-core"])],
  ["game-authoring-schema", new Set([])],
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
  [
    "desktop",
    new Set([
      "game-schema",
      "game-core",
      "game-application",
      "game-content",
      "game-ui",
      "game-ui-fixtures",
    ]),
  ],
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

function shortPackageName(directory, manifest) {
  const packageName = String(manifest.name ?? path.basename(directory));
  return {
    packageName,
    shortName: packageName.startsWith(WORKSPACE_PREFIX)
      ? packageName.slice(WORKSPACE_PREFIX.length)
      : packageName,
  };
}

function declaredDependencyDiagnostic(
  root,
  manifestPath,
  shortName,
  allowed,
  knownPackages,
  dependency,
) {
  if (!knownPackages.has(dependency)) {
    return `${path.relative(root, manifestPath)}: unknown workspace dependency ${WORKSPACE_PREFIX}${dependency}`;
  }
  if (!allowed.has(dependency)) {
    return `${path.relative(root, manifestPath)}: ${shortName} cannot depend on ${dependency}`;
  }
  return null;
}

function validateDeclaredDependencies(
  root,
  manifestPath,
  manifest,
  shortName,
  allowed,
  knownPackages,
) {
  return workspaceDependencies(manifest)
    .map((dependency) =>
      declaredDependencyDiagnostic(
        root,
        manifestPath,
        shortName,
        allowed,
        knownPackages,
        dependency,
      ),
    )
    .filter(Boolean);
}

function workspaceImportDiagnostics(
  root,
  file,
  shortName,
  allowed,
  knownPackages,
  workspaceImport,
) {
  const diagnostics = [];
  if (workspaceImport.deep) {
    diagnostics.push(
      `${path.relative(root, file)}: deep workspace import ${workspaceImport.specifier} is forbidden`,
    );
  }
  if (workspaceImport.dependency === shortName) return diagnostics;
  if (!knownPackages.has(workspaceImport.dependency)) {
    diagnostics.push(
      `${path.relative(root, file)}: unknown workspace import ${WORKSPACE_PREFIX}${workspaceImport.dependency}`,
    );
  } else if (!allowed.has(workspaceImport.dependency)) {
    diagnostics.push(
      `${path.relative(root, file)}: ${shortName} cannot import ${workspaceImport.dependency}`,
    );
  }
  return diagnostics;
}

function validateSourceImports(root, directory, shortName, allowed, knownPackages) {
  return walkSourceFiles(path.join(directory, "src")).flatMap((file) =>
    findWorkspaceImports(file).flatMap((workspaceImport) =>
      workspaceImportDiagnostics(root, file, shortName, allowed, knownPackages, workspaceImport),
    ),
  );
}

function repositoryPath(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function maskCommentsAndStrings(source) {
  const masked = [...source];
  let index = 0;

  function mask(start, end) {
    for (let cursor = start; cursor < end; cursor += 1) {
      if (masked[cursor] !== "\n" && masked[cursor] !== "\r") masked[cursor] = " ";
    }
  }

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];

    if (current === "/" && next === "/") {
      const start = index;
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      mask(start, index);
      continue;
    }

    if (current === "/" && next === "*") {
      const start = index;
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
        index += 1;
      }
      index = Math.min(source.length, index + 2);
      mask(start, index);
      continue;
    }

    if (current === '"' || current === "'" || current === "`") {
      const quote = current;
      const start = index;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
      mask(start, Math.min(index, source.length));
      continue;
    }

    index += 1;
  }

  return masked.join("");
}

function gameCoreRngDiagnostics(root, file) {
  const relativeFile = repositoryPath(root, file);
  const source = maskCommentsAndStrings(fs.readFileSync(file, "utf8"));
  const diagnostics = [];

  if (/\bMath\s*\.\s*random\b/u.test(source)) {
    diagnostics.push(`${relativeFile}: authoritative game-core cannot call Math.random`);
  }
  if (
    /\bXoshiro256StarStar\b/u.test(source) &&
    !GAME_CORE_DIRECT_XOSHIRO_ALLOWLIST.has(relativeFile)
  ) {
    diagnostics.push(`${relativeFile}: authoritative RNG must use the managed derivation API`);
  }

  return diagnostics;
}

function validateGameCoreRngAuthority(root, directory, shortName) {
  if (shortName !== "game-core") return [];
  return walkSourceFiles(path.join(directory, "src")).flatMap((file) =>
    gameCoreRngDiagnostics(root, file),
  );
}

function januaryLegacyRuntimeDiagnostics(root, file) {
  const relativeFile = repositoryPath(root, file);
  if (JANUARY_LEGACY_RUNTIME_IDENTIFIER_ALLOWLIST.has(relativeFile)) return [];

  const source = maskCommentsAndStrings(fs.readFileSync(file, "utf8"));
  if (!/\bcreateJanuary1990Runtime\b/u.test(source)) return [];

  return [
    `${relativeFile}: legacy January runtime is drain-only; use createJanuary1990AuthorityCutoverRuntime for production composition`,
  ];
}

function validateJanuaryLegacyRuntimeContainment(root, directory) {
  return walkSourceFiles(path.join(directory, "src")).flatMap((file) =>
    januaryLegacyRuntimeDiagnostics(root, file),
  );
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
    const { packageName, shortName } = shortPackageName(directory, manifest);
    const allowed = ALLOWED_WORKSPACE_DEPENDENCIES.get(shortName);
    if (!allowed) {
      diagnostics.push(
        `${path.relative(root, manifestPath)}: unknown workspace package ${packageName}`,
      );
      continue;
    }
    diagnostics.push(
      ...validateDeclaredDependencies(
        root,
        manifestPath,
        manifest,
        shortName,
        allowed,
        knownPackages,
      ),
      ...validateSourceImports(root, directory, shortName, allowed, knownPackages),
      ...validateGameCoreRngAuthority(root, directory, shortName),
      ...validateJanuaryLegacyRuntimeContainment(root, directory),
    );
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
