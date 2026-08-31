#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const VERSION_PATTERN = /^0\.0\.([1-9]\d*)$/u;
const DESKTOP_PACKAGE = "runtime-human-desktop";

const PATHS = Object.freeze({
  canonical: "apps/desktop/src-tauri/tauri.conf.json",
  rootPackage: "package.json",
  desktopPackage: "apps/desktop/package.json",
  cargoPackage: "apps/desktop/src-tauri/Cargo.toml",
  cargoLockPackage: "apps/desktop/src-tauri/Cargo.lock",
});

function readUtf8(root, relativePath) {
  return fs.readFileSync(path.resolve(root, relativePath), "utf8");
}

function readJson(root, relativePath) {
  return JSON.parse(readUtf8(root, relativePath));
}

function findCargoTomlPackage(text) {
  const lines = text.split(/\r?\n/u);
  const start = lines.findIndex((line) => line.trim() === "[package]");
  if (start < 0) throw new Error("Cargo.toml: missing [package] table");
  const endOffset = lines.slice(start + 1).findIndex((line) => /^\s*\[/u.test(line));
  const end = endOffset < 0 ? lines.length : start + 1 + endOffset;
  const block = lines.slice(start + 1, end);
  const nameLines = block.filter((line) => /^\s*name\s*=\s*"[^"]+"\s*$/u.test(line));
  const versionLines = block.filter((line) => /^\s*version\s*=\s*"[^"]+"\s*$/u.test(line));
  if (nameLines.length !== 1 || versionLines.length !== 1) {
    throw new Error("Cargo.toml: [package] must contain exactly one name and version");
  }
  const name = nameLines[0].match(/"([^"]+)"/u)?.[1];
  const version = versionLines[0].match(/"([^"]+)"/u)?.[1];
  if (name !== DESKTOP_PACKAGE) {
    throw new Error(`Cargo.toml: expected package ${DESKTOP_PACKAGE}`);
  }
  return { lines, start: start + 1, end, version };
}

function findCargoLockPackage(text) {
  const lines = text.split(/\r?\n/u);
  const starts = lines
    .map((line, index) => (line.trim() === "[[package]]" ? index : -1))
    .filter((index) => index >= 0);
  const matches = [];
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = starts[index + 1] ?? lines.length;
    const block = lines.slice(start + 1, end);
    const name = block
      .find((line) => /^\s*name\s*=\s*"[^"]+"\s*$/u.test(line))
      ?.match(/"([^"]+)"/u)?.[1];
    if (name !== DESKTOP_PACKAGE) continue;
    const versionLines = block.filter((line) => /^\s*version\s*=\s*"[^"]+"\s*$/u.test(line));
    if (versionLines.length !== 1) {
      throw new Error(`Cargo.lock: ${DESKTOP_PACKAGE} must contain exactly one version`);
    }
    matches.push({
      lines,
      start: start + 1,
      end,
      version: versionLines[0].match(/"([^"]+)"/u)?.[1],
    });
  }
  if (matches.length !== 1) {
    throw new Error(`Cargo.lock: expected exactly one ${DESKTOP_PACKAGE} package entry`);
  }
  return matches[0];
}

function replaceVersionLine(blockInfo, version) {
  const lines = [...blockInfo.lines];
  const indexes = [];
  for (let index = blockInfo.start; index < blockInfo.end; index += 1) {
    if (/^\s*version\s*=\s*"[^"]+"\s*$/u.test(lines[index])) indexes.push(index);
  }
  if (indexes.length !== 1) throw new Error("expected exactly one version line in package block");
  const current = lines[indexes[0]];
  lines[indexes[0]] = current.replace(/"[^"]+"/u, `"${version}"`);
  return lines.join("\n");
}

function replaceJsonVersion(text, version) {
  const value = JSON.parse(text);
  value.version = version;
  return `${JSON.stringify(value, null, 2)}\n`;
}

function buildVersionWrites(root, version) {
  const canonical = readUtf8(root, PATHS.canonical);
  const rootPackage = readUtf8(root, PATHS.rootPackage);
  const desktopPackage = readUtf8(root, PATHS.desktopPackage);
  const cargoPackage = readUtf8(root, PATHS.cargoPackage);
  const cargoLockPackage = readUtf8(root, PATHS.cargoLockPackage);
  return [
    {
      relativePath: PATHS.canonical,
      before: canonical,
      after: replaceJsonVersion(canonical, version),
    },
    {
      relativePath: PATHS.rootPackage,
      before: rootPackage,
      after: replaceJsonVersion(rootPackage, version),
    },
    {
      relativePath: PATHS.desktopPackage,
      before: desktopPackage,
      after: replaceJsonVersion(desktopPackage, version),
    },
    {
      relativePath: PATHS.cargoPackage,
      before: cargoPackage,
      after: replaceVersionLine(findCargoTomlPackage(cargoPackage), version),
    },
    {
      relativePath: PATHS.cargoLockPackage,
      before: cargoLockPackage,
      after: replaceVersionLine(findCargoLockPackage(cargoLockPackage), version),
    },
  ];
}

