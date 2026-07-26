import { DesktopShell, type DesktopNavigationItem } from "../shell/DesktopShell";
import { buildJanuaryScreenModel } from "./january-screen-model";
import type { JanuarySessionChoice, JanuarySessionView } from "./january-session-controller";

export type JanuaryRuntimeScreenProps = Readonly<{
  view: JanuarySessionView;
  busy: boolean;
  onStart(): void;
  onChoose(choice: JanuarySessionChoice): void;
  onRetry(): void;
}>;

const QUALITY_LABELS = {
  clarity: "Ясность",
  correctness: "Корректность",
  reliability: "Надёжность",
} as const;

const QUALITY_MAXIMUMS = {
  clarity: 10,
  correctness: 11,
  reliability: 9,
} as const;

const JANUARY_NAVIGATION = Object.freeze<readonly DesktopNavigationItem[]>([
  Object.freeze({
    kind: "route",
    id: "current-month",
    index: "01",
    label: "Текущий месяц",
    detail: "Январь 1990",
    href: "#current-month",
    current: true,
  }),
  Object.freeze({ kind: "planned", id: "skills", index: "02", label: "Навыки" }),
  Object.freeze({ kind: "planned", id: "relationships", index: "03", label: "Связи" }),
  Object.freeze({ kind: "planned", id: "chronology", index: "04", label: "Хронология" }),
  Object.freeze({ kind: "planned", id: "archive", index: "05", label: "Архив" }),
]);

