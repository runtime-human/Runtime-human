/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseSaveId, parseSaveRevision } from "@runtime-human/game-schema";

import {
  createRendererMilestoneRecorder,
  type AnimationFramePort,
} from "../apps/desktop/src/performance/renderer-milestones";

const sessionFactory = vi.hoisted(() => vi.fn());

vi.mock("../apps/desktop/src/january/create-desktop-january-session", () => ({
  getDesktopJanuarySession: sessionFactory,
}));

import { App } from "../apps/desktop/src/App";

function createFrames(): Readonly<{
  port: AnimationFramePort;
  callbacks: Map<number, () => void>;
}> {
  let sequence = 0;
  const callbacks = new Map<number, () => void>();
  return {
    callbacks,
    port: {
      request(callback) {
        sequence += 1;
        callbacks.set(sequence, callback);
        return sequence;
      },
      cancel(handle) {
        callbacks.delete(handle);
      },
    },
  };
}

describe("App renderer milestones", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    sessionFactory.mockReset();
  });

  it("marks the committed shell, successful January readiness and frame-boundary FMP", async () => {
    const idleView = {
      kind: "idle" as const,
      saveId: parseSaveId("renderer-milestone-save"),
      saveRevision: parseSaveRevision(0),
    };
    sessionFactory.mockResolvedValue({
      get view() {
        return idleView;
      },
      load: vi.fn(async () => idleView),
      start: vi.fn(async () => idleView),
      choose: vi.fn(async () => idleView),
      retry: vi.fn(async () => idleView),
    });

    const marks: string[] = [];
    const frames = createFrames();
    const milestones = createRendererMilestoneRecorder(
      {
        mark(name) {
          marks.push(name);
        },
      },
      frames.port,
    );

    render(<App rendererMilestones={milestones} />);

    expect(await screen.findByRole("heading", { name: "Обзор карьеры" })).toBeInTheDocument();
    await waitFor(() => {
      expect(marks).toContain("app.react_shell_commit");
      expect(marks).toContain("app.january_session_ready");
      expect(frames.callbacks.size).toBe(1);
    });
    expect(marks).not.toContain("app.first_meaningful_paint");

    frames.callbacks.values().next().value?.();

    expect(marks).toContain("app.first_meaningful_paint");
  });

  it("does not mark January readiness or FMP when desktop bootstrap rejects", async () => {
    sessionFactory.mockRejectedValue(new Error("bootstrap failed"));
    const marks: string[] = [];
    const frames = createFrames();
    const milestones = createRendererMilestoneRecorder(
      {
        mark(name) {
          marks.push(name);
        },
      },
      frames.port,
    );

    render(<App rendererMilestones={milestones} />);

    expect(await screen.findByText("bootstrap failed")).toBeInTheDocument();
    expect(marks).toContain("app.react_shell_commit");
    expect(marks).not.toContain("app.january_session_ready");
    expect(marks).not.toContain("app.first_meaningful_paint");
    expect(frames.callbacks.size).toBe(0);
  });
});
