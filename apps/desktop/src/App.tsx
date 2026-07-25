import { JanuaryRuntimeScreen } from "./january/JanuaryRuntimeScreen";
import { useJanuarySession } from "./january/use-january-session";

export function App() {
  const session = useJanuarySession();

  return (
    <JanuaryRuntimeScreen
      busy={session.busy}
      onChoose={(choice) => void session.choose(choice)}
      onRetry={() => void session.retry()}
      onStart={() => void session.start()}
      view={session.view}
    />
  );
}
