import { fingerprint } from "../determinism/hash";

/**
 * PROG-01B1 is a versioned, pure progression laboratory. It MUST NOT be used
 * as a serialized January save or production grade authority until B2 migrates
 * and atomically commits it under an explicit rules/compatibility manifest.
 */
export const PROFESSIONAL_LAB_RULES_V1 = Object.freeze({
  schemaVersion: "professional-lab-rules-v1",
  maximumPoints: 10_000,
  maximumRecentContexts: 8,
  baseMastery: 64,
  baseFluency: 48,
  baseFamiliarity: 56,
  fluencyGraceMonths: 3,
  fluencyDecayPerMonth: 12,
  challengeBps: Object.freeze({
    guided: 8_000,
    familiar: 9_000,
    independent: 10_500,
    complex: 12_000,
  }),
  feedbackBps: Object.freeze({
    limited: 7_000,
    useful: 10_000,
    thorough: 11_000,
  }),
  outcomeBps: Object.freeze({
    completed: 10_000,
    partial: 8_000,
    "failed-with-learning": 6_000,
    recovered: 9_000,
  }),
  participationBps: Object.freeze({
    independent: 10_000,
    assisted: 10_500,
  }),
  repeatNoveltyBps: 1_500,
  newContextNoveltyBps: 10_000,
} as const);

export type ProfessionalLabSkillIdV1 =
  | "problem-solving"
  | "programming"
  | "debugging"
  | "data-modelling"
  | "testing-quality";

export type ProfessionalLabSkillV1 = Readonly<{
  skillId: ProfessionalLabSkillIdV1;
  mastery: number;
  fluency: number;
  lastPracticedMonth: number;
}>;

export type ProfessionalLabTechnologyV1 = Readonly<{
  technologyId: "gw-basic";
  familiarity: number;
  lastPracticedMonth: number;
}>;

export type ProfessionalLabLastEpisodeV1 = Readonly<{
  id: string;
  hash: string;
  monthIndex: number;
}>;

export type ProfessionalLabStateV1 = Readonly<{
  schemaVersion: "professional-lab-state-v1";
  aptitudes: Readonly<{ reasoning: number; learning: number }>;
  skills: readonly ProfessionalLabSkillV1[];
  technology: ProfessionalLabTechnologyV1 | null;
  recentContexts: readonly string[];
  lastEpisode: ProfessionalLabLastEpisodeV1 | null;
}>;

export type ProfessionalLabEpisodeV1 = Readonly<{
  schemaVersion: "professional-lab-episode-v1";
  id: string;
  monthIndex: number;
  provider: "project";
  skillIds: readonly ProfessionalLabSkillIdV1[];
  technologyId: "gw-basic";
  contextFingerprint: string;
  challenge: "guided" | "familiar" | "independent" | "complex";
  participation: "independent" | "assisted";
  outcome: "completed" | "partial" | "failed-with-learning" | "recovered";
  feedback: "limited" | "useful" | "thorough";
}>;

export type ProfessionalLabSkillDeltaV1 = Readonly<{
  skillId: ProfessionalLabSkillIdV1;
  masteryGain: number;
  fluencyGain: number;
}>;

export type ProfessionalLabResultV1 = Readonly<{
  kind: "applied" | "replayed";
  state: ProfessionalLabStateV1;
  deltas: readonly ProfessionalLabSkillDeltaV1[];
  familiarityGain: number;
  independentDeliveryObserved: boolean;
  gradeAwarded: false;
  repeatedContext: boolean;
}>;

const SKILLS: readonly ProfessionalLabSkillIdV1[] = Object.freeze([
  "data-modelling",
  "debugging",
  "problem-solving",
  "programming",
  "testing-quality",
]);

const CHALLENGES = Object.freeze(["guided", "familiar", "independent", "complex"] as const);
const FEEDBACK = Object.freeze(["limited", "useful", "thorough"] as const);
const OUTCOMES = Object.freeze([
  "completed",
  "partial",
  "failed-with-learning",
  "recovered",
] as const);
const PARTICIPATION = Object.freeze(["independent", "assisted"] as const);
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const ID_PATTERN = /^[a-z0-9][a-z0-9.:/_-]{0,127}$/u;

