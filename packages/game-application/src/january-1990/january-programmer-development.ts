import { JANUARY_1990_CONTENT_IDS, parseJanuary1990Result } from "@runtime-human/game-core";

export type JanuaryProgrammerPracticeSignal = Readonly<{
  skillId: string;
  label: string;
  explanation: string;
}>;

/**
 * A read-only explanation of one verified January provider outcome.
 *
 * Evidence amounts are not XP, skill mastery, fluency, readiness, or an awarded
 * professional grade. Those require a separate versioned Progression Core and
 * multi-context professional history (ADR-013).
 */
export type JanuaryProgrammerDevelopment = Readonly<{
  month: "1990-01";
  practiceSignals: readonly JanuaryProgrammerPracticeSignal[];
  knowledge: string;
  autonomy: string;
  technology: string;
  nextPractice: string;
  gradeAssessment: "not-yet-supported";
}>;

export function projectJanuaryProgrammerDevelopment(
  committedResult: unknown,
): JanuaryProgrammerDevelopment {
  const outcome = parseJanuary1990Result(committedResult).programmingOutcome;
  const skillIds = new Set<string>();

  for (const evidence of outcome.evidence) {
    if (skillIds.has(evidence.skillId)) {
      throw new TypeError("January result has duplicate skill evidence");
    }
    skillIds.add(evidence.skillId);
  }

  const practiceSignals: JanuaryProgrammerPracticeSignal[] = [];

  if (skillIds.has(JANUARY_1990_CONTENT_IDS.programWritingSkill)) {
    practiceSignals.push(
      Object.freeze({
        skillId: JANUARY_1990_CONTENT_IDS.programWritingSkill,
        label: "Написание программ",
        explanation:
          outcome.learningPractice === "edit-and-debug"
            ? "Изменял и отлаживал листинг программы."
            : "Разбирал и запускал готовый листинг.",
      }),
    );
  }

  if (skillIds.has(JANUARY_1990_CONTENT_IDS.debuggingSkill)) {
    const explanations = {
      "inspect-listing": "Проверял строки программы в поисках причины ошибки.",
      "change-input": "Проверял поведение программы на других входных данных.",
      "ask-for-guidance": "Разбирал ошибку с подсказкой; самостоятельное решение не подтверждено.",
    } as const;
    practiceSignals.push(
      Object.freeze({
        skillId: JANUARY_1990_CONTENT_IDS.debuggingSkill,
        label: "Отладка",
        explanation: explanations[outcome.defectResponse],
      }),
    );
  }

  if (skillIds.has(JANUARY_1990_CONTENT_IDS.toolUseSkill)) {
    practiceSignals.push(
      Object.freeze({
        skillId: JANUARY_1990_CONTENT_IDS.toolUseSkill,
        label: "Работа с инструментами",
        explanation:
          outcome.accessRoute === "home-pc"
            ? "Практиковался на доступном домашнем компьютере."
            : "Практиковался за общим школьным компьютером.",
      }),
    );
  }

  const knowledge =
    outcome.learningPractice === "edit-and-debug"
      ? "Изучал не только запуск, но и изменение программы."
      : "Изучал чтение и запуск готового примера; перенос знаний ещё не проверен.";
  const autonomy =
    outcome.defectResponse === "ask-for-guidance"
      ? "При исправлении ошибки потребовалась помощь. Это опыт обучения, но не доказательство самостоятельной отладки."
      : "Выбран способ самостоятельного исследования ошибки. Устойчивую способность нужно подтвердить в другой задаче.";
  const nextPractice =
    outcome.defectResponse === "ask-for-guidance"
      ? "Повторить похожую отладку без подсказки."
      : outcome.learningPractice === "read-and-run"
        ? "Самостоятельно изменить пример и проверить результат."
        : "Перенести приём решения на другую задачу без повторения того же листинга.";

  return Object.freeze({
    month: "1990-01",
    practiceSignals: Object.freeze(practiceSignals),
    knowledge,
    autonomy,
    technology: "Практический контекст: GW-BASIC на DOS. Уровень владения ещё не оценён.",
    nextPractice,
    gradeAssessment: "not-yet-supported",
  });
}
