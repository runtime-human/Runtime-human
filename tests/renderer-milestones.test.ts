import { describe, expect, it, vi } from "vitest";

import {
  createRendererMilestoneRecorder,
  type AnimationFramePort,
  type RendererMilestoneName,
  type UserTimingMarkPort,
} from "../apps/desktop/src/performance/renderer-milestones";

function createFrameHarness(): Readonly<{
  port: AnimationFramePort;
  callbacks: Map<number, () => void>;
  cancelled: number[];
}> {
  let sequence = 0;
  const callbacks = new Map<number, () => void>();
  const cancelled: number[] = [];
  return {
    callbacks,
    cancelled,
    port: {
      request(callback) {
        sequence += 1;
        callbacks.set(sequence, callback);
        return sequence;
      },
      cancel(handle) {
        cancelled.push(handle);
        callbacks.delete(handle);
      },
    },
  };
}

describe("renderer milestone recorder", () => {
  it("records each closed milestone at most once", () => {
    const marks: string[] = [];
    const recorder = createRendererMilestoneRecorder({
      mark(name) {
        marks.push(name);
      },
    });

    const milestones: readonly RendererMilestoneName[] = [
      "app.renderer_bootstrap",
      "app.react_shell_commit",
      "app.january_session_ready",
    ];
    for (const milestone of milestones) {
      recorder.mark(milestone);
      recorder.mark(milestone);
    }

    expect(marks).toEqual(milestones);
  });

  it("never lets User Timing failures alter the caller", () => {
    const timing: UserTimingMarkPort = {
      mark() {
        throw new Error("timing unavailable");
      },
    };
    const recorder = createRendererMilestoneRecorder(timing);

    expect(() => recorder.mark("app.renderer_bootstrap")).not.toThrow();
    expect(() => recorder.mark("app.renderer_bootstrap")).not.toThrow();
  });

  it("records first meaningful paint only at the injected frame boundary", () => {
    const marks: string[] = [];
    const frames = createFrameHarness();
    const recorder = createRendererMilestoneRecorder(
      {
        mark(name) {
          marks.push(name);
        },
      },
      frames.port,
    );

    const cancelFirst = recorder.scheduleFirstMeaningfulPaint();
    const cancelDuplicate = recorder.scheduleFirstMeaningfulPaint();

    expect(frames.callbacks.size).toBe(1);
    expect(marks).not.toContain("app.first_meaningful_paint");
    expect(cancelDuplicate).toBeTypeOf("function");

    frames.callbacks.get(1)?.();

    expect(marks).toEqual(["app.first_meaningful_paint"]);
    cancelFirst();
    expect(frames.cancelled).toEqual([]);
    recorder.scheduleFirstMeaningfulPaint();
    expect(frames.callbacks.size).toBe(1);
  });

  it("cancels a pending frame and permits StrictMode-style rescheduling", () => {
    const marks: string[] = [];
    const frames = createFrameHarness();
    const recorder = createRendererMilestoneRecorder(
      {
        mark(name) {
          marks.push(name);
        },
      },
      frames.port,
    );

    const cancel = recorder.scheduleFirstMeaningfulPaint();
    cancel();

    expect(frames.cancelled).toEqual([1]);
    expect(marks).toEqual([]);

    recorder.scheduleFirstMeaningfulPaint();
    expect(frames.callbacks.has(2)).toBe(true);
    frames.callbacks.get(2)?.();
    expect(marks).toEqual(["app.first_meaningful_paint"]);
  });

  it("does not retain an invalid synchronously invoked frame request", () => {
    const timing = { mark: vi.fn() };
    let requests = 0;
    const recorder = createRendererMilestoneRecorder(timing, {
      request(callback) {
        requests += 1;
        callback();
        return requests;
      },
      cancel: vi.fn(),
    });

    recorder.scheduleFirstMeaningfulPaint();
    recorder.scheduleFirstMeaningfulPaint();

    expect(requests).toBe(2);
    expect(timing.mark).not.toHaveBeenCalled();
  });

  it("does not invent FMP when requestAnimationFrame is unavailable", () => {
    const timing = { mark: vi.fn() };
    const recorder = createRendererMilestoneRecorder(timing, null);

    expect(() => recorder.scheduleFirstMeaningfulPaint()).not.toThrow();
    expect(timing.mark).not.toHaveBeenCalled();
  });
});