export function createProfessionalLabStateV1(
  reasoning: number,
  learning: number,
): ProfessionalLabStateV1 {
  return Object.freeze({
    schemaVersion: "professional-lab-state-v1",
    aptitudes: Object.freeze({
      reasoning: integer(reasoning, 0, 1_000, "reasoning aptitude"),
      learning: integer(learning, 0, 1_000, "learning aptitude"),
    }),
    skills: Object.freeze([]),
    technology: null,
    recentContexts: Object.freeze([]),
    lastEpisode: null,
  });
}

export function parseProfessionalLabEpisodeV1(value: unknown): ProfessionalLabEpisodeV1 {
  const record = closedRecord(
    value,
    [
      "challenge",
      "contextFingerprint",
      "feedback",
      "id",
      "monthIndex",
      "outcome",
      "participation",
      "provider",
      "schemaVersion",
      "skillIds",
      "technologyId",
    ],
    "episode",
  );
  if (record.schemaVersion !== "professional-lab-episode-v1" || record.provider !== "project") {
    throw new TypeError("Professional episode schema/provider is not supported");
  }
  if (record.technologyId !== "gw-basic") {
    throw new TypeError("Professional episode technology is not supported");
  }
  const skillIds = skillList(record.skillIds);
  return Object.freeze({
    schemaVersion: "professional-lab-episode-v1",
    id: episodeId(record.id),
    monthIndex: integer(record.monthIndex, 0, 12_000, "episode month"),
    provider: "project",
    skillIds,
    technologyId: "gw-basic",
    contextFingerprint: hashValue(record.contextFingerprint, "episode context"),
    challenge: oneOf(record.challenge, CHALLENGES, "challenge"),
    participation: oneOf(record.participation, PARTICIPATION, "participation"),
    outcome: oneOf(record.outcome, OUTCOMES, "outcome"),
    feedback: oneOf(record.feedback, FEEDBACK, "feedback"),
  });
}

export function parseProfessionalLabStateV1(value: unknown): ProfessionalLabStateV1 {
  const record = closedRecord(
    value,
    ["aptitudes", "lastEpisode", "recentContexts", "schemaVersion", "skills", "technology"],
    "state",
  );
  if (record.schemaVersion !== "professional-lab-state-v1") {
    throw new TypeError("Professional state schema is not supported");
  }
  const aptitudes = closedRecord(record.aptitudes, ["learning", "reasoning"], "aptitudes");
  const lastEpisode =
    record.lastEpisode === null ? null : parseLastEpisode(record.lastEpisode);
  if (!Array.isArray(record.skills) || record.skills.length > SKILLS.length) {
    throw new TypeError("Professional state requires bounded skills");
  }
  const skills = record.skills.map((item) => parseSkill(item));
  if (skills.some((s, i) => i > 0 && (skills[i - 1]?.skillId ?? "") >= s.skillId)) {
    throw new TypeError("Professional state skills must be sorted and unique");
  }
  if (!Array.isArray(record.recentContexts) ||
      record.recentContexts.length > PROFESSIONAL_LAB_RULES_V1.maximumRecentContexts) {
    throw new TypeError("Professional state requires bounded recent contexts");
  }
  const recentContexts = record.recentContexts.map((x) => hashValue(x, "recent context"));
  if (new Set(recentContexts).size !== recentContexts.length) {
    throw new TypeError("Professional recent contexts must be unique");
  }
  const technology =
    record.technology === null ? null : parseTechnology(record.technology);
  const state = Object.freeze({
    schemaVersion: "professional-lab-state-v1" as const,
    aptitudes: Object.freeze({
      reasoning: integer(aptitudes.reasoning, 0, 1_000, "reasoning aptitude"),
      learning: integer(aptitudes.learning, 0, 1_000, "learning aptitude"),
    }),
    skills: Object.freeze(skills),
    technology,
    recentContexts: Object.freeze(recentContexts),
    lastEpisode,
  });
  if (lastEpisode === null && (skills.length !== 0 || technology !== null || recentContexts.length !== 0)) {
    throw new TypeError("Uncommitted professional state cannot contain progress");
  }
  if (lastEpisode !== null && recentContexts.length === 0) {
    throw new TypeError("Committed professional state requires a context");
  }
  if (lastEpisode !== null && skills.some((skill) => skill.lastPracticedMonth > lastEpisode.monthIndex)) {
    throw new TypeError("Skill practice cannot postdate last episode");
  }
  if (lastEpisode !== null && technology !== null && technology.lastPracticedMonth > lastEpisode.monthIndex) {
    throw new TypeError("Technology practice cannot postdate last episode");
  }
  return state;
}

