import {
  JANUARY_1990_CONTENT_IDS as C,
  JANUARY_1990_REASON_CODES as R,
  JANUARY_1990_REQUIRED_CHUNK_IDS,
  type January1990ContentContext,
  type January1990ContentId,
  type January1990ReasonCode,
  type JanuaryAccessRoute,
  type JanuaryEventDefinition,
  type JanuaryLearningActivity,
  type JanuaryProjectDefinition,
  type JanuaryQuality,
  type JanuarySituationDefinition,
  type JanuarySkillDefinition,
  type JanuaryTechnologyContext,
  type JanuaryWorkPackage,
} from "@runtime-human/game-core";

import type {
  JanuaryContentEntryPort,
  JanuaryContentRegistryPort,
} from "./january-content-registry-port";
import {
  deepFreezeJanuary,
  requireJanuaryEntry,
  requireJanuaryPayload,
  requireJanuaryReferences,
  requireLiteralString,
  requireLiteralStringArray,
  type JanuaryPayloadObject,
} from "./january-payload-readers";

const ACCESS_SPECS: readonly AccessSpec[] = [
  [
    C.homePcAccess,
    "home-pc",
    "household-availability",
    [C.dosPcPlatform, C.gwBasicInterpreterToolchain],
    R.homePcAccess,
  ],
  [
    C.sharedSchoolPcAccess,
    "shared-school-pc",
    "limited-schedule",
    [C.offlineManualsEcosystem, C.dosPcPlatform, C.gwBasicInterpreterToolchain],
    R.sharedSchoolPcAccess,
  ],
];

const SKILL_SPECS: readonly SkillSpec[] = [
  [C.debuggingSkill, "debugging", "correctness"],
  [C.problemDecompositionSkill, "problem-decomposition", "clarity"],
  [C.programReadingSkill, "program-reading", "clarity"],
  [C.programWritingSkill, "program-writing", "correctness"],
  [C.toolUseSkill, "tool-use", "reliability"],
];

const LEARNING_SPECS: readonly LearningSpec[] = [
  [
    C.firstListingActivity,
    "first-listing",
    "read-and-run",
    [
      C.modifyListingActivity,
      C.personalUtilityProject,
      C.problemDecompositionSkill,
      C.programReadingSkill,
      C.programWritingSkill,
      C.toolUseSkill,
    ],
    [
      C.problemDecompositionSkill,
      C.programReadingSkill,
      C.programWritingSkill,
      C.toolUseSkill,
    ],
    R.readAndRunLearning,
  ],
  [
    C.modifyListingActivity,
    "modify-listing",
    "edit-and-debug",
    [C.debuggingSkill, C.validationFixWorkPackage],
    [C.debuggingSkill],
    R.editAndDebugLearning,
  ],
];

const WORK_PACKAGE_SPECS: readonly WorkPackageSpec[] = [
  [
    C.inputOutputWorkPackage,
    "input-output",
    "correctness",
    [C.problemDecompositionSkill, C.programWritingSkill, C.toolUseSkill],
    [
      C.problemDecompositionSkill,
      C.programWritingSkill,
      C.toolUseSkill,
      C.gwBasicDos1990Band,
    ],
    R.inputOutputProject,
  ],
  [
    C.validationFixWorkPackage,
    "validation-fix",
    "reliability",
    [C.debuggingSkill],
    [C.programRunsEvent, C.firstBugSituation, C.debuggingSkill],
    R.validationFixProject,
  ],
];

const EVENT_SPECS: readonly EventSpec[] = [
  [
    C.accessWindowEvent,
    "access-window",
    [C.firstListingActivity, C.manualFoundEvent, C.homePcAccess, C.sharedSchoolPcAccess],
    R.accessWindowEvent,
  ],
  [C.logicErrorEvent, "logic-error", [C.programRunsEvent], R.logicErrorSituation],
  [
    C.manualFoundEvent,
    "manual-found",
    [C.offlineManualsEcosystem, C.programReadingSkill],
    R.manualFoundEvent,
  ],
  [C.programRunsEvent, "program-runs", [], R.programRunsOutcome],
  [C.syntaxErrorEvent, "syntax-error", [C.programRunsEvent], R.syntaxErrorSituation],
];

