import {
  JANUARY_1990_CONTENT_IDS as C,
  JANUARY_1990_REASON_CODES as R,
  JANUARY_1990_REQUIRED_CHUNK_IDS,
  type January1990ContentContext,
  type JanuaryAccessRoute,
  type JanuaryEventDefinition,
  type JanuaryLearningActivity,
  type JanuaryProjectDefinition,
  type JanuarySituationDefinition,
  type JanuarySkillDefinition,
  type JanuaryTechnologyContext,
} from "@runtime-human/game-core";

import type { JanuaryContentEntryPort, JanuaryContentRegistryPort } from "./january-content-registry-port";
import {
  deepFreezeJanuary,
  requireJanuaryEntry,
  requireJanuaryPayload,
  requireJanuaryReferences,
  requireLiteralString,
  requireLiteralStringArray,
  type JanuaryPayloadObject,
} from "./january-payload-readers";

export function projectJanuary1990Content(
  registry: JanuaryContentRegistryPort,
): January1990ContentContext {
  const context = {
    schemaVersion: "january-1990-content-context-v1",
    month: "1990-01",
    contentFingerprint: registry.contentFingerprint,
    requiredChunkIds: JANUARY_1990_REQUIRED_CHUNK_IDS,
    technology: projectTechnology(registry),
    accessRoutes: projectAccessRoutes(registry),
    skills: projectSkills(registry),
    learningActivities: projectLearningActivities(registry),
    project: projectProject(registry),
    situation: projectSituation(registry),
    events: projectEvents(registry),
  } as const satisfies January1990ContentContext;

  return deepFreezeJanuary(context);
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

  requireLiteralString(technology.payload.familyId, C.basicTechnologyFamily, technology.entry.id, "familyId");
  requireLiteralString(band.payload.technologyId, C.gwBasicTechnology, band.entry.id, "technologyId");
  requireLiteralString(toolchain.payload.technologyId, C.gwBasicTechnology, toolchain.entry.id, "technologyId");

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
    platform: requireLiteralString(platform.payload.platform, "dos-pc", platform.entry.id, "platform"),
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

function projectAccessRoutes(registry: JanuaryContentRegistryPort): readonly JanuaryAccessRoute[] {
  const home = read(
    registry,
    C.homePcAccess,
    "reference",
    "local-tech-availability",
    ["accessRoute", "constraint", "contentType"],
    [C.dosPcPlatform, C.gwBasicInterpreterToolchain],
  );
  const school = read(
    registry,
    C.sharedSchoolPcAccess,
    "reference",
    "local-tech-availability",
    ["accessRoute", "constraint", "contentType"],
    [C.offlineManualsEcosystem, C.dosPcPlatform, C.gwBasicInterpreterToolchain],
  );
  return [
    {
      id: C.homePcAccess,
      route: requireLiteralString(home.payload.accessRoute, "home-pc", home.entry.id, "accessRoute"),
      constraint: requireLiteralString(
        home.payload.constraint,
        "household-availability",
        home.entry.id,
        "constraint",
      ),
      reasonCode: R.homePcAccess,
    },
    {
      id: C.sharedSchoolPcAccess,
      route: requireLiteralString(
        school.payload.accessRoute,
        "shared-school-pc",
        school.entry.id,
        "accessRoute",
      ),
      constraint: requireLiteralString(
        school.payload.constraint,
        "limited-schedule",
        school.entry.id,
        "constraint",
      ),
      reasonCode: R.sharedSchoolPcAccess,
    },
  ];
}

function projectSkills(registry: JanuaryContentRegistryPort): readonly JanuarySkillDefinition[] {
  return [
    projectSkill(registry, C.debuggingSkill, "debugging", "correctness"),
    projectSkill(registry, C.problemDecompositionSkill, "problem-decomposition", "clarity"),
    projectSkill(registry, C.programReadingSkill, "program-reading", "clarity"),
    projectSkill(registry, C.programWritingSkill, "program-writing", "correctness"),
    projectSkill(registry, C.toolUseSkill, "tool-use", "reliability"),
  ];
}

function projectSkill(
  registry: JanuaryContentRegistryPort,
  id: JanuarySkillDefinition["id"],
  skill: JanuarySkillDefinition["skill"],
  quality: JanuarySkillDefinition["quality"],
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

function projectLearningActivities(
  registry: JanuaryContentRegistryPort,
): readonly JanuaryLearningActivity[] {
  const first = read(
    registry,
    C.firstListingActivity,
    "storylet",
    "learning-activity",
    ["activity", "contentType", "practiceMode"],
    [
      C.modifyListingActivity,
      C.personalUtilityProject,
      C.problemDecompositionSkill,
      C.programReadingSkill,
      C.programWritingSkill,
      C.toolUseSkill,
    ],
  );
  const modify = read(
    registry,
    C.modifyListingActivity,
    "storylet",
    "learning-activity",
    ["activity", "contentType", "practiceMode"],
    [C.debuggingSkill, C.validationFixWorkPackage],
  );
  return [
    {
      id: C.firstListingActivity,
      activity: requireLiteralString(first.payload.activity, "first-listing", first.entry.id, "activity"),
      practiceMode: requireLiteralString(
        first.payload.practiceMode,
        "read-and-run",
        first.entry.id,
        "practiceMode",
      ),
      skillIds: [
        C.problemDecompositionSkill,
        C.programReadingSkill,
        C.programWritingSkill,
        C.toolUseSkill,
      ],
      reasonCode: R.readAndRunLearning,
    },
    {
      id: C.modifyListingActivity,
      activity: requireLiteralString(
        modify.payload.activity,
        "modify-listing",
        modify.entry.id,
        "activity",
      ),
      practiceMode: requireLiteralString(
        modify.payload.practiceMode,
        "edit-and-debug",
        modify.entry.id,
        "practiceMode",
      ),
      skillIds: [C.debuggingSkill],
      reasonCode: R.editAndDebugLearning,
    },
  ];
}

function projectProject(registry: JanuaryContentRegistryPort): JanuaryProjectDefinition {
  const project = read(
    registry,
    C.personalUtilityProject,
    "storylet",
    "project-archetype",
    ["archetype", "contentType", "qualities"],
    [C.inputOutputWorkPackage, C.validationFixWorkPackage],
  );
  requireLiteralStringArray(
    project.payload.qualities,
    ["clarity", "correctness", "reliability"] as const,
    project.entry.id,
    "qualities",
  );
  return {
    id: C.personalUtilityProject,
    archetype: requireLiteralString(
      project.payload.archetype,
      "personal-utility",
      project.entry.id,
      "archetype",
    ),
    qualities: ["clarity", "correctness", "reliability"],
    workPackages: [
      projectWorkPackage(
        registry,
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
      ),
      projectWorkPackage(
        registry,
        C.validationFixWorkPackage,
        "validation-fix",
        "reliability",
        [C.debuggingSkill],
        [C.programRunsEvent, C.firstBugSituation, C.debuggingSkill],
        R.validationFixProject,
      ),
    ],
  };
}

function projectWorkPackage(
  registry: JanuaryContentRegistryPort,
  id: JanuaryProjectDefinition["workPackages"][number]["id"],
  goal: JanuaryProjectDefinition["workPackages"][number]["goal"],
  quality: JanuaryProjectDefinition["workPackages"][number]["quality"],
  skillIds: JanuaryProjectDefinition["workPackages"][number]["skillIds"],
  references: readonly string[],
  reasonCode: JanuaryProjectDefinition["workPackages"][number]["reasonCode"],
): JanuaryProjectDefinition["workPackages"][number] {
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
  const situation = read(
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
      situation.payload.issueType,
      "first-bug",
      situation.entry.id,
      "issueType",
    ),
    eventIds: [C.logicErrorEvent, C.syntaxErrorEvent],
  };
}

function projectEvents(registry: JanuaryContentRegistryPort): readonly JanuaryEventDefinition[] {
  return [
    projectEvent(
      registry,
      C.accessWindowEvent,
      "access-window",
      [C.firstListingActivity, C.manualFoundEvent, C.homePcAccess, C.sharedSchoolPcAccess],
      R.accessWindowEvent,
    ),
    projectEvent(registry, C.logicErrorEvent, "logic-error", [C.programRunsEvent], R.logicErrorSituation),
    projectEvent(
      registry,
      C.manualFoundEvent,
      "manual-found",
      [C.offlineManualsEcosystem, C.programReadingSkill],
      R.manualFoundEvent,
    ),
    projectEvent(registry, C.programRunsEvent, "program-runs", [], R.programRunsOutcome),
    projectEvent(
      registry,
      C.syntaxErrorEvent,
      "syntax-error",
      [C.programRunsEvent],
      R.syntaxErrorSituation,
    ),
  ];
}

function projectEvent(
  registry: JanuaryContentRegistryPort,
  id: JanuaryEventDefinition["id"],
  eventType: JanuaryEventDefinition["eventType"],
  references: readonly string[],
  reasonCode: JanuaryEventDefinition["reasonCode"],
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
    eventType: requireLiteralString(result.payload.eventType, eventType, result.entry.id, "eventType"),
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
): Readonly<{ entry: JanuaryContentEntryPort; payload: JanuaryPayloadObject }> {
  const entry = requireJanuaryEntry(registry, id, kind);
  requireJanuaryReferences(entry, references);
  return {
    entry,
    payload: requireJanuaryPayload(entry, contentType, keys),
  };
}
