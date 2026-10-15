import type { JanuarySessionView } from "./january-session-controller";

/**
 * Truthful save-status projection for the desktop shell.
 *
 * `busy === false` is never evidence of persistence. A "confirmed" status is
 * produced only when the current view was projected from a parsed Rust
 * persistence response and therefore carries a durable revision:
 * `idle.saveRevision`, `*-decision.runRevision` or `committed.saveRevision`.
 *
 * Controller-local rejections (`InvalidDesktopAction`, `DesktopSessionFailure`,
 * `DesktopBootstrapFailure`) replace the view, so the durable state is unknown
 * from the view alone; they stay `not-confirmed` on purpose.
 */
export type JanuarySaveStatus =
  | Readonly<{ kind: "checking" }>
  | Readonly<{ kind: "writing" }>
  | Readonly<{ kind: "confirmed"; scope: "save" | "run"; revision: number }>
  | Readonly<{ kind: "not-created" }>
  | Readonly<{ kind: "retry-required" }>
  | Readonly<{ kind: "not-confirmed" }>
  | Readonly<{ kind: "attention" }>;

export type JanuarySaveStatusKind = JanuarySaveStatus["kind"];

export function projectJanuarySaveStatus(
  view: JanuarySessionView,
  busy: boolean,
): JanuarySaveStatus {
  if (busy) {
    return view.kind === "loading" ? { kind: "checking" } : { kind: "writing" };
  }

  switch (view.kind) {
    case "loading":
      // Not busy yet nothing was loaded: nothing is confirmed.
      return { kind: "not-confirmed" };
    case "idle":
      return view.saveRevision === null
        ? { kind: "not-created" }
        : { kind: "confirmed", scope: "save", revision: view.saveRevision };
    case "access-decision":
    case "learning-decision":
    case "defect-decision":
      return { kind: "confirmed", scope: "run", revision: view.runRevision };
    case "committed":
      return { kind: "confirmed", scope: "save", revision: view.saveRevision };
    case "terminal":
    case "blocked":
      return { kind: "attention" };
    case "rejected":
      return view.retryable ? { kind: "retry-required" } : { kind: "not-confirmed" };
    default:
      return assertNever(view);
  }
}

export function januarySaveStatusLabel(status: JanuarySaveStatus): string {
  switch (status.kind) {
    case "checking":
      return "Проверяем сохранение…";
    case "writing":
      return "Сохраняем…";
    case "confirmed":
      return "Сохранено локально";
    case "not-created":
      return "Сохранение ещё не создано";
    case "retry-required":
      return "Сохранение не подтверждено · можно повторить";
    case "not-confirmed":
      return "Сохранение не подтверждено";
    case "attention":
      return "Сохранение требует внимания";
    default:
      return assertNever(status);
  }
}

/** Technical detail kept out of the visible label; exposed as a tooltip only. */
export function januarySaveStatusDetail(status: JanuarySaveStatus): string | undefined {
  if (status.kind !== "confirmed") return undefined;
  return status.scope === "save"
    ? `Версия сохранения: ${status.revision}`
    : `Версия текущего хода: ${status.revision}`;
}

function assertNever(value: never): never {
  throw new TypeError(`Unhandled save status input: ${JSON.stringify(value)}`);
}