export function projectJanuary1990Content(
  registry: JanuaryContentRegistryPort,
): January1990ContentContext {
  return deepFreezeJanuary({
    schemaVersion: "january-1990-content-context-v1",
    month: "1990-01",
    contentFingerprint: registry.contentFingerprint,
    requiredChunkIds: JANUARY_1990_REQUIRED_CHUNK_IDS,
    technology: projectTechnology(registry),
    accessRoutes: ACCESS_SPECS.map((spec) => projectAccess(registry, spec)),
    skills: SKILL_SPECS.map((spec) => projectSkill(registry, spec)),
    learningActivities: LEARNING_SPECS.map((spec) => projectLearning(registry, spec)),
    project: projectProject(registry),
    situation: projectSituation(registry),
    events: EVENT_SPECS.map((spec) => projectEvent(registry, spec)),
  } as const satisfies January1990ContentContext);
}

function projectTechnology(registry: JanuaryContentRegistryPort): JanuaryTechnologyContext {
  const family = read(
    registry,
    C.basicTechnologyFamily,
    "technology",
    "technology-family",
    ["contentType", "family"],
    [],
  );
  const technology = read(
    registry,
    C.gwBasicTechnology,
    "technology",
    "technology",
    ["contentType", "familyId", "technology"],
    [C.basicTechnologyFamily],
  );
  const band = read(
    registry,
    C.gwBasicDos1990Band,
    "technology",
    "technology-band",
    ["contentType", "technologyId", "tier"],
    [C.gwBasicTechnology],
  );
  const platform = read(
    registry,
    C.dosPcPlatform,
    "reference",
    "platform",
    ["contentType", "platform"],
    [],
  );
  const toolchain = read(
    registry,
    C.gwBasicInterpreterToolchain,
    "reference",
    "toolchain",
    ["contentType", "technologyId", "toolchain"],
    [C.dosPcPlatform, C.gwBasicDos1990Band],
  );
  const ecosystem = read(
    registry,
    C.offlineManualsEcosystem,
    "reference",
    "ecosystem-profile",
    ["contentType", "documentationMode"],
    [C.dosPcPlatform],
  );

  requireLiteralString(
    technology.payload.familyId,
    C.basicTechnologyFamily,
    technology.entry.id,
    "familyId",
  );
  requireLiteralString(
    band.payload.technologyId,
    C.gwBasicTechnology,
    band.entry.id,
    "technologyId",
  );
  requireLiteralString(
    toolchain.payload.technologyId,
    C.gwBasicTechnology,
    toolchain.entry.id,
    "technologyId",
  );

  return {
    familyId: C.basicTechnologyFamily,
    family: requireLiteralString(family.payload.family, "basic", family.entry.id, "family"),
    technologyId: C.gwBasicTechnology,
    technology: requireLiteralString(
      technology.payload.technology,
      "gw-basic",
      technology.entry.id,
      "technology",
    ),
    bandId: C.gwBasicDos1990Band,
    tier: requireLiteralString(band.payload.tier, "A", band.entry.id, "tier"),
    platformId: C.dosPcPlatform,
    platform: requireLiteralString(
      platform.payload.platform,
      "dos-pc",
      platform.entry.id,
      "platform",
    ),
    toolchainId: C.gwBasicInterpreterToolchain,
    toolchain: requireLiteralString(
      toolchain.payload.toolchain,
      "gw-basic-interpreter",
      toolchain.entry.id,
      "toolchain",
    ),
    ecosystemProfileId: C.offlineManualsEcosystem,
    documentationMode: requireLiteralString(
      ecosystem.payload.documentationMode,
      "offline",
      ecosystem.entry.id,
      "documentationMode",
    ),
  };
}

function projectAccess(
  registry: JanuaryContentRegistryPort,
  [id, route, constraint, references, reasonCode]: AccessSpec,
): JanuaryAccessRoute {
  const result = read(
    registry,
    id,
    "reference",
    "local-tech-availability",
    ["accessRoute", "constraint", "contentType"],
    references,
  );
  return {
    id,
    route: requireLiteralString(result.payload.accessRoute, route, result.entry.id, "accessRoute"),
    constraint: requireLiteralString(
      result.payload.constraint,
      constraint,
      result.entry.id,
      "constraint",
    ),
    reasonCode,
  };
}

function projectSkill(
  registry: JanuaryContentRegistryPort,
  [id, skill, quality]: SkillSpec,
): JanuarySkillDefinition {
  const result = read(
    registry,
    id,
    "reference",
    "skill",
    ["contentType", "quality", "skill"],
    [],
  );
  return {
    id,
    skill: requireLiteralString(result.payload.skill, skill, result.entry.id, "skill"),
    quality: requireLiteralString(result.payload.quality, quality, result.entry.id, "quality"),
  };
}

