import type { ReactNode } from "react";

export type GameShellProps = Readonly<{
  topHud: ReactNode;
  playerRail: ReactNode;
  scene: ReactNode;
  contextRail: ReactNode;
  bottomDock: ReactNode;
}>;

export function GameShell({ topHud, playerRail, scene, contextRail, bottomDock }: GameShellProps) {
  return (
    <div className="runtime-game-shell" data-layout="game-shell">
      <header aria-label="Игровой интерфейс" className="runtime-game-top">
        {topHud}
      </header>
      <aside aria-label="Состояние персонажа" className="runtime-game-player">
        {playerRail}
      </aside>
      <main aria-label="Игровая сцена" className="runtime-game-scene">
        {scene}
      </main>
      <aside aria-label="Контекст игры" className="runtime-game-context">
        {contextRail}
      </aside>
      <section aria-label="Игровой док" className="runtime-game-dock">
        {bottomDock}
      </section>
    </div>
  );
}
