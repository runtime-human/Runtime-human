import { describe, expect, it } from "vitest";

import {
  applyProfessionalExperienceLabV1,
  createProfessionalLabStateV1,
  fingerprint,
  parseProfessionalLabEpisodeV1,
  parseProfessionalLabStateV1,
  PROFESSIONAL_LAB_RULES_V1,
  projectProfessionalLabFluencyV1,
  type ProfessionalLabEpisodeV1,
  type ProfessionalLabSkillIdV1,
  type ProfessionalLabStateV1,
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

const touch = (skillId: ProfessionalLabSkillIdV1) => ({ skillIds: [skillId] });
const skillOf = (state: ProfessionalLabStateV1, skillId: ProfessionalLabSkillIdV1) =>
  state.skills.find((entry) => entry.skillId === skillId);

describe("PROG-01B1 professional progression lab", () => {
  it("rewards verified practice with bounded skills and technology familiarity", () => {
    const result = applyProfessionalExperienceLabV1(
      createProfessionalLabStateV1(500, 500),
      episode(0),
    );

    expect(result.kind).toBe("applied");
    expect(result.state.skills.map((skill) => skill.skillId)).toEqual(["debugging", "programming"]);
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
    const novel = applyProfessionalExperienceLabV1(first.state, episode(1, "project/second-io"));

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
    // Stored fluency is untouched; decay is evaluated on read/projection.
    expect(retained).toEqual(oldSkill);
    expect(
      projectProfessionalLabFluencyV1(retained ?? { fluency: 0, lastPracticedMonth: 0 }, 21),
    ).toBeLessThan(oldSkill?.fluency ?? 0);
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
    expect(() => parseProfessionalLabStateV1({ ...initial, grade: "Junior" })).toThrow(
      /fields do not match/u,
    );
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

  describe("fluency decay is applied once and never compounded", () => {
    const initial = createProfessionalLabStateV1(500, 500);

    it("keeps stored fluency and last practice of untouched skills unchanged", () => {
      const first = applyProfessionalExperienceLabV1(initial, episode(0));
      const second = applyProfessionalExperienceLabV1(
        first.state,
        episode(5, "ctx/a", touch("problem-solving")),
      );
      const third = applyProfessionalExperienceLabV1(
        second.state,
        episode(6, "ctx/b", touch("testing-quality")),
      );
      for (const state of [second.state, third.state]) {
        expect(skillOf(state, "programming")).toEqual(skillOf(first.state, "programming"));
        expect(skillOf(state, "debugging")).toEqual(skillOf(first.state, "debugging"));
      }
    });

    it("staged episodes 0,5,6 equal the direct 0,6 path for an untouched skill", () => {
      const first = applyProfessionalExperienceLabV1(initial, episode(0));
      const staged = applyProfessionalExperienceLabV1(
        applyProfessionalExperienceLabV1(first.state, episode(5, "ctx/a", touch("problem-solving")))
          .state,
        episode(6, "ctx/b", touch("testing-quality")),
      );
      const direct = applyProfessionalExperienceLabV1(
        first.state,
        episode(6, "ctx/b", touch("testing-quality")),
      );
      expect(skillOf(staged.state, "programming")).toEqual(skillOf(direct.state, "programming"));

      // Practising the skill later yields identical fluency along either path.
      const practise = (state: ProfessionalLabStateV1) =>
        applyProfessionalExperienceLabV1(state, episode(7, "ctx/c", touch("programming"))).state;
      expect(skillOf(practise(staged.state), "programming")).toEqual(
        skillOf(practise(direct.state), "programming"),
      );
    });

    it("projects decay as a pure function that composes across stages", () => {
      const skillRecord = { fluency: 48, lastPracticedMonth: 0 };
      const { fluencyGraceMonths, fluencyDecayPerMonth } = PROFESSIONAL_LAB_RULES_V1;
      expect(projectProfessionalLabFluencyV1(skillRecord, 1 + fluencyGraceMonths)).toBe(48);
      expect(projectProfessionalLabFluencyV1(skillRecord, 2 + fluencyGraceMonths)).toBe(
        48 - fluencyDecayPerMonth,
      );
      expect(projectProfessionalLabFluencyV1(skillRecord, 12_000)).toBe(0);
      for (let month = 0; month <= 40; month += 1) {
        const direct = projectProfessionalLabFluencyV1(skillRecord, month);
        expect(direct).toBeGreaterThanOrEqual(0);
        expect(direct).toBeLessThanOrEqual(projectProfessionalLabFluencyV1(skillRecord, month - 1));
      }
    });

    it("decays linearly with the gap after the grace window when finally practised", () => {
      const first = applyProfessionalExperienceLabV1(initial, episode(0));
      const stored = skillOf(first.state, "programming")?.fluency ?? 0;
      const { fluencyGraceMonths, fluencyDecayPerMonth } = PROFESSIONAL_LAB_RULES_V1;
      // gap months at 7 = 6 idle months, 3 of them beyond grace.
      const later = applyProfessionalExperienceLabV1(
        first.state,
        episode(1 + fluencyGraceMonths + 3, "ctx/a", touch("programming")),
      );
      const decayed = stored - 3 * fluencyDecayPerMonth;
      const gain = later.deltas[0]?.fluencyGain ?? 0;
      expect(skillOf(later.state, "programming")?.fluency).toBe(decayed + gain);
    });
  });

  it("never lets assisted help beat independent practice", () => {
    const initial = createProfessionalLabStateV1(500, 500);
    for (const outcome of ["completed", "partial", "failed-with-learning", "recovered"] as const) {
      for (const challenge of ["guided", "familiar", "independent", "complex"] as const) {
        const independent = applyProfessionalExperienceLabV1(
          initial,
          episode(0, "ctx/x", { outcome, challenge, participation: "independent" }),
        );
        const assisted = applyProfessionalExperienceLabV1(
          initial,
          episode(0, "ctx/x", { outcome, challenge, participation: "assisted" }),
        );
        for (const [index, delta] of assisted.deltas.entries()) {
          expect(delta.fluencyGain).toBeLessThanOrEqual(
            independent.deltas[index]?.fluencyGain ?? 0,
          );
          expect(delta.masteryGain).toBe(independent.deltas[index]?.masteryGain);
        }
        expect(assisted.independentDeliveryObserved).toBe(false);
      }
    }
    expect(PROFESSIONAL_LAB_RULES_V1.participationBps.assisted).toBeLessThanOrEqual(
      PROFESSIONAL_LAB_RULES_V1.participationBps.independent,
    );
    const strict = applyProfessionalExperienceLabV1(
      initial,
      episode(0, "ctx/x", { participation: "assisted" }),
    );
    expect(strict.deltas[0]?.fluencyGain).toBeLessThan(PROFESSIONAL_LAB_RULES_V1.baseFluency);
  });

  it("does not report a replay as an attenuated repeat", () => {
    const applied = applyProfessionalExperienceLabV1(
      createProfessionalLabStateV1(500, 500),
      episode(0),
    );
    expect(applied.repeatedContext).toBe(false);
    const replay = applyProfessionalExperienceLabV1(applied.state, episode(0));
    expect(replay.kind).toBe("replayed");
    expect(replay.repeatedContext).toBe(false);
    const repeatedApplied = applyProfessionalExperienceLabV1(applied.state, episode(1));
    expect(repeatedApplied.repeatedContext).toBe(true);
    const repeatedReplay = applyProfessionalExperienceLabV1(repeatedApplied.state, episode(1));
    expect(repeatedReplay.repeatedContext).toBe(false);
  });

  describe("invariants", () => {
    const initial = createProfessionalLabStateV1(500, 500);

    it("caps mastery, fluency and familiarity at the maximum without overflow", () => {
      const context = fingerprint("test-professional-context", "cap");
      const nearCap = parseProfessionalLabStateV1({
        schemaVersion: "professional-lab-state-v1",
        aptitudes: { reasoning: 1_000, learning: 1_000 },
        skills: [{ skillId: "programming", mastery: 9_999, fluency: 9_990, lastPracticedMonth: 0 }],
        technology: { technologyId: "gw-basic", familiarity: 9_995, lastPracticedMonth: 0 },
        recentContexts: [context],
        lastEpisode: { id: "project:month-0", hash: "0".repeat(64), monthIndex: 0 },
      });
      const result = applyProfessionalExperienceLabV1(
        nearCap,
        episode(1, "cap/new", {
          skillIds: ["programming"],
          challenge: "complex",
          feedback: "thorough",
        }),
      );
      const capped = result.state.skills[0];
      expect(capped?.mastery).toBe(PROFESSIONAL_LAB_RULES_V1.maximumPoints);
      expect(capped?.fluency).toBeLessThanOrEqual(PROFESSIONAL_LAB_RULES_V1.maximumPoints);
      expect(result.deltas[0]?.masteryGain).toBe(1);
      expect(result.state.technology?.familiarity).toBe(PROFESSIONAL_LAB_RULES_V1.maximumPoints);
      expect(result.familiarityGain).toBe(5);
      const again = applyProfessionalExperienceLabV1(
        result.state,
        episode(2, "cap/newer", { skillIds: ["programming"] }),
      );
      expect(again.deltas[0]?.masteryGain).toBe(0);
      expect(again.state.skills[0]?.mastery).toBe(PROFESSIONAL_LAB_RULES_V1.maximumPoints);
    });

    it("bounds recent contexts to the window and evicts oldest first", () => {
      const window = PROFESSIONAL_LAB_RULES_V1.maximumRecentContexts;
      const hashes = Array.from({ length: window + 2 }, (_, i) =>
        fingerprint("test-professional-context", `window/${i}`),
      );
      let state = initial;
      for (let i = 0; i < hashes.length; i += 1) {
        state = applyProfessionalExperienceLabV1(state, {
          ...episode(i),
          contextFingerprint: hashes[i] ?? "",
        }).state;
      }
      expect(state.recentContexts).toEqual(hashes.slice(-window));
      // The evicted context is novel again; a retained one is a repeat and moves to the end.
      const evicted = applyProfessionalExperienceLabV1(state, {
        ...episode(window + 2),
        contextFingerprint: hashes[0] ?? "",
      });
      expect(evicted.repeatedContext).toBe(false);
      expect(evicted.state.recentContexts).toHaveLength(window);
      expect(evicted.state.recentContexts.at(-1)).toBe(hashes[0]);
      expect(evicted.state.recentContexts).not.toContain(hashes[2]);
      const retained = applyProfessionalExperienceLabV1(state, {
        ...episode(window + 2),
        contextFingerprint: hashes[3] ?? "",
      });
      expect(retained.repeatedContext).toBe(true);
      expect(retained.state.recentContexts).toEqual([
        ...hashes.slice(-window).filter((h) => h !== hashes[3]),
        hashes[3],
      ]);
    });

    it("is independent of episode skill order and produces one canonical hash", () => {
      const forward = applyProfessionalExperienceLabV1(
        initial,
        episode(0, "order", { skillIds: ["programming", "debugging", "data-modelling"] }),
      );
      const reversed = applyProfessionalExperienceLabV1(
        initial,
        episode(0, "order", { skillIds: ["data-modelling", "debugging", "programming"] }),
      );
      expect(fingerprint("lab-result", reversed)).toBe(fingerprint("lab-result", forward));
      expect(reversed.state.lastEpisode?.hash).toBe(forward.state.lastEpisode?.hash);
    });

    it("rejects episodes with zero or more than three skills", () => {
      expect(() => parseProfessionalLabEpisodeV1({ ...episode(0), skillIds: [] })).toThrow(
        /between 1 and 3/u,
      );
      expect(() =>
        parseProfessionalLabEpisodeV1({
          ...episode(0),
          skillIds: ["programming", "debugging", "data-modelling", "testing-quality"],
        }),
      ).toThrow(/between 1 and 3/u);
    });

    it("rejects unsorted skill state and skill practice after the last episode", () => {
      const first = applyProfessionalExperienceLabV1(initial, episode(0));
      const [debugging, programming] = first.state.skills;
      expect(() =>
        parseProfessionalLabStateV1({ ...first.state, skills: [programming, debugging] }),
      ).toThrow(/sorted and unique/u);
      expect(() =>
        parseProfessionalLabStateV1({ ...first.state, skills: [debugging, debugging] }),
      ).toThrow(/sorted and unique/u);
      expect(() =>
        parseProfessionalLabStateV1({
          ...first.state,
          skills: [{ ...debugging, lastPracticedMonth: 1 }, programming],
        }),
      ).toThrow(/postdate last episode/u);
      expect(() =>
        parseProfessionalLabStateV1({
          ...first.state,
          technology: { ...first.state.technology, lastPracticedMonth: 1 },
        }),
      ).toThrow(/postdate last episode/u);
    });

    it("accepts non-consecutive months and rejects an equal or earlier month", () => {
      const first = applyProfessionalExperienceLabV1(initial, episode(0));
      const gap = applyProfessionalExperienceLabV1(first.state, episode(7, "gap/new"));
      expect(gap.kind).toBe("applied");
      expect(gap.state.lastEpisode?.monthIndex).toBe(7);
      expect(() => applyProfessionalExperienceLabV1(gap.state, episode(3, "gap/old"))).toThrow(
        /stale/u,
      );
      expect(() => applyProfessionalExperienceLabV1(gap.state, episode(7, "gap/other"))).toThrow(
        /stale or conflicts/u,
      );
    });
  });
});
