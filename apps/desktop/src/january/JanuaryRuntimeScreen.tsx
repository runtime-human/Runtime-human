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

export function JanuaryRuntimeScreen({
  view,
  busy,
  onStart,
  onChoose,
  onRetry,
}: JanuaryRuntimeScreenProps) {
  const model = buildJanuaryScreenModel(view);

  return (
    <main className="january-shell">
      <section className="january-frame" aria-busy={busy}>
        <header className="january-header">
          <div>
            <p className="january-brand">RUNTIME HUMAN</p>
            <p className="january-era">Карьера программиста · 1990-е</p>
          </div>
          <div className="january-local-badge" aria-label="Локальное детерминированное сохранение">
            <span className="january-local-dot" />
            Локально · детерминированно
          </div>
        </header>

        <div className="january-progress" aria-label={`Прогресс месяца ${model.progress}%`}>
          <span style={{ width: `${model.progress}%` }} />
        </div>

        <div className="january-layout">
          <article className={`january-card january-card--${model.tone}`}>
            <p className="january-eyebrow">{model.eyebrow}</p>
            <h1>{model.title}</h1>
            <p className="january-summary">{model.summary}</p>
            {model.detail ? <p className="january-detail">{model.detail}</p> : null}

            {model.choices.length > 0 ? (
              <div className="january-choices" role="group" aria-label="Варианты решения">
                {model.choices.map((choice, index) => (
                  <button
                    className="january-choice"
                    disabled={busy}
                    key={choice.value}
                    onClick={() => onChoose(choice.value)}
                    type="button"
                  >
                    <span className="january-choice-index">0{index + 1}</span>
                    <span>
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
              <div className="january-quality" aria-label="Качество первой программы">
                {Object.entries(model.qualityScores).map(([key, value]) => (
                  <div className="january-quality-item" key={key}>
                    <div>
                      <span>{QUALITY_LABELS[key as keyof typeof QUALITY_LABELS]}</span>
                      <strong>{value}</strong>
                    </div>
                    <div className="january-quality-track">
                      <span style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
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

          <aside className="january-terminal" aria-label="Контекст первой программы">
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
        </div>

        <footer className="january-footer">
          <span>Автосохранение на каждой границе решения</span>
          <span>{busy ? "Операция выполняется" : "Состояние сохранено"}</span>
        </footer>
      </section>
    </main>
  );
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
