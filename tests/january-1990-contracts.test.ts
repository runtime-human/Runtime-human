import { describe, expect, it } from "vitest";

import {
  JANUARY_1990_ALL_CONTENT_IDS,
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_REASON_CODES,
  JANUARY_1990_REQUIRED_CHUNK_IDS,
} from "@runtime-human/game-core";

describe("January 1990 core contracts", () => {
  it("fixes the exact compiled-content and chunk identifiers", () => {
    expect(JANUARY_1990_REQUIRED_CHUNK_IDS).toEqual([
      "1990s/ecosystem",
      "1990s/programming",
    ]);
    expect(JANUARY_1990_ALL_CONTENT_IDS).toEqual([
      "core.activity.first-listing",
      "core.activity.modify-listing",
      "core.ecosystem-profile.offline-manuals",
      "core.event.access-window",
      "core.event.logic-error",
      "core.event.manual-found",
      "core.event.program-runs",
      "core.event.syntax-error",
      "core.local-tech-availability.home-pc",
      "core.local-tech-availability.shared-school-pc",
      "core.platform.dos-pc",
      "core.project-archetype.personal-utility",
      "core.situation-kernel.first-bug",
      "core.skill.debugging",
      "core.skill.problem-decomposition",
      "core.skill.program-reading",
      "core.skill.program-writing",
      "core.skill.tool-use",
      "core.tech-band.gw-basic-dos-1990",
      "core.tech-family.basic",
      "core.technology.gw-basic",
      "core.toolchain.gw-basic-interpreter",
      "core.work-package.input-output",
      "core.work-package.validation-fix",
    ]);
    expect(new Set(Object.values(JANUARY_1990_CONTENT_IDS)).size).toBe(24);
  });

  it("keeps identifiers and reason codes immutable", () => {
    expect(Object.isFrozen(JANUARY_1990_REQUIRED_CHUNK_IDS)).toBe(true);
    expect(Object.isFrozen(JANUARY_1990_CONTENT_IDS)).toBe(true);
    expect(Object.isFrozen(JANUARY_1990_ALL_CONTENT_IDS)).toBe(true);
    expect(Object.isFrozen(JANUARY_1990_REASON_CODES)).toBe(true);
  });
});
