import type { Fingerprint } from "@runtime-human/game-schema";

import type { January1990ContentId } from "./january-content-ids";
import type { January1990ReasonCode } from "./january-reason-codes";

export type JanuaryQuality = "clarity" | "correctness" | "reliability";

export type JanuaryTechnologyContext = Readonly<{
  familyId: January1990ContentId;
  family: "basic";
  technologyId: January1990ContentId;
  technology: "gw-basic";
  bandId: January1990ContentId;
  tier: "A";
  platformId: January1990ContentId;
  platform: "dos-pc";
  toolchainId: January1990ContentId;
  toolchain: "gw-basic-interpreter";
  ecosystemProfileId: January1990ContentId;
  documentationMode: "offline";
}>;

export type JanuaryAccessRoute = Readonly<{
  id: January1990ContentId;
  route: "home-pc" | "shared-school-pc";
  constraint: "household-availability" | "limited-schedule";
  reasonCode: January1990ReasonCode;
}>;

export type JanuarySkillDefinition = Readonly<{
  id: January1990ContentId;
  skill:
    | "debugging"
    | "problem-decomposition"
    | "program-reading"
    | "program-writing"
    | "tool-use";
  quality: JanuaryQuality;
}>;

export type JanuaryLearningActivity = Readonly<{
  id: January1990ContentId;
  activity: "first-listing" | "modify-listing";
  practiceMode: "read-and-run" | "edit-and-debug";
  skillIds: readonly January1990ContentId[];
  reasonCode: January1990ReasonCode;
}>;

export type JanuaryWorkPackage = Readonly<{
  id: January1990ContentId;
  goal: "input-output" | "validation-fix";
  quality: JanuaryQuality;
  skillIds: readonly January1990ContentId[];
  reasonCode: January1990ReasonCode;
}>;

export type JanuaryProjectDefinition = Readonly<{
  id: January1990ContentId;
  archetype: "personal-utility";
  qualities: readonly JanuaryQuality[];
  workPackages: readonly JanuaryWorkPackage[];
}>;

export type JanuarySituationDefinition = Readonly<{
  id: January1990ContentId;
  issueType: "first-bug";
  eventIds: readonly January1990ContentId[];
}>;

export type JanuaryEventDefinition = Readonly<{
  id: January1990ContentId;
  eventType:
    | "access-window"
    | "logic-error"
    | "manual-found"
    | "program-runs"
    | "syntax-error";
  reasonCode: January1990ReasonCode;
}>;

export type January1990ContentContext = Readonly<{
  schemaVersion: "january-1990-content-context-v1";
  month: "1990-01";
  contentFingerprint: Fingerprint;
  requiredChunkIds: readonly ["1990s/ecosystem", "1990s/programming"];
  technology: JanuaryTechnologyContext;
  accessRoutes: readonly JanuaryAccessRoute[];
  skills: readonly JanuarySkillDefinition[];
  learningActivities: readonly JanuaryLearningActivity[];
  project: JanuaryProjectDefinition;
  situation: JanuarySituationDefinition;
  events: readonly JanuaryEventDefinition[];
}>;