function applyVersionWrites(root, writes) {
  const attempted = [];
  try {
    for (const write of writes) {
      attempted.push(write);
      fs.writeFileSync(path.resolve(root, write.relativePath), write.after, "utf8");
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const write of attempted.toReversed()) {
      try {
        fs.writeFileSync(path.resolve(root, write.relativePath), write.before, "utf8");
      } catch (rollbackError) {
        rollbackErrors.push(
          `${write.relativePath}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        );
      }
    }
    if (rollbackErrors.length > 0) {
      throw new Error(
        `version bump failed and rollback was incomplete: ${rollbackErrors.join("; ")}`,
        { cause: error },
      );
    }
    throw error;
  }
}

export function readVersionState(root = process.cwd()) {
  const tauri = readJson(root, PATHS.canonical);
  const rootPackage = readJson(root, PATHS.rootPackage);
  const desktopPackage = readJson(root, PATHS.desktopPackage);
  const cargoPackage = findCargoTomlPackage(readUtf8(root, PATHS.cargoPackage));
  const cargoLockPackage = findCargoLockPackage(readUtf8(root, PATHS.cargoLockPackage));
  return {
    canonical: String(tauri.version ?? ""),
    rootPackage: String(rootPackage.version ?? ""),
    desktopPackage: String(desktopPackage.version ?? ""),
    cargoPackage: String(cargoPackage.version ?? ""),
    cargoLockPackage: String(cargoLockPackage.version ?? ""),
  };
}

export function checkVersionState(state) {
  const errors = [];
  const match = VERSION_PATTERN.exec(state.canonical);
  if (!match) {
    errors.push(
      `canonical version must match 0.0.N with N >= 1; got ${JSON.stringify(state.canonical)}`,
    );
  } else if (!Number.isSafeInteger(Number(match[1]))) {
    errors.push(`canonical version component exceeds safe integer range: ${state.canonical}`);
  }
  for (const key of ["rootPackage", "desktopPackage", "cargoPackage", "cargoLockPackage"]) {
    if (state[key] !== state.canonical) {
      errors.push(
        `${PATHS[key]} version ${JSON.stringify(state[key])} != canonical ${state.canonical}`,
      );
    }
  }
  return { ok: errors.length === 0, version: state.canonical, errors };
}

export function nextGameVersion(version) {
  const match = VERSION_PATTERN.exec(version);
  if (!match) throw new Error(`version must match 0.0.N with N >= 1: ${version}`);
  const current = Number(match[1]);
  if (!Number.isSafeInteger(current) || current >= Number.MAX_SAFE_INTEGER) {
    throw new Error(`version component is outside the safe increment range: ${version}`);
  }
  return `0.0.${current + 1}`;
}

export function bumpGameVersion(root = process.cwd(), explicitTarget) {
  const before = readVersionState(root);
  const check = checkVersionState(before);
  if (!check.ok) throw new Error(`current version state is invalid: ${check.errors.join("; ")}`);
  const expected = nextGameVersion(before.canonical);
  if (explicitTarget !== undefined && explicitTarget !== expected) {
    throw new Error(`target must be the immediate next version ${expected}; got ${explicitTarget}`);
  }
  const version = explicitTarget ?? expected;
  const writes = buildVersionWrites(root, version);

  applyVersionWrites(root, writes);
  try {
    const after = checkVersionState(readVersionState(root));
    if (!after.ok) {
      throw new Error(`version bump produced invalid mirrors: ${after.errors.join("; ")}`);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const write of writes.toReversed()) {
      try {
        fs.writeFileSync(path.resolve(root, write.relativePath), write.before, "utf8");
      } catch (rollbackError) {
        rollbackErrors.push(
          `${write.relativePath}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        );
      }
    }
    if (rollbackErrors.length > 0) {
      throw new Error(
        `version bump validation failed and rollback was incomplete: ${rollbackErrors.join("; ")}`,
        { cause: error },
      );
    }
    throw error;
  }
  return { previous: before.canonical, version };
}

function usage() {
  console.error("Usage: node scripts/versioning.mjs <check|bump> [0.0.N]");
}

function runCli(argv) {
  const [command, target, extra] = argv;
  if (command === "check" && target === undefined) {
    const result = checkVersionState(readVersionState());
    if (!result.ok) {
      for (const error of result.errors) console.error(`version: ${error}`);
      return 1;
    }
    console.log(`version OK (${result.version})`);
    return 0;
  }
  if (command === "bump" && extra === undefined) {
    try {
      const result = bumpGameVersion(process.cwd(), target);
      console.log(`${result.previous} -> ${result.version}`);
      return 0;
    } catch (error) {
      console.error(`version: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
  }
  usage();
  return 2;
}

const entryPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryPath === import.meta.url) process.exitCode = runCli(process.argv.slice(2));
