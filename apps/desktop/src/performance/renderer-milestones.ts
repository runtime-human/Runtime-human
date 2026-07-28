export type RendererMilestoneName =
  | "app.renderer_bootstrap"
  | "app.react_shell_commit"
  | "app.january_session_ready"
  | "app.first_meaningful_paint";

export type UserTimingMarkPort = Readonly<{
  mark(name: RendererMilestoneName): void;
}>;

export type AnimationFramePort = Readonly<{
  request(callback: () => void): number | null;
  cancel(handle: number): void;
}>;

export type RendererMilestoneRecorder = Readonly<{
  mark(name: RendererMilestoneName): void;
  scheduleFirstMeaningfulPaint(): () => void;
}>;

type PendingFrame = Readonly<{
  token: number;
  handle: number;
}>;

const FIRST_MEANINGFUL_PAINT: RendererMilestoneName = "app.first_meaningful_paint";
const NOOP = () => undefined;

export function createRendererMilestoneRecorder(
  timing: UserTimingMarkPort | null = browserUserTimingPort(),
  frames: AnimationFramePort | null = browserAnimationFramePort(),
): RendererMilestoneRecorder {
  const attempted = new Set<RendererMilestoneName>();
  let nextFrameToken = 0;
  let pendingFrame: PendingFrame | null = null;

  const mark = (name: RendererMilestoneName): void => {
    if (attempted.has(name)) return;
    attempted.add(name);
    try {
      timing?.mark(name);
    } catch {
      // Performance instrumentation is observational and cannot alter application behavior.
    }
  };

  const scheduleFirstMeaningfulPaint = (): (() => void) => {
    if (attempted.has(FIRST_MEANINGFUL_PAINT) || pendingFrame !== null || frames === null) {
      return NOOP;
    }

    nextFrameToken += 1;
    const token = nextFrameToken;
    let callbackRanSynchronously = false;
    try {
      const handle = frames.request(() => {
        const frame = pendingFrame;
        if (frame === null || frame.token !== token) {
          callbackRanSynchronously = true;
          return;
        }
        pendingFrame = null;
        mark(FIRST_MEANINGFUL_PAINT);
      });
      if (handle === null || callbackRanSynchronously) return NOOP;
      pendingFrame = { token, handle };

      return () => {
        const frame = pendingFrame;
        if (frame === null || frame.token !== token) return;
        pendingFrame = null;
        try {
          frames.cancel(frame.handle);
        } catch {
          // Cancellation failures are observational only; a stale callback is ignored by token.
        }
      };
    } catch {
      pendingFrame = null;
      return NOOP;
    }
  };

  return Object.freeze({ mark, scheduleFirstMeaningfulPaint });
}

export const RUNTIME_RENDERER_MILESTONES = createRendererMilestoneRecorder();

function browserUserTimingPort(): UserTimingMarkPort | null {
  if (typeof globalThis.performance?.mark !== "function") return null;
  return {
    mark(name) {
      globalThis.performance.mark(name);
    },
  };
}

function browserAnimationFramePort(): AnimationFramePort | null {
  if (
    typeof globalThis.requestAnimationFrame !== "function" ||
    typeof globalThis.cancelAnimationFrame !== "function"
  ) {
    return null;
  }

  return {
    request(callback) {
      return globalThis.requestAnimationFrame(() => callback());
    },
    cancel(handle) {
      globalThis.cancelAnimationFrame(handle);
    },
  };
}
