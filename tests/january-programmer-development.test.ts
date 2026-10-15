import { describe, expect, it } from "vitest";

import { projectJanuaryProgrammerDevelopment } from "@runtime-human/game-application";

import { createJanuary1990ResultFixture } from "../apps/desktop/src/january/january-result.fixture";

describe("January programmer development", () => {
  it("projects three verified practice skills without assigning a grade", () => {
    const result = createJanuary1990ResultFixture();
    const model = projectJanuaryProgrammerDevelopment(result);

    expect(model.month).toBe("1990-01");
    expect(model.practiceSignals).toHaveLength(3);
    expect(model.practiceSignals[0]?.label).toBe("Написание программ");
    expect(model.practiceSignals[1]?.label).toBe("Отладка");
    expect(model.practiceSignals[2]?.label).toBe("Работа с инструментами");
    expect(model.gradeAssessment).toBe("not-yet-supported");
    expect(Object.isFrozen(model.practiceSignals)).toBe(true);
    expect(JSON.stringify(model)).not.toContain('"amount"');
    expect(JSON.stringify(model)).not.toContain('"xp"');
    expect(JSON.stringify(model)).not.toContain('"mastery"');
  });

  it("does not assert autonomous debugging when the player asked for help", () => {
    const result = createJanuary1990ResultFixture();
    const assistedResult = {
      ...result,
      programmingOutcome: {
        ...result.programmingOutcome,
        defectResponse: "ask-for-guidance",
      },
    };
    const model = projectJanuaryProgrammerDevelopment(assistedResult);

    expect(model.autonomy).toMatch(/не доказательство самостоятельной отладки/u);
    expect(model.nextPractice).toMatch(/без подсказки/u);
    expect(model.gradeAssessment).toBe("not-yet-supported");
  });

  it("rejects unsupported committed results", () => {
    expect(() => projectJanuaryProgrammerDevelopment({ schemaVersion: "invented" })).toThrow(
      TypeError,
    );
  });
});
