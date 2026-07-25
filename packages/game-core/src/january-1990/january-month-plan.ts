import type { Fingerprint } from "@runtime-human/game-schema";

import type { January1990ContentContext } from "./january-content-context";
import { JANUARY_1990_REQUIRED_CHUNK_IDS } from "./january-content-ids";

export type January1990MonthPlanV1 = Readonly<{
  schemaVersion: "january-1990-month-plan-v1";
  month: "1990-01";
  program: "january-1990-v1";
  contentFingerprint: Fingerprint;
  requiredChunkIds: readonly ["1990s/ecosystem", "1990s/programming"];
}>;

export function createJanuary1990MonthPlan(
  context: January1990ContentContext,
): January1990MonthPlanV1 {
  return Object.freeze({
    schemaVersion: "january-1990-month-plan-v1",
    month: "1990-01",
    program: "january-1990-v1",
    contentFingerprint: context.contentFingerprint,
    requiredChunkIds: JANUARY_1990_REQUIRED_CHUNK_IDS,
  });
}
