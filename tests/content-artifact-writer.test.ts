import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  checkContentArtifacts,
  writeContentArtifacts,
} from "@runtime-human/game-content-compiler";
import type { CompiledContentArtifactV1 } from "@runtime-human/game-content";

const temporaryRoots: string[] = [];

async function createOutputFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "runtime-human-artifacts-"));
  temporaryRoots.push(root);
  return join(root, "compiled-content");
}

function artifact(path: string, json: string): CompiledContentArtifactV1 {
  return { path, json };
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("compiled content artifact publication", () => {
  it("writes exact bytes and removes stale output files", async () => {
    const outputRoot = await createOutputFixture();
    await mkdir(outputRoot, { recursive: true });
    await writeFile(join(outputRoot, "stale.json"), "stale\n");

    await writeContentArtifacts({
      outputRoot,
      artifacts: [
        artifact("manifest.json", "{\"manifest\":true}\n"),
        artifact("chunks/1990s/programming.json", "{\"chunk\":true}\n"),
      ],
    });

    await expect(readFile(join(outputRoot, "manifest.json"), "utf8")).resolves.toBe(
      "{\"manifest\":true}\n",
    );
    await expect(
      readFile(join(outputRoot, "chunks", "1990s", "programming.json"), "utf8"),
    ).resolves.toBe("{\"chunk\":true}\n");
    await expect(readFile(join(outputRoot, "stale.json"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("reports missing, changed and unexpected files deterministically", async () => {
    const outputRoot = await createOutputFixture();
    await mkdir(join(outputRoot, "chunks"), { recursive: true });
    await writeFile(join(outputRoot, "chunks", "current.json"), "old\n");
    await writeFile(join(outputRoot, "unexpected.json"), "unexpected\n");

    const result = await checkContentArtifacts({
      outputRoot,
      artifacts: [
        artifact("manifest.json", "manifest\n"),
        artifact("chunks/current.json", "new\n"),
      ],
    });

    expect(result).toEqual({
      current: false,
      differences: [
        "changed:chunks/current.json",
        "missing:manifest.json",
        "unexpected:unexpected.json",
      ],
    });
  });

  it("does not replace existing output when the new artifact set is invalid", async () => {
    const outputRoot = await createOutputFixture();
    await mkdir(outputRoot, { recursive: true });
    await writeFile(join(outputRoot, "existing.json"), "existing\n");

    await expect(
      writeContentArtifacts({
        outputRoot,
        artifacts: [
          artifact("conflict", "file\n"),
          artifact("conflict/child.json", "child\n"),
        ],
      }),
    ).rejects.toThrow("Artifact path conflicts with a parent artifact path");

    await expect(readFile(join(outputRoot, "existing.json"), "utf8")).resolves.toBe("existing\n");
    await expect(readFile(join(outputRoot, "conflict"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it.each(["../manifest.json", "/manifest.json", "C:/manifest.json", "chunks//a.json"])(
    "rejects non-normalized artifact path %s",
    async (path) => {
      const outputRoot = await createOutputFixture();

      await expect(
        writeContentArtifacts({ outputRoot, artifacts: [artifact(path, "{}\n")] }),
      ).rejects.toThrow("Compiled artifact path must be normalized and relative");
    },
  );

  it("reports an absent output directory as missing expected artifacts", async () => {
    const outputRoot = await createOutputFixture();

    await expect(
      checkContentArtifacts({
        outputRoot,
        artifacts: [artifact("manifest.json", "manifest\n")],
      }),
    ).resolves.toEqual({
      current: false,
      differences: ["missing:manifest.json"],
    });
  });
});
