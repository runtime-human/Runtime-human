import { createRngDomainPathV1, type RngDomainPathV1 } from "../determinism/rng-domain";
import type { January1990ContentContext } from "./january-content-context";
import { JANUARY_1990_CONTENT_IDS } from "./january-content-ids";
import { assertJanuary1990ContentContext } from "./january-month-plan";

export type January1990RngDomainPathsV1 = Readonly<{
  narrativeEventSelection: RngDomainPathV1;
  outcomeQualityRoll: RngDomainPathV1;
}>;

export function createJanuary1990RngDomainPathsV1(
  context: January1990ContentContext,
): January1990RngDomainPathsV1 {
  assertJanuary1990ContentContext(context);
  if (context.situation.id !== JANUARY_1990_CONTENT_IDS.firstBugSituation) {
    throw new TypeError(
      "January narrative RNG owner does not match the approved first-bug situation",
    );
  }

  const outcomeWorkPackage = context.project.workPackages.find(
    (candidate) => candidate.id === JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage,
  );
  if (outcomeWorkPackage === undefined) {
    throw new TypeError("January outcome RNG owner is missing from the approved project context");
  }

  return Object.freeze({
    narrativeEventSelection: createRngDomainPathV1({
      month: context.month,
      domain: "narrative",
      entityId: context.situation.id,
      purpose: "event-selection",
    }),
    outcomeQualityRoll: createRngDomainPathV1({
      month: context.month,
      domain: "outcome",
      entityId: outcomeWorkPackage.id,
      purpose: "quality-roll",
    }),
  });
}
