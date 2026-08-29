import type {
  JanuaryBalanceAccessRoute,
  JanuaryBalanceDefectResponse,
  JanuaryBalanceLearningPractice,
} from "@runtime-human/game-core";

export const GAMEPLAY_FIXTURE_SCHEMA_VERSION = "gameplay-fixture-v1" as const;
export const JANUARY_1990_GAMEPLAY_SLICE_ID = "january-1990" as const;

export type GameplayFixtureAnswersV1 = Readonly<{
  access?: JanuaryBalanceAccessRoute | undefined;
  learning?: JanuaryBalanceLearningPractice | undefined;
  response?: JanuaryBalanceDefectResponse | undefined;
}>;

export type GameplayFixtureV1 = Readonly<{
  schemaVersion: typeof GAMEPLAY_FIXTURE_SCHEMA_VERSION;
  id: string;
  slice: typeof JANUARY_1990_GAMEPLAY_SLICE_ID;
  seed: number;
  answers: GameplayFixtureAnswersV1;
}>;

export type GameplayFixtureDiagnosticV1 = Readonly<{
  code: "FIXTURE_INVALID" | "FIXTURE_SLICE_UNSUPPORTED" | "FIXTURE_ANSWER_INVALID";
  message: string;
}>;

export type GameplayFixtureParseResultV1 =
  | Readonly<{ kind: "ok"; fixture: GameplayFixtureV1 }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly GameplayFixtureDiagnosticV1[] }>;

const ACCESS_ROUTES: readonly JanuaryBalanceAccessRoute[] = ["home-pc", "shared-school-pc"];
const LEARNING_PRACTICES: readonly JanuaryBalanceLearningPractice[] = [
  "read-and-run",
  "edit-and-debug",
];
const DEFECT_RESPONSES: readonly JanuaryBalanceDefectResponse[] = [
  "inspect-listing",
  "change-input",
  "ask-for-guidance",
];

export function parseGameplayFixtureV1(value: unknown): GameplayFixtureParseResultV1 {
  const record = closedRecord(value, ["answers", "id", "schemaVersion", "seed", "slice"]);
  if (record === null) {
    return invalid(
      "FIXTURE_INVALID",
      "Gameplay fixture must be a plain object with the closed v1 field set",
    );
  }
  if (record.schemaVersion !== GAMEPLAY_FIXTURE_SCHEMA_VERSION) {
    return invalid(
      "FIXTURE_INVALID",
      `Gameplay fixture schemaVersion must be ${GAMEPLAY_FIXTURE_SCHEMA_VERSION}`,
    );
  }
  if (typeof record.id !== "string" || record.id.length === 0) {
    return invalid("FIXTURE_INVALID", "Gameplay fixture id must be a non-empty string");
  }
  if (record.slice !== JANUARY_1990_GAMEPLAY_SLICE_ID) {
    return invalid(
      "FIXTURE_SLICE_UNSUPPORTED",
      `Gameplay fixture slice must be ${JANUARY_1990_GAMEPLAY_SLICE_ID}; other slices have no materializer yet`,
    );
  }
  if (typeof record.seed !== "number" || !Number.isSafeInteger(record.seed) || record.seed < 0) {
    return invalid("FIXTURE_INVALID", "Gameplay fixture seed must be a non-negative safe integer");
  }
  const answers = parseAnswers(record.answers);
  if (answers.kind === "invalid") return answers;

  return {
    kind: "ok",
    fixture: Object.freeze({
      schemaVersion: GAMEPLAY_FIXTURE_SCHEMA_VERSION,
      id: record.id,
      slice: JANUARY_1990_GAMEPLAY_SLICE_ID,
      seed: record.seed,
      answers: answers.answers,
    }),
  };
}

type AnswersParseResult =
  | Readonly<{ kind: "ok"; answers: GameplayFixtureAnswersV1 }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly GameplayFixtureDiagnosticV1[] }>;

function parseAnswers(value: unknown): AnswersParseResult {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return invalidAnswers("FIXTURE_INVALID", "Gameplay fixture answers must be a plain object");
  }
  const record = value as Readonly<Record<string, unknown>>;
  for (const key of Object.keys(record)) {
    if (key !== "access" && key !== "learning" && key !== "response") {
      return invalidAnswers(
        "FIXTURE_ANSWER_INVALID",
        `Gameplay fixture answers key ${JSON.stringify(key)} is not part of the January intent contract`,
      );
    }
  }
  const access = record.access;
  if (access !== undefined && !ACCESS_ROUTES.some((candidate) => candidate === access)) {
    return invalidAnswers(
      "FIXTURE_ANSWER_INVALID",
      `Gameplay fixture answers.access must be one of ${ACCESS_ROUTES.join(", ")}`,
    );
  }
  const learning = record.learning;
  if (learning !== undefined && !LEARNING_PRACTICES.some((candidate) => candidate === learning)) {
    return invalidAnswers(
      "FIXTURE_ANSWER_INVALID",
      `Gameplay fixture answers.learning must be one of ${LEARNING_PRACTICES.join(", ")}`,
    );
  }
  const response = record.response;
  if (response !== undefined && !DEFECT_RESPONSES.some((candidate) => candidate === response)) {
    return invalidAnswers(
      "FIXTURE_ANSWER_INVALID",
      `Gameplay fixture answers.response must be one of ${DEFECT_RESPONSES.join(", ")}`,
    );
  }
  return {
    kind: "ok",
    answers: Object.freeze({
      ...(access !== undefined ? { access: access as JanuaryBalanceAccessRoute } : {}),
      ...(learning !== undefined ? { learning: learning as JanuaryBalanceLearningPractice } : {}),
      ...(response !== undefined ? { response: response as JanuaryBalanceDefectResponse } : {}),
    }),
  };
}

function closedRecord(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return null;
  }
  const record = value as Readonly<Record<string, unknown>>;
  const actualKeys = Object.keys(record).toSorted();
  const approvedKeys = [...expectedKeys].toSorted();
  if (
    actualKeys.length !== approvedKeys.length ||
    !actualKeys.every((key, index) => key === approvedKeys[index])
  ) {
    return null;
  }
  return record;
}

function invalid(
  code: GameplayFixtureDiagnosticV1["code"],
  message: string,
): { kind: "invalid"; diagnostics: readonly GameplayFixtureDiagnosticV1[] } {
  return { kind: "invalid", diagnostics: [{ code, message }] };
}

function invalidAnswers(
  code: GameplayFixtureDiagnosticV1["code"],
  message: string,
): { kind: "invalid"; diagnostics: readonly GameplayFixtureDiagnosticV1[] } {
  return { kind: "invalid", diagnostics: [{ code, message }] };
}
