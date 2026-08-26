import type { MouseEvent, ReactNode } from "react";

import type { DesktopNavigationItem } from "./desktop-navigation";
import { GameShell } from "./GameShell";

export type { DesktopNavigationItem } from "./desktop-navigation";

export type DesktopShellProps = Readonly<{
  navigation: readonly DesktopNavigationItem[];
  breadcrumb: string;
  era: string;
  profile: string;
  status: ReactNode;
  children: ReactNode;
  onNavigate?(id: string): void;
}>;

export function DesktopShell({
  navigation,
  breadcrumb,
  era,
  profile,
  status,
  children,
  onNavigate,
}: DesktopShellProps) {
  const currentRoute = navigation.find(
    (item): item is Extract<DesktopNavigationItem, { kind: "route" }> =>
      item.kind === "route" && item.current,
  );

  return (
    <GameShell
      bottomDock={
        <div
          aria-label="Состояние сохранения"
          aria-live="polite"
          className="runtime-statusbar"
          role="status"
        >
          {status}
        </div>
      }
      contextRail={
        <div className="runtime-context-summary">
          <div aria-label="Положение в карьере" className="runtime-breadcrumbs">
            <span>Карьера</span>
            <span aria-hidden="true">/</span>
            <strong>{breadcrumb}</strong>
          </div>
          <div className="runtime-era-meta">
            <span>Эпоха</span>
            <strong>{era}</strong>
          </div>
        </div>
      }
      playerRail={
        <div className="runtime-player-summary">
          <span aria-hidden="true" className="runtime-status-dot" />
          <span>
            <small>Профиль</small>
            <strong>{profile}</strong>
          </span>
        </div>
      }
      scene={<div id="runtime-content">{children}</div>}
      topHud={
        <div className="runtime-game-hud">
          <a
            aria-label="Runtime Human — текущий раздел"
            className="runtime-wordmark"
            href={currentRoute?.href ?? "#runtime-content"}
          >
            <span aria-hidden="true" className="runtime-wordmark-mark">
              RH
            </span>
            <span className="runtime-wordmark-copy">
              <strong>Runtime Human</strong>
              <small>Карьера программиста</small>
            </span>
          </a>

          <nav aria-label="Разделы карьеры" className="runtime-navigation">
            {navigation.map((item) =>
              item.kind === "route" ? (
                <a
                  aria-current={item.current ? "page" : undefined}
                  className={`runtime-nav-item${item.current ? " runtime-nav-item--active" : ""}`}
                  href={item.href}
                  key={item.id}
                  onClick={(event) => handleRouteClick(event, item.id, onNavigate)}
                >
                  <span aria-hidden="true" className="runtime-nav-index">
                    {item.index}
                  </span>
                  <span className="runtime-nav-copy">
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </a>
              ) : (
                <span className="runtime-nav-item runtime-nav-item--disabled" key={item.id}>
                  <span aria-hidden="true" className="runtime-nav-index">
                    {item.index}
                  </span>
                  <span aria-disabled="true" className="runtime-nav-label">
                    {item.label}
                  </span>
                  <small className="runtime-nav-soon">Позже</small>
                </span>
              ),
            )}
          </nav>
        </div>
      }
    />
  );
}

function handleRouteClick(
  event: MouseEvent<HTMLAnchorElement>,
  id: string,
  onNavigate: DesktopShellProps["onNavigate"],
): void {
  if (
    onNavigate === undefined ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  onNavigate(id);
}
