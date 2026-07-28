import { useCallback, useEffect, useState } from "react";

import { getDesktopJanuarySession } from "./create-desktop-january-session";
import type {
  JanuarySessionChoice,
  JanuarySessionController,
  JanuarySessionView,
} from "./january-session-controller";

export type JanuarySessionState = Readonly<{
  view: JanuarySessionView;
  busy: boolean;
  ready: boolean;
  start(): Promise<void>;
  choose(choice: JanuarySessionChoice): Promise<void>;
  retry(): Promise<void>;
}>;

export function useJanuarySession(): JanuarySessionState {
  const [controller, setController] = useState<JanuarySessionController | null>(null);
  const [view, setView] = useState<JanuarySessionView>({ kind: "loading" });
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void getDesktopJanuarySession()
      .then((session) => {
        if (!active) return;
        setController(session);
        setView(session.view);
        setBusy(false);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setView({
          kind: "rejected",
          code: "DesktopBootstrapFailure",
          message: error instanceof Error ? error.message : "Не удалось запустить игровой сеанс",
          retryable: false,
        });
        setBusy(false);
        setReady(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const execute = useCallback(
    async (operation: (session: JanuarySessionController) => Promise<JanuarySessionView>) => {
      if (controller === null || busy) return;
      setBusy(true);
      const next = await operation(controller);
      setView(next);
      setBusy(false);
    },
    [busy, controller],
  );

  return {
    view,
    busy,
    ready,
    start: () => execute((session) => session.start()),
    choose: (choice) => execute((session) => session.choose(choice)),
    retry: () => execute((session) => session.retry()),
  };
}
