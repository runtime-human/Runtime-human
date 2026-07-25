import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  JanuaryContentProjectionError,
  projectJanuary1990Content,
} from "@runtime-human/game-application";
import { canonicalizeAuthoritative, fingerprint } from "@runtime-human/game-core";
import { createCompiledContentRuntime, type ContentRegistry } from "@runtime-human/game-content";

const CONTENT_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");
const CONTENT_RUNTIME = createCompiledContentRuntime({
  canonicalize: canonicalizeAuthoritative,
  fingerprint,
});

async function loadRegistry(): Promise<ContentRegistry> {
  const manifest = CONTENT_RUNTIME.parseCompiledContentManifest(
    await readFile(join(CONTENT_ROOT, "manifest.json"), "utf8"),
  );
  const chunkIds = CONTENT_RUNTIME.selectJanuary1990ChunkIds(manifest);
  const chunks = await Promise.all(
    chunkIds.map(async (chunkId) =>
      CONTENT_RUNTIME.parseCompiledContentChunk(
        await readFile(join(CONTENT_ROOT, "chunks", ...chunkId.split("/")).concat(".json"), "utf8"),
      ),
    ),
  );
  return CONTENT_RUNTIME.createContentRegistry(manifest, chunks, chunkIds);
}

function overrideEntry(
  registry: ContentRegistry,
  id: string,
  transform: (entry: NonNullable<ReturnType<ContentRegistry["get"]>>) => unknown,
) {
  return {
    contentFingerprint: registry.contentFingerprint,
    get(candidateId: string) {
      const entry = registry.get(candidateId);
      if (candidateId !== id || entry === undefined) return entry;
      return transform(entry);
    },
  };
}

describe("projectJanuary1990Content", () => {
  it("projects the committed registry into the exact immutable January context", async () => {
    const context = projectJanuary1990Content(await loadRegistry());

    expect(context).toEqual({
      schemaVersion: "january-1990-content-context-v1",
      month: "1990-01",
      contentFingerprint: "02518cba1617689d4ada48e4624e6dfc96175c1b363132db38d8e738b819739f",
      requiredChunkIds: ["1990s/ecosystem", "1990s/programming"],
      technology: {
        familyId: "core.tech-family.basic",
        family: "basic",
        technologyId: "core.technology.gw-basic",
        technology: "gw-basic",
        bandId: "core.tech-band.gw-basic-dos-1990",
        tier: "A",
        platformId: "core.platform.dos-pc",
        platform: "dos-pc",
        toolchainId: "core.toolchain.gw-basic-interpreter",
        toolchain: "gw-basic-interpreter",
        ecosystemProfileId: "core.ecosystem-profile.offline-manuals",
        documentationMode: "offline",
      },
      accessRoutes: [
        {
          id: "core.local-tech-availability.home-pc",
          route: "home-pc",
          constraint: "household-availability",
          reasonCode: "january-1990.access.home-pc",
        },
        {
          id: "core.local-tech-availability.shared-school-pc",
          route: "shared-school-pc",
          constraint: "limited-schedule",
          reasonCode: "january-1990.access.shared-school-pc",
        },
      ],
      skills: [
        { id: "core.skill.debugging", skill: "debugging", quality: "correctness" },
        {
          id: "core.skill.problem-decomposition",
          skill: "problem-decomposition",
          quality: "clarity",
        },
        { id: "core.skill.program-reading", skill: "program-reading", quality: "clarity" },
        {
          id: "core.skill.program-writing",
          skill: "program-writing",
          quality: "correctness",
        },
        { id: "core.skill.tool-use", skill: "tool-use", quality: "reliability" },
      ],
      learningActivities: [
        {
          id: "core.activity.first-listing",
          activity: "first-listing",
          practiceMode: "read-and-run",
          skillIds: [
            "core.skill.problem-decomposition",
            "core.skill.program-reading",
            "core.skill.program-writing",
            "core.skill.tool-use",
          ],
          reasonCode: "january-1990.learning.read-and-run",
        },
        {
          id: "core.activity.modify-listing",
          activity: "modify-listing",
          practiceMode: "edit-and-debug",
          skillIds: ["core.skill.debugging"],
          reasonCode: "january-1990.learning.edit-and-debug",
        },
      ],
      project: {
        id: "core.project-archetype.personal-utility",
        archetype: "personal-utility",
        qualities: ["clarity", "correctness", "reliability"],
        workPackages: [
          {
            id: "core.work-package.input-output",
            goal: "input-output",
            quality: "correctness",
            skillIds: [
              "core.skill.problem-decomposition",
              "core.skill.program-writing",
              "core.skill.tool-use",
            ],
            reasonCode: "january-1990.project.input-output",
          },
          {
            id: "core.work-package.validation-fix",
            goal: "validation-fix",
            quality: "reliability",
            skillIds: ["core.skill.debugging"],
            reasonCode: "january-1990.project.validation-fix",
          },
        ],
      },
      situation: {
        id: "core.situation-kernel.first-bug",
        issueType: "first-bug",
        eventIds: ["core.event.logic-error", "core.event.syntax-error"],
      },
      events: [
        {
          id: "core.event.access-window",
          eventType: "access-window",
          reasonCode: "january-1990.event.access-window",
        },
        {
          id: "core.event.logic-error",
          eventType: "logic-error",
          reasonCode: "january-1990.situation.logic-error",
        },
        {
          id: "core.event.manual-found",
          eventType: "manual-found",
          reasonCode: "january-1990.event.manual-found",
        },
        {
          id: "core.event.program-runs",
          eventType: "program-runs",
          reasonCode: "january-1990.outcome.program-runs",
        },
        {
          id: "core.event.syntax-error",
          eventType: "syntax-error",
          reasonCode: "january-1990.situation.syntax-error",
        },
      ],
    });
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.project.workPackages)).toBe(true);
  });

  it.each([
    ["MISSING_CONTENT", (registry: ContentRegistry) => ({
      contentFingerprint: registry.contentFingerprint,
      get: (id: string) => id === "core.skill.debugging" ? undefined : registry.get(id),
    })],
    ["WRONG_KIND", (registry: ContentRegistry) => overrideEntry(
      registry,
      "core.skill.debugging",
      (entry) => ({ ...entry, kind: "event" }),
    )],
    ["WRONG_CONTENT_TYPE", (registry: ContentRegistry) => overrideEntry(
      registry,
      "core.skill.debugging",
      (entry) => ({ ...entry, payload: { ...entry.payload, contentType: "event" } }),
    )],
    ["INVALID_PAYLOAD", (registry: ContentRegistry) => overrideEntry(
      registry,
      "core.skill.debugging",
      (entry) => ({ ...entry, payload: { ...entry.payload, extra: true } }),
    )],
    ["REFERENCE_MISMATCH", (registry: ContentRegistry) => overrideEntry(
      registry,
      "core.skill.debugging",
      (entry) => ({ ...entry, references: ["core.event.program-runs"] }),
    )],
  ] as const)("rejects %s deterministically", async (code, mutate) => {
    const registry = await loadRegistry();

    expect(() => projectJanuary1990Content(mutate(registry))).toThrow(
      expect.objectContaining<Partial<JanuaryContentProjectionError>>({
        code,
        contentId: "core.skill.debugging",
      }),
    );
  });
});
