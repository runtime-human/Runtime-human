import type { JanuarySessionView } from "../january/january-session-controller";

export type CareerOverviewPlaceholderProps = Readonly<{
  view: JanuarySessionView;
  onOpenCurrentMonth(): void;
}>;

export function CareerOverviewPlaceholder({
  view,
  onOpenCurrentMonth,
}: CareerOverviewPlaceholderProps) {
  const availability = describeAvailability(view);

  return (
    <section aria-label="Обзор карьеры" className="career-overview" id="career-overview">
      <article className="career-overview-hero">
        <p className="career-overview-eyebrow">Текущая история</p>
        <h1>Обзор карьеры</h1>
        <p className="career-overview-summary">
          Здесь будет собрана подтверждённая история карьеры. Сейчас приложение показывает только
          состояние уже существующего январского сеанса и не придумывает показатели, которых ещё нет
          в сохранении.
        </p>

        <div className="career-overview-current" aria-label="Текущий игровой месяц">
          <div>
            <span>Активный период</span>
            <strong>Январь 1990</strong>
          </div>
          <div>
            <span>Состояние</span>
            <strong>{availability}</strong>
          </div>
        </div>

        <button className="career-overview-action" onClick={onOpenCurrentMonth} type="button">
          Открыть текущий месяц
          <span aria-hidden="true">→</span>
        </button>
      </article>

      <aside className="career-overview-note" aria-label="Граница данных обзора">
        <span>Следующий слой</span>
        <strong>Authoritative Career Overview</strong>
        <p>
          Последний результат, активный MonthRun и карьерная хронология появятся после определения
          application projection в UI-02C.
        </p>
      </aside>
    </section>
  );
}

function describeAvailability(view: JanuarySessionView): string {
  switch (view.kind) {
    case "loading":
      return "Загрузка сеанса";
    case "blocked":
      return "Требуется проверка";
    case "rejected":
      return view.retryable ? "Можно повторить" : "Действие недоступно";
    case "committed":
      return "Месяц завершён";
    case "terminal":
      return "Выполнение остановлено";
    case "idle":
      return "Готов к началу";
    case "access-decision":
    case "learning-decision":
    case "defect-decision":
      return "Есть незавершённое решение";
  }
}
