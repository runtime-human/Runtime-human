import { describe, expect, it } from "vitest";

import {
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_REASON_CODES,
  JANUARY_1990_REQUIRED_CHUNK_IDS,
  JANUARY_1990_STABLE_IDS,
} from "@runtime-human/game-core";

const EXPECTED_STABLE_IDS = [
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
] as const;

const EXPECTED_REASON_CODES = [
  "january-1990.access.home-pc",
  "january-1990.access.shared-school-pc",
  "january-1990.event.access-window",
  "january-1990.event.manual-found",
  "january-1990.learning.edit-and-debug",
  "january-1990.learning.read-and-run",
  "january-1990.outcome.program-runs",
  "january-1990.project.input-output",
  "january-1990.project.validation-fix",
  "january-1990.situation.logic-error",
  "january-1990.situation.syntax-error",
] as const;

describe("January 1990 core contracts", () => {
  it("publishes the exact closed content and chunk IDs", () => {
    expect(JANUARY_1990_REQUIRED_CHUNK_IDS).toEqual([
      "1990s/ecosystem",
      "1990s/programming",
    ]);
    expect(JANUARY_1990_STABLE_IDS).toEqual(EXPECTED_STABLE_IDS);
    expect(Object.values(JANUARY_1990_CONTENT_IDS).toSorted()).toEqual(
      EXPECTED_STABLE_IDS,
    );
  });

  it("publishes closed stable reason codes", () => {
    expect(Object.values(JANUARY_1990_REASON_CODES).toSorted()).toEqual(
      EXPECTED_REASON_CODES,
    );
  });

  it("freezes public constant collections", () => {
    expect(Object.isFrozen(JANUARY_1990_REQUIRED_CHUNK_IDS)).toBe(true);
    expect(Object.isFrozen(JANUARY_1990_STABLE_IDS)).toBe(true);
    expect(Object.isFrozen(JANUARY_1990_CONTENT_IDS)).toBe(true);
    expect(Object.isFrozen(JANUARY_1990_REASON_CODES)).toBe(true);
  });
});
