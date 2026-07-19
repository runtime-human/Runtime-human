import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FoundationStatus } from "@runtime-human/game-ui";
import {
  foundationLongRussianFixture,
  foundationReadyFixture,
} from "@runtime-human/game-ui-fixtures";

describe("FoundationStatus", () => {
  it("renders a semantic status summary", () => {
    render(<FoundationStatus {...foundationReadyFixture} />);

    expect(screen.getByRole("heading", { name: foundationReadyFixture.title })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Состояние Foundation" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(foundationReadyFixture.checks.length);
    expect(screen.getByText("Готово")).toBeInTheDocument();
    expect(screen.getByText("Запланировано")).toBeInTheDocument();
  });

  it("keeps long Russian copy intact", () => {
    render(<FoundationStatus {...foundationLongRussianFixture} />);

    expect(screen.getByText(foundationLongRussianFixture.summary)).toBeInTheDocument();
    expect(screen.getByText(foundationLongRussianFixture.checks[0].label)).toBeInTheDocument();
  });
});