function projectLearning(
  registry: JanuaryContentRegistryPort,
  [id, activity, practiceMode, references, skillIds, reasonCode]: LearningSpec,
): JanuaryLearningActivity {
  const result = read(
    registry,
    id,
    "storylet",
    "learning-activity",
    ["activity", "contentType", "practiceMode"],
    references,
  );
  return {
    id,
    activity: requireLiteralString(result.payload.activity, activity, result.entry.id, "activity"),
    practiceMode: requireLiteralString(
      result.payload.practiceMode,
      practiceMode,
      result.entry.id,
      "practiceMode",
    ),
    skillIds,
    reasonCode,
  };
}

function projectProject(registry: JanuaryContentRegistryPort): JanuaryProjectDefinition {
  const result = read(
    registry,
    C.personalUtilityProject,
    "storylet",
    "project-archetype",
    ["archetype", "contentType", "qualities"],
    [C.inputOutputWorkPackage, C.validationFixWorkPackage],
  );
  const qualities = ["clarity", "correctness", "reliability"] as const;
  requireLiteralStringArray(result.payload.qualities, qualities, result.entry.id, "qualities");

  return {
    id: C.personalUtilityProject,
    archetype: requireLiteralString(
      result.payload.archetype,
      "personal-utility",
      result.entry.id,
      "archetype",
    ),
    qualities,
    workPackages: WORK_PACKAGE_SPECS.map((spec) => projectWorkPackage(registry, spec)),
  };
}

function projectWorkPackage(
  registry: JanuaryContentRegistryPort,
  [id, goal, quality, skillIds, references, reasonCode]: WorkPackageSpec,
): JanuaryWorkPackage {
  const result = read(
    registry,
    id,
    "storylet",
    "work-package",
    ["contentType", "goal", "quality"],
    references,
  );
  return {
    id,
    goal: requireLiteralString(result.payload.goal, goal, result.entry.id, "goal"),
    quality: requireLiteralString(result.payload.quality, quality, result.entry.id, "quality"),
    skillIds,
    reasonCode,
  };
}

function projectSituation(registry: JanuaryContentRegistryPort): JanuarySituationDefinition {
  const result = read(
    registry,
    C.firstBugSituation,
    "storylet",
    "professional-situation",
    ["contentType", "issueType"],
    [C.logicErrorEvent, C.syntaxErrorEvent],
  );
  return {
    id: C.firstBugSituation,
    issueType: requireLiteralString(
      result.payload.issueType,
      "first-bug",
      result.entry.id,
      "issueType",
    ),
    eventIds: [C.logicErrorEvent, C.syntaxErrorEvent],
  };
}

function projectEvent(
  registry: JanuaryContentRegistryPort,
  [id, eventType, references, reasonCode]: EventSpec,
): JanuaryEventDefinition {
  const result = read(
    registry,
    id,
    "event",
    "event",
    ["contentType", "eventType"],
    references,
  );
  return {
    id,
    eventType: requireLiteralString(
      result.payload.eventType,
      eventType,
      result.entry.id,
      "eventType",
    ),
    reasonCode,
  };
}

function read(
  registry: JanuaryContentRegistryPort,
  id: string,
  kind: JanuaryContentEntryPort["kind"],
  contentType: string,
  keys: readonly string[],
  references: readonly string[],
): ReadResult {
  const entry = requireJanuaryEntry(registry, id, kind);
  requireJanuaryReferences(entry, references);
  return {
    entry,
    payload: requireJanuaryPayload(entry, contentType, keys),
  };
}

type ReadResult = Readonly<{
  entry: JanuaryContentEntryPort;
  payload: JanuaryPayloadObject;
}>;

type AccessSpec = readonly [
  id: January1990ContentId,
  route: JanuaryAccessRoute["route"],
  constraint: JanuaryAccessRoute["constraint"],
  references: readonly string[],
  reasonCode: January1990ReasonCode,
];

type SkillSpec = readonly [
  id: January1990ContentId,
  skill: JanuarySkillDefinition["skill"],
  quality: JanuaryQuality,
];

type LearningSpec = readonly [
  id: January1990ContentId,
  activity: JanuaryLearningActivity["activity"],
  practiceMode: JanuaryLearningActivity["practiceMode"],
  references: readonly string[],
  skillIds: readonly January1990ContentId[],
  reasonCode: January1990ReasonCode,
];

type WorkPackageSpec = readonly [
  id: January1990ContentId,
  goal: JanuaryWorkPackage["goal"],
  quality: JanuaryQuality,
  skillIds: readonly January1990ContentId[],
  references: readonly string[],
  reasonCode: January1990ReasonCode,
];

type EventSpec = readonly [
  id: January1990ContentId,
  eventType: JanuaryEventDefinition["eventType"],
  references: readonly string[],
  reasonCode: January1990ReasonCode,
];
