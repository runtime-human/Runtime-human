/**
 * REF-02B1a: fail-closed preflight for the January v2 approach-card draft.
 *
 * This is an authoring-time check, not a content schema, compiled bundle,
 * player read model, or runtime authority. The REF-02B1 compiler integration
 * must call this gate on its separately versioned v2 source.
 *
 * Truth claims are deliberately narrower than the full ADR-021 vocabulary.
 * A marker is accepted only when the frozen outcome oracle proves its
 * direction across all declared contexts and all ten supplied rolls.
 */
import {
  assertJanuaryV2ApproachBalance,
  JANUARY_V2_APPROACHES,
  JANUARY_V2_DECLARED_CONTEXTS,
  resolveJanuaryV2Approach,
  type JanuaryV2Approach,
  type JanuaryV2ApproachTable,
  type JanuaryV2ContextBalance,
  type JanuaryV2Outcome,
} from "@runtime-human/game-core";

export const JANUARY_V2_PRESENTATION_DRAFT_VERSION =
  "january-v2-approach-presentation-draft-v1" as const;

export type JanuaryV2MarkerAxis =
  | "release-timing"
  | "independent-experience"
  | "finish-chance"
  | "scope"
  | "quality";
export type JanuaryV2MarkerPolarity = "gain" | "cost" | "unknown";
export type JanuaryV2DraftMarker = Readonly<{
  axis: JanuaryV2MarkerAxis;
  polarity: JanuaryV2MarkerPolarity;
  text: string;
}>;
export type JanuaryV2DraftApproach = Readonly<{
  id: JanuaryV2Approach;
  label: string;
  forecast: string;
  availability: "available";
  tradeOffs: readonly JanuaryV2DraftMarker[];
}>;
export type JanuaryV2PresentationDraft = Readonly<{
  schemaVersion: typeof JANUARY_V2_PRESENTATION_DRAFT_VERSION;
  approaches: readonly JanuaryV2DraftApproach[];
}>;

const AXES: readonly JanuaryV2MarkerAxis[] = [
  "release-timing",
  "independent-experience",
  "finish-chance",
  "scope",
  "quality",
];
const POLARITIES: readonly JanuaryV2MarkerPolarity[] = ["gain", "cost", "unknown"];

// Player-facing preview text only. Source-code listings are NOT checked by
// this lexical guard: BASIC line numbers and program syntax are legitimate.
const NUMERIC_PREVIEW = /[\p{N}%％]/u;
const INTERNAL_OR_SKILL = /(?:\b(?:xp|mastery|readiness|evidence|debugging|programming)\b|навык\p{L}*|мастерств\p{L}*|отладк\p{L}*|программировани\p{L}*|готовност\p{L}*|опыт[а-я]*\s+в\s+баллах)/iu;
const NPC_ROLES = /(?:\b(?:npc|mentor|teacher|friend|parent)\b|наставник\p{L}*|учител\p{L}*|родител\p{L}*|товарищ\p{L}*|одноклассник\p{L}*|друг(?:а|у|ом|ом|у|ие|их|ой|ие|и)?\b)/iu;
const PROMOTION = /(?:лучши\p{L}*|рекоменду\p{L}*|оптимальн\p{L}*|\brecommended\b|\bbest\b)/iu;

function assertFields(
  value: unknown,
  keys: readonly string[],
  scope: string,
): asserts value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError(scope + ": expected plain object");
  }
  if (JSON.stringify(Object.keys(value).toSorted()) !== JSON.stringify([...keys].toSorted())) {
    throw new TypeError(scope + ": expected complete closed fields");
  }
}

function assertPreviewText(value: unknown, scope: string, maxScalars: number): void {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length === 0 ||
    [...value].length > maxScalars ||
    /[\r\n\t\p{Cc}\p{Cf}]/u.test(value)
  ) {
    throw new TypeError(scope + ": invalid text length or controls");
  }
  if (NUMERIC_PREVIEW.test(value)) {
    throw new TypeError(scope + ": numeric or percentage claim in player preview");
  }
  if (INTERNAL_OR_SKILL.test(value)) {
    throw new TypeError(scope + ": internal metric or skill name in player preview");
  }
  if (NPC_ROLES.test(value)) {
    throw new TypeError(scope + ": NPC reference before NPC foundation");
  }
  if (PROMOTION.test(value)) {
    throw new TypeError(scope + ": promotional superlative in player preview");
  }
}

type Samples = readonly (readonly JanuaryV2Outcome[])[];
function successCount(outcomes: readonly JanuaryV2Outcome[]): number {
  return outcomes.filter((item) => item.delivery !== "delayed-to-february").length;
}

/**
 * Unmodeled claims are rejected rather than guessed. In particular, there
 * is no quantitative "simpler scope" axis and no generic "best" choice.
 *
 * The comparator for finish-chance/gain is independent investigation.
 * The comparator for finish-chance/cost is assisted help. These comparisons
 * are part of this draft contract and must be re-reviewed if the copy changes.
 */
