import {
  createJanuary1990RngDomainPathsV1,
  deriveRandomSource,
  fingerprint,
  JANUARY_1990_RNG_CALL_BUDGET,
  RNG_DERIVATION_MANIFEST_V1,
  type January1990BalanceV1,
  type January1990ContentContext,
  type RngDomainPathV1,
} from "@runtime-human/game-core";
import {
  parseSerializedXoshiro256State,
  type Fingerprint,
  type RngDerivationManifestV1,
  type SerializedXoshiro256State,
} from "@runtime-human/game-schema";

export const JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION = "january-rng-shadow-report-v1" as const;

export type JanuaryRngShadowCallCountV1 = Readonly<{
  declared: number;
  observed: number;
}>;

export type JanuaryRngShadowDomainCallsV1 = Readonly<{
  content: JanuaryRngShadowCallCountV1;
  narrative: JanuaryRngShadowCallCountV1;
  outcome: JanuaryRngShadowCallCountV1;
}>;

export type JanuaryRngShadowStreamV1 = Readonly<{
  domain: "narrative" | "outcome";
  purpose: "event-selection" | "quality-roll";
  path: RngDomainPathV1;
  declaredCalls: number;
  observedCalls: number;
  derivedStateFingerprint: Fingerprint;
  postCallsStateFingerprint: Fingerprint;
}>;

export type JanuaryRngShadowReportV1 = Readonly<{
  schemaVersion: typeof JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION;
  month: "1990-01";
  derivationManifest: RngDerivationManifestV1;
  rootStateFingerprint: Fingerprint;
  domainCalls: JanuaryRngShadowDomainCallsV1;
  streams: readonly JanuaryRngShadowStreamV1[];
}>;

export type CreateJanuary1990RngShadowReportInput = Readonly<{
  context: January1990ContentContext;
  balance: January1990BalanceV1;
  rootState: SerializedXoshiro256State;
}>;

export function createJanuary1990RngShadowReport(
  input: CreateJanuary1990RngShadowReportInput,
): JanuaryRngShadowReportV1 {
  const rootState = parseSerializedXoshiro256State(input.rootState);
  const paths = createJanuary1990RngDomainPathsV1(input.context);
  const narrativeCandidateCount = input.context.situation.eventIds.length;
  if (narrativeCandidateCount !== 2) {
    throw new TypeError("January RNG shadow requires exactly two narrative defect candidates");
  }

  const narrativeStream = createShadowStream({
    rootState,
    domain: "narrative",
    purpose: "event-selection",
    path: paths.narrativeEventSelection,
    declaredCalls: JANUARY_1990_RNG_CALL_BUDGET.narrative,
    consume(random) {
      random.nextInt(0, narrativeCandidateCount);
      return 1;
    },
  });

  const outcomeStream = createShadowStream({
    rootState,
    domain: "outcome",
    purpose: "quality-roll",
    path: paths.outcomeQualityRoll,
    declaredCalls: JANUARY_1990_RNG_CALL_BUDGET.outcome,
    consume(random) {
      const bounds = input.balance.quality.outcomeRoll;
      random.nextInt(bounds.minimum, bounds.maximum + 1);
      return 1;
    },
  });

  const domainCalls = Object.freeze({
    content: Object.freeze({
      declared: JANUARY_1990_RNG_CALL_BUDGET.content,
      observed: 0,
    }),
    narrative: Object.freeze({
      declared: JANUARY_1990_RNG_CALL_BUDGET.narrative,
      observed: narrativeStream.observedCalls,
    }),
    outcome: Object.freeze({
      declared: JANUARY_1990_RNG_CALL_BUDGET.outcome,
      observed: outcomeStream.observedCalls,
    }),
  });
  requireExactCallBudget(domainCalls);

  return Object.freeze({
    schemaVersion: JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION,
    month: "1990-01",
    derivationManifest: RNG_DERIVATION_MANIFEST_V1,
    rootStateFingerprint: fingerprint("january-1990-rng-shadow-root-state-v1", rootState),
    domainCalls,
    streams: Object.freeze([narrativeStream, outcomeStream]),
  });
}

function createShadowStream(
  input: Readonly<{
    rootState: SerializedXoshiro256State;
    domain: JanuaryRngShadowStreamV1["domain"];
    purpose: JanuaryRngShadowStreamV1["purpose"];
    path: RngDomainPathV1;
    declaredCalls: number;
    consume(random: ReturnType<typeof deriveRandomSource>): number;
  }>,
): JanuaryRngShadowStreamV1 {
  const random = deriveRandomSource(input.rootState, input.path);
  const derivedState = random.exportState();
  const observedCalls = input.consume(random);
  if (observedCalls !== input.declaredCalls) {
    throw new TypeError(
      `January RNG shadow call budget mismatch for ${input.domain}/${input.purpose}`,
    );
  }
  const postCallsState = random.exportState();

  return Object.freeze({
    domain: input.domain,
    purpose: input.purpose,
    path: input.path,
    declaredCalls: input.declaredCalls,
    observedCalls,
    derivedStateFingerprint: streamStateFingerprint(input.path, "derived", derivedState),
    postCallsStateFingerprint: streamStateFingerprint(input.path, "post-calls", postCallsState),
  });
}

function streamStateFingerprint(
  path: RngDomainPathV1,
  phase: "derived" | "post-calls",
  state: SerializedXoshiro256State,
): Fingerprint {
  return fingerprint("january-1990-rng-shadow-stream-state-v1", {
    path,
    phase,
    state,
  });
}

function requireExactCallBudget(domainCalls: JanuaryRngShadowDomainCallsV1): void {
  for (const [domain, calls] of Object.entries(domainCalls)) {
    if (calls.declared !== calls.observed) {
      throw new TypeError(`January RNG shadow did not cover the declared ${domain} call budget`);
    }
  }
}
