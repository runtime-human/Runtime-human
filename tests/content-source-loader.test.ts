import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadContentSourceFiles } from "@runtime-human/game-content-compiler";

const temporaryRoots: string[] = [];

async function createRepositoryFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "runtime-human-content-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("content source discovery", () => {
  it("loads configured JSONC roots in normalized code-point order", async () => {
    const repositoryRoot = await createRepositoryFixture();
    await mkdir(join(repositoryRoot, "content", "1990s", "nested"), { recursive: true });
    await mkdir(join(repositoryRoot, "content", "sources"), { recursive: true });
    await writeFile(join(repositoryRoot, "content", "1990s", "a.jsonc"), '{"id":"a"}\n');
    await writeFile(
      join(repositoryRoot, "content", "1990s", "nested", "β.jsonc"),
      '{"id":"beta"}\n',
    );
    await writeFile(join(repositoryRoot, "content", "1990s", "ignored.txt"), "ignored\n");
    await writeFile(join(repositoryRoot, "content", "sources", "z.jsonc"), '{"id":"z"}\n');

    const files = await loadContentSourceFiles({
      repositoryRoot,
      sourceRoots: ["content/sources", "content/1990s"],
    });

    expect(files).toEqual([
      { path: "content/1990s/a.jsonc", text: '{"id":"a"}\n' },
      { path: "content/1990s/nested/β.jsonc", text: '{"id":"beta"}\n' },
      { path: "content/sources/z.jsonc", text: '{"id":"z"}\n' },
    ]);
  });

  it.each(["../outside", "/absolute", "C:/absolute", "content/../outside", "content//1990s"])(
    "rejects source root %s outside the normalized repository boundary",
    async (sourceRoot) => {
      const repositoryRoot = await createRepositoryFixture();

      await expect(
        loadContentSourceFiles({ repositoryRoot, sourceRoots: [sourceRoot] }),
      ).rejects.toThrow("Content source root must be a normalized relative path");
    },
  );

  it("rejects symbolic links instead of following them", async () => {
    const repositoryRoot = await createRepositoryFixture();
    const target = join(repositoryRoot, "target");
    const sourceRoot = join(repositoryRoot, "content");
    await mkdir(target, { recursive: true });
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(join(target, "linked.jsonc"), "{}\n");
    await symlink(target, join(sourceRoot, "linked"), "junction");

    await expect(
      loadContentSourceFiles({ repositoryRoot, sourceRoots: ["content"] }),
    ).rejects.toThrow("Symbolic links are not allowed in content source roots");
  });

  it("rejects a source root that traverses a linked parent component", async () => {
    const repositoryRoot = await createRepositoryFixture();
    const target = join(repositoryRoot, "target", "nested");
    await mkdir(target, { recursive: true });
    await writeFile(join(target, "entry.jsonc"), "{}\n");
    await symlink(join(repositoryRoot, "target"), join(repositoryRoot, "content"), "junction");

    await expect(
      loadContentSourceFiles({ repositoryRoot, sourceRoots: ["content/nested"] }),
    ).rejects.toThrow("Content source root must not traverse symbolic links");
  });

  it("rejects a missing source root with a semantic error", async () => {
    const repositoryRoot = await createRepositoryFixture();

    await expect(
      loadContentSourceFiles({ repositoryRoot, sourceRoots: ["content/ghost"] }),
    ).rejects.toThrow("Content source root does not exist: content/ghost");
  });

  it("rejects a file source root that is not a directory", async () => {
    const repositoryRoot = await createRepositoryFixture();
    await mkdir(join(repositoryRoot, "content"), { recursive: true });
    await writeFile(join(repositoryRoot, "content", "not-a-directory.jsonc"), "{}\n");

    await expect(
      loadContentSourceFiles({
        repositoryRoot,
        sourceRoots: ["content/not-a-directory.jsonc"],
      }),
    ).rejects.toThrow("Content source root must be a directory");
  });

  it("strips a UTF-8 byte order mark from discovered sources", async () => {
    const repositoryRoot = await createRepositoryFixture();
    await mkdir(join(repositoryRoot, "content"), { recursive: true });
    await writeFile(join(repositoryRoot, "content", "bom.jsonc"), '\uFEFF{"id":"bom"}\n');

    const files = await loadContentSourceFiles({
      repositoryRoot,
      sourceRoots: ["content"],
    });

    expect(files).toEqual([{ path: "content/bom.jsonc", text: '{"id":"bom"}\n' }]);
  });

  it("rejects duplicate files discovered through repeated roots", async () => {
    const repositoryRoot = await createRepositoryFixture();
    await mkdir(join(repositoryRoot, "content"), { recursive: true });
    await writeFile(join(repositoryRoot, "content", "entry.jsonc"), "{}\n");

    await expect(
      loadContentSourceFiles({
        repositoryRoot,
        sourceRoots: ["content", "content"],
      }),
    ).rejects.toThrow("Duplicate content source path content/entry.jsonc");
  });
});