function provesMarker(
  axis: JanuaryV2MarkerAxis,
  polarity: JanuaryV2MarkerPolarity,
  approachSamples: Samples,
  investigateSamples: Samples,
  helpSamples: Samples,
): boolean {
  if (axis === "finish-chance") {
    if (polarity === "gain") {
      return approachSamples.every(
        (outcomes, index) => successCount(outcomes) > successCount(investigateSamples[index]!),
      );
    }
    if (polarity === "cost") {
      return approachSamples.every(
        (outcomes, index) => successCount(outcomes) < successCount(helpSamples[index]!),
      );
    }
    return approachSamples.every(
      (outcomes) => successCount(outcomes) > 0 && successCount(outcomes) < outcomes.length,
    );
  }
  if (polarity === "unknown") return false;
  if (axis === "release-timing") {
    return polarity === "gain"
      ? approachSamples.every((outcomes) =>
          outcomes.every((item) => item.delivery !== "delayed-to-february"),
        )
      : approachSamples.every((outcomes) =>
          outcomes.every((item) => item.delivery === "delayed-to-february"),
        );
  }
  if (axis === "independent-experience") {
    return polarity === "gain"
      ? approachSamples.every(
          (outcomes) =>
            outcomes.every((item) => item.participation === "independent") &&
            outcomes.some((item) => item.delivery !== "delayed-to-february"),
        )
      : approachSamples.every((outcomes) =>
          outcomes.every((item) => item.participation === "assisted"),
        );
  }
  if (axis === "scope") {
    return (
      polarity === "cost" &&
      approachSamples.every((outcomes) =>
        outcomes.every((item) => item.delivery === "released-with-limitation"),
      )
    );
  }
  // Strong quality is only a relative forecast for deferral; never imply
  // that a delayed item was already released. Wording still needs human review.
  return polarity === "gain"
    ? approachSamples.every((outcomes) => outcomes.every((item) => item.quality === "strong"))
    : approachSamples.every((outcomes) => outcomes.every((item) => item.quality === "basic"));
}

function sample(
  table: JanuaryV2ApproachTable,
  balance: JanuaryV2ContextBalance,
  approach: JanuaryV2Approach,
): Samples {
  return JANUARY_V2_DECLARED_CONTEXTS.map((context) =>
    Array.from({ length: 10 }, (_, roll) =>
      resolveJanuaryV2Approach(table, context, approach, roll, balance),
    ),
  );
}

/** Validate author text + marker witnesses without mutating v1 or publishing v2. */
export function assertJanuaryV2PresentationDraft(
  value: unknown,
  table: JanuaryV2ApproachTable,
  balance: JanuaryV2ContextBalance,
): asserts value is JanuaryV2PresentationDraft {
  assertJanuaryV2ApproachBalance(table, balance);
  assertFields(value, ["schemaVersion", "approaches"], "draft");
  if (value.schemaVersion !== JANUARY_V2_PRESENTATION_DRAFT_VERSION) {
    throw new TypeError("Unknown January v2 presentation draft version");
  }
  if (!Array.isArray(value.approaches) || value.approaches.length !== JANUARY_V2_APPROACHES.length) {
    throw new TypeError("January v2 presentation requires exactly four approaches");
  }

  const investigate = sample(table, balance, "investigate-first");
  const help = sample(table, balance, "ask-for-help");
  for (const [index, option] of value.approaches.entries()) {
    assertFields(
      option,
      ["id", "label", "forecast", "availability", "tradeOffs"],
      "approach",
    );
    if (option.id !== JANUARY_V2_APPROACHES[index]) {
      throw new TypeError("January v2 approach IDs/order must be canonical");
    }
    if (option.availability !== "available") {
      throw new TypeError("REF-02B1a supports only available approaches");
    }
    assertPreviewText(option.label, "label", 64);
    assertPreviewText(option.forecast, "forecast", 160);
    if (!Array.isArray(option.tradeOffs) || option.tradeOffs.length < 1 || option.tradeOffs.length > 2) {
      throw new TypeError("January v2 approach requires one or two markers");
    }

    let hasCostOrUnknown = false;
    const seenAxes = new Set<string>();
    const outcomes = sample(table, balance, option.id as JanuaryV2Approach);
    for (const marker of option.tradeOffs) {
      assertFields(marker, ["axis", "polarity", "text"], "marker");
      if (
        !AXES.includes(marker.axis as JanuaryV2MarkerAxis) ||
        !POLARITIES.includes(marker.polarity as JanuaryV2MarkerPolarity)
      ) {
        throw new TypeError("Unknown January v2 marker axis or polarity");
      }
      if (seenAxes.has(marker.axis as string)) {
        throw new TypeError("Duplicate January v2 marker axis");
      }
      seenAxes.add(marker.axis as string);
      assertPreviewText(marker.text, "marker text", 96);
      if (marker.polarity === "cost" || marker.polarity === "unknown") {
        hasCostOrUnknown = true;
      }
      if (
        !provesMarker(
          marker.axis as JanuaryV2MarkerAxis,
          marker.polarity as JanuaryV2MarkerPolarity,
          outcomes,
          investigate,
          help,
        )
      ) {
        throw new TypeError(
          "Unproven January v2 marker: " + String(option.id) + "/" +
            String(marker.axis) + "/" + String(marker.polarity),
        );
      }
    }
    if (!hasCostOrUnknown) {
      throw new TypeError("January v2 option has no cost or unknown marker");
    }
  }
}