export function JanuaryRuntimeScreen({
  view,
  busy,
  onStart,
  onChoose,
  onRetry,
}: JanuaryRuntimeScreenProps) {
  const model = buildJanuaryScreenModel(view);

  return (
    <DesktopShell
      breadcrumb="Январь 1990"
      era="Персональные компьютеры"
      navigation={JANUARY_NAVIGATION}
      profile="Локальная карьера"
      status={
        <>
          <span>Автосохранение на каждой границе решения</span>
          <strong>{busy ? "Операция выполняется" : "Состояние сохранено"}</strong>
        </>
      }
    >
      <section
        aria-busy={busy}
        aria-label="Игровой месяц"
        className="january-frame"
        id="current-month"
        role="region"
      >
        <header className="january-header">
          <div>
            <p className="january-brand">Карьера программиста</p>
            <p className="january-era">1990 · Первый месяц</p>
          </div>
          <div aria-label="Локальное детерминированное сохранение" className="january-local-badge">
            <span className="january-local-dot" />
            Локально · детерминированно
          </div>
        </header>

        <div className="january-progress-block">
          <div className="january-progress-copy">
            <span>Прогресс месяца</span>
            <strong>{model.progress}%</strong>
          </div>
          <div
            aria-label={`Прогресс месяца ${model.progress}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={model.progress}
            className="january-progress"
            role="progressbar"
          >
            <span style={{ width: `${model.progress}%` }} />
          </div>
        </div>

        <div className="january-layout">
          <article className={`january-card january-card--${model.tone}`}>
            <div className="january-card-heading">
              <p className="january-eyebrow">{model.eyebrow}</p>
              <span className={`january-tone january-tone--${model.tone}`}>
                {toneLabel(model.tone)}
              </span>
            </div>

            <h1>{model.title}</h1>
            <p className="january-summary">{model.summary}</p>
            {model.detail ? <p className="january-detail">{model.detail}</p> : null}

            {model.choices.length > 0 ? (
              <div aria-label="Варианты решения" className="january-choices" role="group">
                {model.choices.map((choice, index) => (
                  <button
                    className="january-choice"
                    disabled={busy}
                    key={choice.value}
                    onClick={() => onChoose(choice.value)}
                    type="button"
                  >
                    <kbd aria-hidden="true" className="january-choice-index">
                      {String(index + 1).padStart(2, "0")}
                    </kbd>
                    <span className="january-choice-copy">
                      <strong>{choice.label}</strong>
                      <small>{choice.description}</small>
                    </span>
                    <span aria-hidden="true" className="january-choice-arrow">
                      →
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {model.qualityScores ? (
              <div aria-label="Качество первой программы" className="january-quality">
                {Object.entries(model.qualityScores).map(([key, value]) => {
                  const metric = key as keyof typeof QUALITY_LABELS;
                  const label = QUALITY_LABELS[metric];
                  const maximum = QUALITY_MAXIMUMS[metric];
                  const width = Math.round((value / maximum) * 100);
                  return (
                    <div className="january-quality-item" key={key}>
                      <div>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                      <div
                        aria-label={label}
                        aria-valuemax={maximum}
                        aria-valuemin={0}
                        aria-valuenow={value}
                        className="january-quality-track"
                        role="progressbar"
                      >
                        <span style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {model.primaryAction ? (
              <button
                className="january-primary"
                disabled={busy}
                onClick={model.primaryAction.kind === "start" ? onStart : onRetry}
                type="button"
              >
                {busy ? "Сохраняем…" : model.primaryAction.label}
                <span aria-hidden="true">↗</span>
              </button>
            ) : null}
          </article>

          <div className="january-context">
            <aside aria-label="Контекст первой программы" className="january-terminal">
              <div className="january-terminal-bar">
                <span>GW-BASIC · DOS</span>
                <span>JAN 1990</span>
              </div>
              <pre>
                <code>{terminalListing(view.kind)}</code>
              </pre>
              <div className="january-terminal-meta">
                <span>PROJECT</span>
                <strong>PERSONAL_UTILITY.BAS</strong>
                <span>STATE</span>
                <strong>{terminalState(view.kind)}</strong>
              </div>
            </aside>

            <section aria-label="Параметры сессии" className="january-session-panel">
              <div className="january-session-heading">
                <span>Сессия</span>
                <strong>01 / JAN</strong>
              </div>
              <dl>
                <div>
                  <dt>Среда</dt>
                  <dd>GW-BASIC / DOS</dd>
                </div>
                <div>
                  <dt>Сохранение</dt>
                  <dd>Автоматическое</dd>
                </div>
                <div>
                  <dt>Состояние</dt>
                  <dd>{terminalState(view.kind)}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </section>
    </DesktopShell>
  );
}

function toneLabel(tone: ReturnType<typeof buildJanuaryScreenModel>["tone"]): string {
  switch (tone) {
    case "neutral":
      return "Сценарий";
    case "decision":
      return "Решение";
    case "success":
      return "Результат";
    case "warning":
      return "Проверка";
    case "error":
      return "Ошибка";
  }
}

function terminalListing(kind: JanuarySessionView["kind"]): string {
  switch (kind) {
    case "loading":
      return '10 PRINT "LOADING CONTENT..."\n20 GOTO 10';
    case "idle":
      return '10 INPUT "NAME"; N$\n20 PRINT "HELLO, "; N$\n30 END';
    case "access-decision":
      return "10 REM FIND A COMPUTER\n20 INPUT ACCESS$\n30 GOSUB 100";
    case "learning-decision":
      return "10 READ A, B\n20 PRINT A + B\n30 DATA 7, 5";
    case "defect-decision":
      return '10 INPUT X\n20 IF X > 0 THEN 40\n30 PRINT "?ERROR"\n40 END';
    case "committed":
      return '10 PRINT "PROGRAM RUNS"\n20 PRINT "JANUARY COMPLETE"\n30 END';
    case "terminal":
    case "blocked":
    case "rejected":
      return '10 PRINT "SAFE STOP"\n20 REM SAVE NOT CHANGED\n30 END';
  }
}

function terminalState(kind: JanuarySessionView["kind"]): string {
  switch (kind) {
    case "loading":
      return "LOADING";
    case "idle":
      return "READY";
    case "access-decision":
    case "learning-decision":
    case "defect-decision":
      return "WAITING_INPUT";
    case "committed":
      return "COMMITTED";
    case "terminal":
      return "TERMINAL";
    case "blocked":
      return "BLOCKED";
    case "rejected":
      return "REJECTED";
  }
}
