import { JANUARY_1990_QUALITY_SCORE_MAXIMUMS } from "@runtime-human/game-application";

import type { CareerOverviewView } from "./career-overview-model";

export type CareerOverviewScreenProps = Readonly<{
  view: CareerOverviewView;
  onOpenCurrentMonth(): void;
  onRetry(): void;
}>;

const QUALITY_LABELS = Object.freeze({
  clarity: "Ясность",
  correctness: "Корректность",
  reliability: "Надёжность",
} as const);

export function CareerOverviewScreen({
  view,
  onOpenCurrentMonth,
  onRetry,
}: CareerOverviewScreenProps) {
  return (
    <section aria-label="Обзор карьеры" className="career-overview" id="career-overview">
      <article className="career-overview-hero">
        <p className="career-overview-eyebrow">Текущая история</p>
        <h1>Обзор карьеры</h1>
        {renderState(view, onOpenCurrentMonth, onRetry)}
      </article>

      <aside className="career-overview-note" aria-label="Источник данных обзора">
        <span>Источник данных</span>
        <strong>Persisted January projection</strong>
        <p>
          Обзор использует уже загруженное состояние January MonthRun. Он не создаёт второй сеанс и не
          выполняет дополнительный запрос к хранилищу.
        </p>
      </aside>
    </section>
  );
}

function renderState(
  view: CareerOverviewView,
  onOpenCurrentMonth: () => void,
  onRetry: () => void,
) {
  switch (view.kind) {
    case "loading":
      return (
        <div aria-busy="true" className="career-overview-state">
          <h2>Загрузка карьеры</h2>
          <p>Проверяем сохранение и последнюю устойчивую границу января.</p>
        </div>
      );
    case "new-career":
      return (
        <div className="career-overview-state">
          <h2>Карьера готова к началу</h2>
          <p>Первый подтверждённый период ещё не начат. Все решения января будут сохраняться локально.</p>
          <div className="career-overview-facts" aria-label="Состояние новой карьеры">
            <Fact label="Период" value="Январь 1990" />
            <Fact label="Состояние" value="Готов к началу" />
          </div>
          <PrimaryAction label="Открыть январь" onClick={onOpenCurrentMonth} />
        </div>
      );
    case "active-month":
      return (
        <div className="career-overview-state">
          <h2>Январь продолжается</h2>
          <p>Сеанс восстановлен с последней сохранённой границы решения.</p>
          <div className="career-overview-facts" aria-label="Состояние активного месяца">
            <Fact label="Этап" value={stageLabel(view.stage)} />
            <Fact label="Граница" value={`Ревизия ${view.runRevision}`} />
          </div>
          <div className="career-overview-progress-block">
            <div className="career-overview-progress-copy">
              <span>Прогресс января</span>
              <strong>{view.progress}%</strong>
            </div>
            <div
              aria-label={`Прогресс января ${view.progress}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={view.progress}
              className="career-overview-progress"
              role="progressbar"
            >
              <span style={{ width: `${view.progress}%` }} />
            </div>
          </div>
          <PrimaryAction label="Продолжить январь" onClick={onOpenCurrentMonth} />
        </div>
      );
    case "completed-month":
      return (
        <div className="career-overview-state">
          <h2>Январь завершён</h2>
          <p>Результат месяца атомарно записан в сохранение и доступен без повторного выполнения.</p>
          <div className="career-overview-facts" aria-label="Состояние завершённого месяца">
            <Fact label="Период" value="Январь 1990" />
            <Fact label="Сохранение" value={`Ревизия сохранения ${view.saveRevision}`} />
          </div>
          <div aria-label="Качество первой программы" className="career-overview-quality">
            {Object.entries(view.qualityScores).map(([key, value]) => {
              const metric = key as keyof typeof QUALITY_LABELS;
              const maximum = JANUARY_1990_QUALITY_SCORE_MAXIMUMS[metric];
              return (
                <div className="career-overview-quality-item" key={metric}>
                  <div>
                    <span>{QUALITY_LABELS[metric]}</span>
                    <strong>
                      {value} / {maximum}
                    </strong>
                  </div>
                  <div
                    aria-label={QUALITY_LABELS[metric]}
                    aria-valuemax={maximum}
                    aria-valuemin={0}
                    aria-valuenow={value}
                    className="career-overview-quality-track"
                    role="progressbar"
                  >
                    <span style={{ width: `${Math.round((value / maximum) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <PrimaryAction label="Открыть результат января" onClick={onOpenCurrentMonth} />
        </div>
      );
    case "terminal":
      return (
        <div className="career-overview-state career-overview-state--warning">
          <h2>Сеанс остановлен</h2>
          <p>MonthRun завершён без коммита. Сохранение не изображается как новая или пустая карьера.</p>
          <div className="career-overview-facts" aria-label="Терминальное состояние месяца">
            <Fact label="Период" value="Январь 1990" />
            <Fact label="Статус" value={terminalStatusLabel(view.status)} />
          </div>
          <PrimaryAction label="Открыть январь" onClick={onOpenCurrentMonth} />
        </div>
      );
    case "blocked":
      return (
        <div className="career-overview-state career-overview-state--warning">
          <h2>Требуется проверка</h2>
          <p>{view.message}</p>
          <div className="career-overview-facts" aria-label="Причина защитной остановки">
            <Fact label="Причина" value={blockedReasonLabel(view.reason)} />
            <Fact label="Данные" value="Сохранены без изменений" />
          </div>
        </div>
      );
    case "rejected":
      return (
        <div className="career-overview-state career-overview-state--error">
          <h2>{view.retryable ? "Связь прервалась" : "Обзор недоступен"}</h2>
          <p>{view.message}</p>
          <div className="career-overview-facts" aria-label="Отклонённая операция">
            <Fact label="Код" value={view.code} />
            <Fact label="Повтор" value={view.retryable ? "Безопасный повтор доступен" : "Недоступен"} />
          </div>
          {view.retryable ? <PrimaryAction label="Повторить безопасно" onClick={onRetry} /> : null}
        </div>
      );
  }
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PrimaryAction({ label, onClick }: Readonly<{ label: string; onClick(): void }>) {
  return (
    <button className="career-overview-action" onClick={onClick} type="button">
      {label}
      <span aria-hidden="true">→</span>
    </button>
  );
}

function stageLabel(stage: Extract<CareerOverviewView, { kind: "active-month" }>["stage"]): string {
  switch (stage) {
    case "access":
      return "Доступ";
    case "learning":
      return "Практика";
    case "defect":
      return "Отладка";
  }
}

function terminalStatusLabel(
  status: Extract<CareerOverviewView, { kind: "terminal" }>["status"],
): string {
  switch (status) {
    case "failed":
      return "Ошибка выполнения";
    case "incompatible":
      return "Несовместимый checkpoint";
    case "recovery-required":
      return "Требуется восстановление";
    case "abandoned":
      return "Сеанс оставлен";
  }
}

function blockedReasonLabel(
  reason: Extract<CareerOverviewView, { kind: "blocked" }>["reason"],
): string {
  switch (reason) {
    case "recovery":
      return "Хранилище требует восстановления";
    case "incompatible-persistence":
      return "Формат сохранения несовместим";
    case "incompatible-checkpoint":
      return "Контент или правила изменились";
    case "corrupted-checkpoint":
      return "Контрольная точка повреждена";
    case "invalid-result":
      return "Результат месяца имеет неподдерживаемый формат";
  }
}
