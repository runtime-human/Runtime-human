import { FoundationStatus } from "@runtime-human/game-ui";

const checks = [
  { id: "runtime.foundation.workspace.v1", label: "pnpm workspace", state: "ready" },
  { id: "runtime.foundation.ui.v1", label: "React и Storybook", state: "ready" },
  { id: "runtime.foundation.tauri.v1", label: "Tauri shell", state: "ready" },
  { id: "runtime.foundation.gameplay.v1", label: "Игровой месяц", state: "planned" },
] as const;

export function App() {
  return (
    <FoundationStatus
      title="Runtime Human"
      summary="Первый исполняемый scaffold готовит безопасное основание. Игровая симуляция появится только после проверки сборки, границ и восстановления."
      checks={checks}
    />
  );
}
