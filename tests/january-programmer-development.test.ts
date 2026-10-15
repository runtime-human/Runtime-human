import { describe, expect, it } from "vitest";

import { projectJanuaryProgrammerDevelopment } from "@runtime-human/game-application";

import { createJanuary1990ResultFixture } from "../apps/desktop/src/january/january-result.fixture";

describe("January programmer development projection", () => {
  it("shows verified practice without claiming mastery or awarding a grade", () => {
    const development = projectJanuaryProgrammerDevelopment(createJanuary1990ResultFixture());

    expect(development.month).toBe("1990-01");
    expect(development.practiceSignals.map((skill) => skill.label)).toEqual([
      "Написание программ",
      "Отладка",
      "Работа с инструментами",
    ]);
    expect(development.knowledge).toMatch(/изменение программы/u);
    expect(development.autonomy).toMatch(/самостоятельного исследования/u);
    expect(development.technology).toContain("GW-BASIC");
    expect(development.gradeAssessment).toBe("not-yet-supported");
    expect(Object.isFrozen(development)).toBe(true);
    expect(Object.isFrozen(development.practiceSignals)).toBe(true);
    expect(development.practiceSignals.every((skill) => Object.isFrozen(skill))).toBe(true);
    expect("xp" in development).toBe(false);
    expect("mastery" in development).toBe(false);
  });

  it("does not equate assistance with independently demonstrated debugging", () => {
    const result = createJanuary1990ResultFixture();
    const assisted = projectJanuaryProgrammerDevelopment({
      ...result,
      programmingOutcome: {
        ...result.programmingOutcome,
        defectResponse: "ask-for-guidance",
      },
    });

    expect(assisted.autonomy).toMatch(/не доказательство самостоятельной отладки/u);
    expect(assisted.nextPractice).toMatch(/без подсказки/u);
    expect(assisted.practiceSignals[1]?.explanation).toMatch(/с подсказкой/u);
  });

  it("does not promote a stronger evidence amount to a grade or mastery score", () => {
    const result = createJanuary1990ResultFixture();
    const enhanced = {
      ...result,
      programmingOutcome: {
        ...result.programmingOutcome,
        evidence: result.programmingOutcome.evidence.map((item) => ({
          ...item,
          amount: item.amount + 1,
        })),
      },
    };

    expect(projectJanuaryProgrammerDevelopment(enhanced)).toEqual(
      projectJanuaryProgrammerDevelopment(result),
    );
  });

  it("refuses malformed results and duplicate evidence rather than inventing skills", () => {
    const result = createJanuary1990ResultFixture();
    expect(() =>
      projectJanuaryProgrammerDevelopment({ ...result, inventedGrade: "Junior" }),
    ).toThrow(TypeError);
    expect(() =>
      projectJanuaryProgrammerDevelopment({
        ...result,
        programmingOutcome: {
          ...result.programmingOutcome,
          evidence: [
            result.programmingOutcome.evidence[0],
            result.programmingOutcome.evidence[0],
          ],
        },
      }),
    ).toThrow(/duplicate skill evidence/u);
  });
});
