import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  formatContentDiagnostics,
  parseContentBuildConfig,
  runContentBuild,
} from "@runtime-human/game-content-compiler";

const temporaryRoots: string[] = [];

async function createRepositoryFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "runtime-human-content-build-"));
  temporaryRoots.push(root);
  await mkdir(join(root, "content"), { recursive: true });
  return root;
}

function source(payloadTitle = "Entry"): string {
  return `${JSON.stringify(
    {
      schemaVersion: "content-source-v1",
      id: "reference.entry",
      kind: "reference",
      domain: "bootstrap",
      era: "1990s",
      availableFrom: "1990-01",
      entryPoint: true,
      references: [],
      provenance: [{ sourceId: "design.entry", title: "Entry design" }],
      payload: { title: payloadTitle },
    },
    null,
    2,
  )}\n`;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("content build project", () => {
  it("writes compiled artifacts and then reports them current", async () => {
    const repositoryRoot = await createRepositoryFixture();
    await writeFile(join(repositoryRoot, "content", "entry.jsonc"), source());
    const config = {
      sourceRoots: ["content"],
      outputRoot: "generated/content",
    } as const;

    const written = await runContentBuild({ repositoryRoot, config, mode: "write" });
    expect(written).toMatchObject({ kind: "written", artifactCount: 2 });
    await expect(
      readFile(join(repositoryRoot, "generated", "content", "manifest.json"), "utf8"),
    ).resolves.toContain('"schemaVersion":"compiled-content-manifest-v1"');

    await expect(runContentBuild({ repositoryRoot, config, mode: "check" })).resolves.toMatchObject(
      {
        kind: "current",
        artifactCount: 2,
      },
    );
  });

  it("reports deterministic differences without changing generated files", async () => {
    const repositoryRoot = await createRepositoryFixture();
    const sourcePath = join(repositoryRoot, "content", "entry.jsonc");
    const config = {
      sourceRoots: ["content"],
      outputRoot: "generated/content",
    } as const;
    await writeFile(sourcePath, source());
    await runContentBuild({ repositoryRoot, config, mode: "write" });
    const manifestPath = join(repositoryRoot, "generated", "content", "manifest.json");
    const originalManifest = await readFile(manifestPath, "utf8");

    await writeFile(sourcePath, source("Changed"));
    const result = await runContentBuild({ repositoryRoot, config, mode: "check" });

    expect(result).toEqual({
      kind: "outdated",
      differences: ["changed:chunks/1990s/bootstrap.json", "changed:manifest.json"],
    });
    await expect(readFile(manifestPath, "utf8")).resolves.toBe(originalManifest);
  });

  it("returns compiler diagnostics without publishing output", async () => {
    const repositoryRoot = await createRepositoryFixture();
    await writeFile(join(repositoryRoot, "content", "broken.jsonc"), "{ broken");

    const result = await runContentBuild({
      repositoryRoot,
      config: { sourceRoots: ["content"], outputRoot: "generated/content" },
      mode: "write",
    });

    expect(result.kind).toBe("content-invalid");
    if (result.kind !== "content-invalid") throw new Error("Expected invalid content result");
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([{ code: "JSONC_PARSE", path: "content/broken.jsonc" }]),
    );
    await expect(
      readFile(join(repositoryRoot, "generated", "content", "manifest.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects an output root that traverses a linked parent component", async () => {
    const repositoryRoot = await createRepositoryFixture();
    const linkedTarget = join(repositoryRoot, "linked-target");
    await mkdir(linkedTarget, { recursive: true });
    await writeFile(join(repositoryRoot, "content", "entry.jsonc"), source());
    await symlink(linkedTarget, join(repositoryRoot, "generated"), "junction");

    await expect(
      runContentBuild({
        repositoryRoot,
        config: { sourceRoots: ["content"], outputRoot: "generated/content" },
        mode: "write",
      }),
    ).rejects.toThrow("Compiled content output root must not traverse symbolic links");
    await expect(readFile(join(linkedTarget, "content", "manifest.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("parses a closed normalized build config", () => {
    expect(
      parseContentBuildConfig({
        sourceRoots: ["content/1990s", "content/sources"],
        outputRoot: "apps/desktop/public/content",
      }),
    ).toEqual({
      sourceRoots: ["content/1990s", "content/sources"],
      outputRoot: "apps/desktop/public/content",
    });

    expect(() =>
      parseContentBuildConfig({
        sourceRoots: ["content"],
        outputRoot: "../outside",
      }),
    ).toThrow("Content build outputRoot must be a normalized relative path");
    expect(() =>
      parseContentBuildConfig({
        sourceRoots: ["content"],
        outputRoot: "generated",
        extra: true,
      }),
    ).toThrow("Content build config contains unknown property extra");
  });

  it("formats diagnostics in canonical order", () => {
    expect(
      formatContentDiagnostics([
        {
          code: "SCHEMA_INVALID",
          message: "Second",
          path: "content/z.jsonc",
          line: 2,
          column: 3,
        },
        {
          code: "JSONC_PARSE",
          message: "First",
          path: "content/a.jsonc",
          line: 1,
          column: 4,
        },
      ]),
    ).toEqual([
      "content/a.jsonc:1:4 JSONC_PARSE First",
      "content/z.jsonc:2:3 SCHEMA_INVALID Second",
    ]);
  });
});
