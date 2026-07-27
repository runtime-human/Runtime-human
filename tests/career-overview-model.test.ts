import { describe, expect, it } from "vitest";

import { parseSaveId, parseSaveRevision } from "@runtime-human/game-schema";

import { projectCareerOverviewView } from "../apps/desktop/src/overview/career-overview-model";

describe("Career Overview projection", () => {
  it("projects an idle January session as a new career", () => {
    const saveId = parseSaveId("career-overview-save");

    expect(
      projectCareerOverviewView({
        kind: "idle",
        saveId,
        saveRevision: parseSaveRevision(0),
      }),
    ).toEqual({
      kind: "new-career",
      saveId,
    });
  });
});
