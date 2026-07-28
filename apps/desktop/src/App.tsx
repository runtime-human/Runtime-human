import { useEffect } from "react";

import { RuntimeDesktop } from "./RuntimeDesktop";
import { useJanuarySession } from "./january/use-january-session";
import {
  RUNTIME_RENDERER_MILESTONES,
  type RendererMilestoneRecorder,
} from "./performance/renderer-milestones";
import { useDesktopRoute } from "./routing/use-desktop-route";

export type AppProps = Readonly<{
  rendererMilestones?: RendererMilestoneRecorder;
}>;

export function App({
  rendererMilestones = RUNTIME_RENDERER_MILESTONES,
}: AppProps = {}) {
  const session = useJanuarySession();
  const routing = useDesktopRoute();

  useEffect(() => {
    rendererMilestones.mark("app.react_shell_commit");
  }, [rendererMilestones]);

  useEffect(() => {
    if (!session.ready) return undefined;
    rendererMilestones.mark("app.january_session_ready");
    return rendererMilestones.scheduleFirstMeaningfulPaint();
  }, [rendererMilestones, session.ready]);

  return <RuntimeDesktop navigate={routing.navigate} route={routing.route} session={session} />;
}