/** One verified provider episode per month in the B1 laboratory. */
export function applyProfessionalExperienceLabV1(
  current: ProfessionalLabStateV1,
  input: ProfessionalLabEpisodeV1,
): ProfessionalLabResultV1 {
  const state = parseProfessionalLabStateV1(current);
  const episode = parseProfessionalLabEpisodeV1(input);
  const hash = fingerprint("professional-lab-episode-v1", episode);
  const previous = state.lastEpisode;
  if (previous !== null && episode.monthIndex <= previous.monthIndex) {
    if (episode.monthIndex === previous.monthIndex && previous.id === episode.id &&
        previous.hash === hash) {
      return Object.freeze({
        kind: "replayed" as const,
        state,
        deltas: Object.freeze([]),
        familiarityGain: 0,
        independentDeliveryObserved: false,
        gradeAwarded: false as const,
        repeatedContext: state.recentContexts.includes(episode.contextFingerprint),
      });
    }
    throw new TypeError("Professional episode is stale or conflicts with the committed month");
  }
  const repeatedContext = state.recentContexts.includes(episode.contextFingerprint);
  const noveltyBps = repeatedContext
    ? PROFESSIONAL_LAB_RULES_V1.repeatNoveltyBps
    : PROFESSIONAL_LAB_RULES_V1.newContextNoveltyBps;
  const capacityBps = 9_000 + state.aptitudes.learning * 2;
  const challengeBps = PROFESSIONAL_LAB_RULES_V1.challengeBps[episode.challenge];
  const outcomeBps = PROFESSIONAL_LAB_RULES_V1.outcomeBps[episode.outcome];
  const feedbackBps = PROFESSIONAL_LAB_RULES_V1.feedbackBps[episode.feedback];
  const participationBps = PROFESSIONAL_LAB_RULES_V1.participationBps[episode.participation];
  const skillSet = new Set(episode.skillIds);
  const allIds = [...new Set([...state.skills.map((s) => s.skillId), ...episode.skillIds])]
    .sort(compareText);
  const deltas: ProfessionalLabSkillDeltaV1[] = [];
  const skills = allIds.map((id) => {
    const old = state.skills.find((skill) => skill.skillId === id);
    const mastery = old?.mastery ?? 0;
    const priorFluency = old === undefined ? 0 : decayFluency(old, episode.monthIndex);
    if (!skillSet.has(id)) {
      return Object.freeze({
        skillId: id,
        mastery,
        fluency: priorFluency,
        lastPracticedMonth: old?.lastPracticedMonth ?? episode.monthIndex,
      });
    }
    const diminishingBps = 10_000 - (mastery * 5_000) / 10_000;
    // All intermediate multiplications and round-half-even are exact BigInt.
    const masteryGain = boundedGain(mastery, roundHalfEven(
      PROFESSIONAL_LAB_RULES_V1.baseMastery,
      [challengeBps, noveltyBps, feedbackBps, capacityBps, Math.trunc(diminishingBps)],
    ));
    const fluencyGain = boundedGain(priorFluency, roundHalfEven(
      PROFESSIONAL_LAB_RULES_V1.baseFluency,
      [participationBps, outcomeBps],
    ));
    deltas.push(Object.freeze({ skillId: id, masteryGain, fluencyGain }));
    return Object.freeze({
      skillId: id,
      mastery: mastery + masteryGain,
      fluency: priorFluency + fluencyGain,
      lastPracticedMonth: episode.monthIndex,
    });
  });
  const previousFamiliarity = state.technology?.familiarity ?? 0;
  const familiarityGain = boundedGain(previousFamiliarity, roundHalfEven(
    PROFESSIONAL_LAB_RULES_V1.baseFamiliarity,
    [noveltyBps, outcomeBps],
  ));
  const contexts = Object.freeze([
    ...state.recentContexts.filter((context) => context !== episode.contextFingerprint),
    episode.contextFingerprint,
  ].slice(-PROFESSIONAL_LAB_RULES_V1.maximumRecentContexts));

  const next = parseProfessionalLabStateV1({
    schemaVersion: "professional-lab-state-v1",
    aptitudes: state.aptitudes,
    skills,
    technology: {
      technologyId: "gw-basic",
      familiarity: previousFamiliarity + familiarityGain,
      lastPracticedMonth: episode.monthIndex,
    },
    recentContexts: contexts,
    lastEpisode: {
      id: episode.id,
      hash,
      monthIndex: episode.monthIndex,
    },
  });
  return Object.freeze({
    kind: "applied" as const,
    state: next,
    deltas: Object.freeze(deltas),
    familiarityGain,
    independentDeliveryObserved:
      episode.participation === "independent" &&
      episode.outcome === "completed" &&
      (episode.challenge === "independent" || episode.challenge === "complex"),
    gradeAwarded: false as const,
    repeatedContext,
  });
}

