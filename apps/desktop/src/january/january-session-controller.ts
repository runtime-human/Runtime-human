import {
  projectJanuary1990RuntimeView,
  type January1990Runtime,
  type January1990RuntimeView,
} from "@runtime-human/game-application";
import { fingerprint } from "@runtime-human/game-core";
import {
  parseDecisionId,
  parseRequestId,
  type AuthoritativeJsonValue,
  type DecisionId,
  type MonthRunId,
  type SaveId,
} from "@runtime-human/game-schema";

export type JanuarySessionChoice =
  | "home-pc"
  | "shared-school-pc"
  | "read-and-run"
  | "edit-and-debug"
  | "inspect-listing"
  | "change-input"
  | "ask-for-guidance";

export type JanuarySessionView = January1990RuntimeView | Readonly<{ kind: "loading" }>;

export type CreateJanuarySessionControllerInput = Readonly<{
  runtime: January1990Runtime;
  saveId: SaveId;
  runId: MonthRunId;
  seed: bigint;
}>;

export type JanuarySessionController = Readonly<{
  get view(): JanuarySessionView;
  load(): Promise<JanuarySessionView>;
  start(): Promise<JanuarySessionView>;
  choose(choice: JanuarySessionChoice): Promise<JanuarySessionView>;
  retry(): Promise<JanuarySessionView>;
}>;

export function createJanuarySessionController(
  input: CreateJanuarySessionControllerInput,
): JanuarySessionController {
  let view: JanuarySessionView = Object.freeze({ kind: "loading" });

  async function apply(operation: () => ReturnType<typeof input.runtime.load>) {
    try {
      const result = await operation();
      view = projectJanuary1990RuntimeView(result);
    } catch (error) {
      view = Object.freeze({
        kind: "rejected",
        code: "DesktopSessionFailure",
        message: error instanceof Error ? error.message : "Неизвестная ошибка игрового сеанса",
        retryable: false,
      });
    }
    return view;
  }

  return Object.freeze({
    get view() {
      return view;
    },
    load() {
      return apply(() => input.runtime.load(input.saveId));
    },
    start() {
      const current = view;
      if (current.kind !== "idle" || current.saveRevision === null) {
        return Promise.resolve(
          rejectInvalidAction("Начать январь можно только из начального состояния"),
        );
      }
      const saveRevision = current.saveRevision;
      return apply(() =>
        input.runtime.begin({
          requestId: requestId("begin", input, saveRevision, null),
          saveId: input.saveId,
          expectedSaveRevision: saveRevision,
          runId: input.runId,
          seed: input.seed,
        }),
      );
    },
    choose(choice) {
      const current = view;
      if (!isDecisionView(current)) {
        return Promise.resolve(rejectInvalidAction("Сейчас нет решения, ожидающего ответа"));
      }
      const answer = answerFor(current.kind, choice);
      if (answer === null) {
        return Promise.resolve(
          rejectInvalidAction("Выбранный ответ не относится к текущему решению"),
        );
      }
      return apply(() =>
        input.runtime.resume({
          requestId: requestId("resume", input, current.runRevision, choice),
          saveId: input.saveId,
          runId: input.runId,
          expectedRunRevision: current.runRevision,
          decisionId: decisionIdFor(current.kind),
          answer,
        }),
      );
    },
    retry() {
      return apply(() => input.runtime.retry());
    },
  });

  function rejectInvalidAction(message: string): JanuarySessionView {
    view = Object.freeze({
      kind: "rejected",
      code: "InvalidDesktopAction",
      message,
      retryable: false,
    });
    return view;
  }
}

function isDecisionView(
  view: JanuarySessionView,
): view is Extract<
  January1990RuntimeView,
  { kind: "access-decision" | "learning-decision" | "defect-decision" }
> {
  return (
    view.kind === "access-decision" ||
    view.kind === "learning-decision" ||
    view.kind === "defect-decision"
  );
}

function decisionIdFor(
  kind: "access-decision" | "learning-decision" | "defect-decision",
): DecisionId {
  switch (kind) {
    case "access-decision":
      return parseDecisionId("january-1990/access");
    case "learning-decision":
      return parseDecisionId("january-1990/learning");
    case "defect-decision":
      return parseDecisionId("january-1990/defect");
  }
}

function answerFor(
  kind: "access-decision" | "learning-decision" | "defect-decision",
  choice: JanuarySessionChoice,
): AuthoritativeJsonValue | null {
  switch (kind) {
    case "access-decision":
      return choice === "home-pc" || choice === "shared-school-pc"
        ? { schemaVersion: "january-access-answer-v1", route: choice }
        : null;
    case "learning-decision":
      return choice === "read-and-run" || choice === "edit-and-debug"
        ? { schemaVersion: "january-learning-answer-v1", practice: choice }
        : null;
    case "defect-decision":
      return choice === "inspect-listing" ||
        choice === "change-input" ||
        choice === "ask-for-guidance"
        ? { schemaVersion: "january-defect-answer-v1", response: choice }
        : null;
  }
}

function requestId(
  stage: "begin" | "resume",
  input: CreateJanuarySessionControllerInput,
  revision: number,
  choice: JanuarySessionChoice | null,
) {
  return parseRequestId(
    fingerprint("january-1990-desktop-request-v1", {
      stage,
      saveId: input.saveId,
      runId: input.runId,
      revision,
      choice,
    }),
  );
}
