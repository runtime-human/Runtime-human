import { describe, expect, it } from "vitest";

import {
  applyProfessionalExperienceLabV1,
  createProfessionalLabStateV1,
  fingerprint,
  parseProfessionalLabEpisodeV1,
  parseProfessionalLabStateV1,
  PROFESSIONAL_LAB_RULES_V1,
  type ProfessionalLabEpisodeV1,
} from "@runtime-human/game-core";

function episode(
  monthIndex: number,
  context = "project/simple-io",
  overrides: Partial<ProfessionalLabEpisodeV1> = {},
): ProfessionalLabEpisodeV1 {
  return {
    schemaVersion: "professional-lab-episode-v1",
    id: `project:month-${monthIndex}`,
    monthIndex,
    provider: "project",
    skillIds: ["programming", "debugging"],
    technologyId: "gw-basic",
    contextFingerprint: fingerprint("test-professional-context", context),
    challenge: "familiar",
    participation: "independent",
    outcome: "completed",
    feedback: "useful",
    ...overrides,
  };
}

describe("PROG-01B1 professional progression lab", () => {
  it("rewards verified practice through bounded mastery, fluency and technology familiarity", () => {
    const result = applyProfessionalExperienceLabV1(
      createProfessionalLabStateV1(500, 500),
      episode(0),
    );

    expect(result.kind).toBe("applied");
    expect(result.state.skills.map((skill) => skill.skillId)).toEqual([
      "debugging",
      "programming",
    ]);
    expect(result.state.skills[0]).toEqual({
      skillId: "debugging",
      mastery: 58,
      fluency: 48,
      lastPracticedMonth: 0,
    });
    expect(result.state.technology).toEqual({
      technologyId: "gw-basic",
      familiarity: 56,
      lastPracticedMonth: 0,
    });
    expect(result.gradeAwarded).toBe(false);
    expect(result.independentDeliveryObserved).toBe(false);
    expect(Object.isFrozen(result.state.skills)).toBe(true);
    expect(Object.isFrozen(result.state.skills[0])).toBe(true);
    expect(Object.isFrozen(result.deltas)).toBe(true);
    expect(PROFESSIONAL_LAB_RULES_V1.schemaVersion).toBe("professional-lab-rules-v1");
  });

  it("replays exactly once and rejects an alternative outcome for the same month", () => {
    const initial = createProfessionalLabStateV1(500, 500);
    const input = episode(0);
    const applied = applyProfessionalExperienceLabV1(initial, input);
    const before = fingerprint("lab-snapshot", applied.state);
    const replay = applyProfessionalExperienceLabV1(applied.state, input);

    expect(replay.kind).toBe("replayed");
    expect(replay.deltas).toEqual([]);
    expect(replay.familiarityGain).toBe(0);
    expect(fingerprint("lab-snapshot", replay.state)).toBe(before);
    expect(() =>
      applyProfessionalExperienceLabV1(applied.state, {
        ...input,
        participation: "assisted",
      }),
    ).toThrow(/stale or conflicts/u);
    expect(() => applyProfessionalExperienceLabV1(applied.state, episode(0))).not.toThrow();
  });

  it("attenuates repeated contexts while allowing new-context learning", () => {
    const initial = createProfessionalLabStateV1(500, 500);
    const first = applyProfessionalExperienceLabV1(initial, episode(0));
    const repeated = applyProfessionalExperienceLabV1(first.state, episode(1));
    const novel = applyProfessionalExperienceLabV1(
      first.state,
      episode(1, "project/second-io"),
    );

    expect(repeated.repeatedContext).toBe(true);
    expect(novel.repeatedContext).toBe(false);
    expect(repeated.deltas[0]?.masteryGain).toBeLessThan(novel.deltas[0]?.masteryGain ?? 0);
    expect(repeated.familiarityGain).toBeLessThan(novel.familiarityGain);
  });

  it("distinguishes assisted learning and failure learning from independent delivery", () => {
    const assisted = applyProfessionalExperienceLabV1(
      createProfessionalLabStateV1(500, 500),
      episode(0, "guided/first", {
        participation: "assisted",
        outcome: "failed-with-learning",
      }),
    );
    const independent = applyProfessionalExperienceLabV1(
      createProfessionalLabStateV1(500, 500),
      episode(0, "guided/first", {
        challenge: "independent",
      }),
    );

    expect(assisted.state.skills[0]?.mastery).toBeGreaterThan(0);
    expect(assisted.independentDeliveryObserved).toBe(false);
    expect(independent.independentDeliveryObserved).toBe(true);
    expect(assisted.gradeAwarded).toBe(false);
    expect(independent.gradeAwarded).toBe(false);
  });

  it("decays only fluency across long inactivity, never mastery or prior awards", () => {
    const initial = createProfessionalLabStateV1(500, 500);
    const first = applyProfessionalExperienceLabV1(initial, episode(0));
    const later = applyProfessionalExperienceLabV1(
      first.state,
      episode(20, "project/new-context", {
        skillIds: ["problem-solving"],
      }),
    );
    const oldSkill = first.state.skills.find((s) => s.skillId === "programming");
    const retained = later.state.skills.find((s) => s.skillId === "programming");
    expect(retained?.mastery).toBe(oldSkill?.mastery);
    expect(retained?.fluency).toBeLessThan(oldSkill?.fluency ?? 0);
    expect(later.state.skills.some((s) => s.skillId === "problem-solving")).toBe(true);
    expect(later.gradeAwarded).toBe(false);
  });

  it("rejects stale episodes, unsupported skills, invalid context and malformed state", () => {
    const initial = createProfessionalLabStateV1(500, 500);
    const first = applyProfessionalExperienceLabV1(initial, episode(0));
    const second = applyProfessionalExperienceLabV1(first.state, episode(1, "new"));
    expect(() => applyProfessionalExperienceLabV1(second.state, episode(0))).toThrow(/stale/u);
    expect(() =>
      parseProfessionalLabEpisodeV1({
        ...episode(2),
        skillIds: ["programming", "programming"],
      }),
    ).toThrow(/Duplicate/u);
    expect(() =>
      parseProfessionalLabEpisodeV1({
        ...episode(2),
        contextFingerprint: "bad",
      }),
    ).toThrow(/SHA-256/u);
    expect(() =>
      parseProfessionalLabStateV1({ ...initial, grade: "Junior" }),
    ).toThrow(/fields do not match/u);
    expect(() => createProfessionalLabStateV1(500.5, 500)).toThrow(/aptitude/u);
    expect(() =>
      parseProfessionalLabStateV1({
        ...first.state,
        recentContexts: [first.state.recentContexts[0], first.state.recentContexts[0]],
      }),
    ).toThrow(/unique/u);
  });

  it("returns deterministic hashes after JSON round trip and leaves inputs unmodified", () => {
    const initial = createProfessionalLabStateV1(250, 700);
    const input = episode(0, "project/new-routine");
    const a = applyProfessionalExperienceLabV1(initial, input);
    const b = applyProfessionalExperienceLabV1(
      parseProfessionalLabStateV1(JSON.parse(JSON.stringify(initial)) as unknown),
      parseProfessionalLabEpisodeV1(JSON.parse(JSON.stringify(input)) as unknown),
    );

    expect(fingerprint("lab-result", a)).toEqual(fingerprint("lab-result", b));
    expect(initial.skills).toHaveLength(0);
    expect(a.state.skills).toHaveLength(2);
    expect(Object.isFrozen(a.state.aptitudes)).toBe(true);
    expect(Object.isFrozen(a.state.recentContexts)).toBe(true);
  });
});
