import { RuntimeDesktop } from "./RuntimeDesktop";
import { useJanuarySession } from "./january/use-january-session";
import { useDesktopRoute } from "./routing/use-desktop-route";

export function App() {
  const session = useJanuarySession();
  const routing = useDesktopRoute();

  return <RuntimeDesktop navigate={routing.navigate} route={routing.route} session={session} />;
}
