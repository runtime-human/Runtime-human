/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JanuaryProgrammerDevelopmentPanel } from "../apps/desktop/src/january/JanuaryProgrammerDevelopmentPanel";
import { createJanuary1990ResultFixture } from "../apps/desktop/src/january/january-result.fixture";

describe("Programmer development result panel", () => {
  it("shows verified technical skills instead of imaginary XP and grades", () => {
    render(<JanuaryProgrammerDevelopmentPanel result={createJanuary1990ResultFixture()} />);

    expect(screen.getByRole("region", { name: "Развитие программиста" })).toBeInTheDocument();
    expect(screen.getByText("Написание программ")).toBeInTheDocument();
    expect(screen.getByText("Отладка")).toBeInTheDocument();
    expect(screen.getByText("Работа с инструментами")).toBeInTheDocument();
    expect(screen.getByText(/пока не оценивается/u)).toBeInTheDocument();
    expect(screen.queryByText(/XP|Junior 18%/u)).not.toBeInTheDocument();
  });

  it("does not render fabricated progression for incompatible result data", () => {
    render(<JanuaryProgrammerDevelopmentPanel result={{ schemaVersion: "invalid" }} />);

    expect(screen.getByText("Результат обучения недоступен")).toBeInTheDocument();
    expect(screen.queryByText("Написание программ")).not.toBeInTheDocument();
  });
});