function decayFluency(skill: ProfessionalLabSkillV1, newMonth: number): number {
  const gap = newMonth - skill.lastPracticedMonth - 1;
  const months = Math.max(0, gap - PROFESSIONAL_LAB_RULES_V1.fluencyGraceMonths);
  return Math.max(0, skill.fluency - months * PROFESSIONAL_LAB_RULES_V1.fluencyDecayPerMonth);
}

function roundHalfEven(base: number, multipliers: readonly number[]): number {
  let numerator = BigInt(base);
  let denominator = 1n;
  for (const multiplier of multipliers) {
    numerator *= BigInt(multiplier);
    denominator *= 10_000n;
  }
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const doubled = remainder * 2n;
  const rounded = quotient + (doubled > denominator || (doubled === denominator && quotient % 2n === 1n) ? 1n : 0n);
  return Number(rounded);
}

function boundedGain(current: number, proposed: number): number {
  return Math.min(PROFESSIONAL_LAB_RULES_V1.maximumPoints - current, proposed);
}

function parseSkill(value: unknown): ProfessionalLabSkillV1 {
  const record = closedRecord(value, ["fluency", "lastPracticedMonth", "mastery", "skillId"], "skill");
  const skillId = oneOf(record.skillId, SKILLS, "skill ID");
  return Object.freeze({
    skillId,
    mastery: integer(record.mastery, 0, 10_000, "mastery"),
    fluency: integer(record.fluency, 0, 10_000, "fluency"),
    lastPracticedMonth: integer(record.lastPracticedMonth, 0, 12_000, "last practiced month"),
  });
}

function parseTechnology(value: unknown): ProfessionalLabTechnologyV1 {
  const record = closedRecord(value, ["familiarity", "lastPracticedMonth", "technologyId"], "technology");
  if (record.technologyId !== "gw-basic") throw new TypeError("Unknown professional technology");
  return Object.freeze({
    technologyId: "gw-basic",
    familiarity: integer(record.familiarity, 0, 10_000, "familiarity"),
    lastPracticedMonth: integer(record.lastPracticedMonth, 0, 12_000, "last technology month"),
  });
}

function parseLastEpisode(value: unknown): ProfessionalLabLastEpisodeV1 {
  const record = closedRecord(value, ["hash", "id", "monthIndex"], "last episode");
  return Object.freeze({
    id: episodeId(record.id),
    hash: hashValue(record.hash, "last episode hash"),
    monthIndex: integer(record.monthIndex, 0, 12_000, "last episode month"),
  });
}

function skillList(value: unknown): readonly ProfessionalLabSkillIdV1[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 3) {
    throw new TypeError("Professional episode must affect between 1 and 3 skills");
  }
  const ids = value.map((v) => oneOf(v, SKILLS, "skill ID")).sort(compareText);
  if (new Set(ids).size !== ids.length) throw new TypeError("Duplicate episode skills");
  return Object.freeze(ids);
}

function closedRecord(
  value: unknown,
  keys: readonly string[],
  label: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`Professional ${label} must be a plain object`);
  }
  const actual = Object.keys(value).sort(compareText);
  const expected = [...keys].sort(compareText);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`Professional ${label} fields do not match contract`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function episodeId(value: unknown): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new TypeError("Professional episode ID is invalid");
  }
  return value;
}

function hashValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) {
    throw new TypeError(`Professional ${label} must be a lowercase SHA-256 fingerprint`);
  }
  return value;
}

function oneOf<const T extends readonly string[]>(
  value: unknown,
  values: T,
  label: string,
): T[number] {
  if (typeof value !== "string" || !values.some((entry) => entry === value)) {
    throw new TypeError(`Unsupported professional ${label}`);
  }
  return value as T[number];
}

function integer(value: unknown, minimum: number, maximum: number, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new TypeError(`Invalid professional ${label}`);
  }
  return value as number;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
