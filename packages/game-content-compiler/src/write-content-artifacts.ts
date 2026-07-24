import { randomUUID } from "node:crypto";
import { lstat, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

import type { CompiledContentArtifactV1 } from "@runtime-human/game-content";

import { normalizeSourcePath } from "./parse-content-sources";
import { compareText } from "./content-types";

export type ContentArtifactsOptions = Readonly<{
  outputRoot: string;
  artifacts: readonly CompiledContentArtifactV1[];
}>;

export type ContentArtifactsCheck = Readonly<{
  current: boolean;
  differences: readonly string[];
}>;

export async function writeContentArtifacts(options: ContentArtifactsOptions): Promise<void> {
  const artifacts = prepareArtifacts(options.artifacts);
  const outputRoot = resolve(options.outputRoot);
  const outputParent = dirname(outputRoot);
  const outputName = basename(outputRoot);
  const operationId = randomUUID();
  const stagingRoot = join(outputParent, `.${outputName}.staging-${operationId}`);
  const backupRoot = join(outputParent, `.${outputName}.backup-${operationId}`);

  await mkdir(outputParent, { recursive: true });
  await mkdir(stagingRoot, { recursive: false });

  try {
    await writeStagedArtifacts(stagingRoot, artifacts);
    await replaceOutputDirectory(outputRoot, stagingRoot, backupRoot);
  } catch (error) {
    await rm(stagingRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function checkContentArtifacts(
  options: ContentArtifactsOptions,
): Promise<ContentArtifactsCheck> {
  const artifacts = prepareArtifacts(options.artifacts);
  const expected = new Map(artifacts.map((artifact) => [artifact.path, artifact.json]));
  const actual = await readOutputFiles(resolve(options.outputRoot));
  const differences: string[] = [];

  for (const [path, json] of expected) {
    const existing = actual.get(path);
    if (existing === undefined) {
      differences.push(`missing:${path}`);
    } else if (existing !== json) {
      differences.push(`changed:${path}`);
    }
  }

  for (const path of actual.keys()) {
    if (!expected.has(path)) differences.push(`unexpected:${path}`);
  }

  const sortedDifferences = differences.toSorted(compareText);
  return { current: sortedDifferences.length === 0, differences: sortedDifferences };
}

function prepareArtifacts(
  artifacts: readonly CompiledContentArtifactV1[],
): readonly CompiledContentArtifactV1[] {
  const sorted = artifacts.toSorted((left, right) => compareText(left.path, right.path));
  const seenPaths = new Set<string>();

  for (const artifact of sorted) {
    requireNormalizedArtifactPath(artifact.path);
    if (seenPaths.has(artifact.path)) {
      throw new TypeError(`Duplicate compiled artifact path ${artifact.path}`);
    }

    const segments = artifact.path.split("/");
    let parent = "";
    for (const segment of segments.slice(0, -1)) {
      parent = parent.length === 0 ? segment : `${parent}/${segment}`;
      if (seenPaths.has(parent)) {
        throw new TypeError(
          `Artifact path conflicts with a parent artifact path: ${artifact.path}`,
        );
      }
    }

    seenPaths.add(artifact.path);
  }

  return sorted;
}

function requireNormalizedArtifactPath(path: string): void {
  if (normalizeSourcePath(path) !== path) {
    throw new TypeError(
      `Compiled artifact path must be normalized and relative: ${JSON.stringify(path)}`,
    );
  }
}

async function writeStagedArtifacts(
  stagingRoot: string,
  artifacts: readonly CompiledContentArtifactV1[],
): Promise<void> {
  for (const artifact of artifacts) {
    const absolutePath = join(stagingRoot, ...artifact.path.split("/"));
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, artifact.json, "utf8");
  }
}

async function replaceOutputDirectory(
  outputRoot: string,
  stagingRoot: string,
  backupRoot: string,
): Promise<void> {
  const outputExists = await pathExists(outputRoot);
  if (outputExists) {
    const metadata = await lstat(outputRoot);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new TypeError("Compiled content output root must be a regular directory");
    }
    await rename(outputRoot, backupRoot);
  }

  try {
    await rename(stagingRoot, outputRoot);
  } catch (error) {
    if (outputExists && !(await pathExists(outputRoot)) && (await pathExists(backupRoot))) {
      await rename(backupRoot, outputRoot);
    }
    throw error;
  }

  if (outputExists) {
    await rm(backupRoot, { recursive: true, force: true });
  }
}

async function readOutputFiles(outputRoot: string): Promise<Map<string, string>> {
  if (!(await pathExists(outputRoot))) return new Map();

  const rootMetadata = await lstat(outputRoot);
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory()) {
    throw new TypeError("Compiled content output root must be a regular directory");
  }

  const files = new Map<string, string>();
  const pending = [outputRoot];

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;

    const metadata = await lstat(current);
    if (metadata.isSymbolicLink()) {
      throw new TypeError("Symbolic links are not allowed in compiled content output");
    }

    if (metadata.isDirectory()) {
      const children = (await readdir(current)).toSorted(compareText);
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (child !== undefined) pending.push(join(current, child));
      }
      continue;
    }

    if (!metadata.isFile()) {
      throw new TypeError("Compiled content output contains an unsupported filesystem entry");
    }

    const path = toOutputPath(outputRoot, current);
    files.set(path, await readFile(current, "utf8"));
  }

  return files;
}

function toOutputPath(outputRoot: string, absolutePath: string): string {
  const path = relative(outputRoot, absolutePath).replaceAll("\\", "/");
  requireNormalizedArtifactPath(path);
  return path;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return false;
    throw error;
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Readonly<{ code?: unknown }>).code === code
  );
}
