import { projectJanuaryProgrammerDevelopment } from "@runtime-human/game-application";

export type JanuaryProgrammerDevelopmentPanelProps = Readonly<{
  result: unknown;
}>;

export function JanuaryProgrammerDevelopmentPanel({
  result,
}: JanuaryProgrammerDevelopmentPanelProps) {
  let development: ReturnType<typeof projectJanuaryProgrammerDevelopment>;

  try {
    development = projectJanuaryProgrammerDevelopment(result);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return (
      <section aria-label="Развитие программиста" className="january-progression">
        <h2>Результат обучения недоступен</h2>
        <p>Не удалось проверить данные о приобретённом опыте. Новые навыки не начислены.</p>
      </section>
    );
  }

  return (
    <section aria-label="Развитие программиста" className="january-progression">
      <div className="january-progression-heading">
        <span>Программист · подтверждённая практика</span>
        <h2>Что изменилось после первой программы</h2>
      </div>
      <ul className="january-progression-skills">
        {development.practiceSignals.map((signal) => (
          <li key={signal.skillId}>
            <strong>{signal.label}</strong>
            <span>{signal.explanation}</span>
          </li>
        ))}
      </ul>
      <div className="january-progression-notes">
        <p>
          <strong>Знания:</strong> {development.knowledge}
        </p>
        <p>
          <strong>Самостоятельность:</strong> {development.autonomy}
        </p>
        <p>
          <strong>Технология:</strong> {development.technology}
        </p>
        <p>
          <strong>Следующая практика:</strong> {development.nextPractice}
        </p>
        <p className="january-progression-grade">
          <strong>Профессиональный грейд:</strong> пока не оценивается. Нужны результаты
          самостоятельной работы в нескольких задачах.
        </p>
      </div>
    </section>
  );
}
