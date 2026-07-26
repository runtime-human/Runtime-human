import type { ReactNode } from "react";

import type { DesktopNavigationItem } from "./desktop-navigation";

export type { DesktopNavigationItem } from "./desktop-navigation";

export type DesktopShellProps = Readonly<{
  navigation: readonly DesktopNavigationItem[];
  breadcrumb: string;
  era: string;
  profile: string;
  status: ReactNode;
  children: ReactNode;
}>;

export function DesktopShell({
  navigation,
  breadcrumb,
  era,
  profile,
  status,
  children,
}: DesktopShellProps) {
  const currentRoute = navigation.find(
    (item): item is Extract<DesktopNavigationItem, { kind: "route" }> =>
      item.kind === "route" && item.current,
  );

  return (
    <main className="runtime-shell">
      <aside className="runtime-sidebar">
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

        <div className="runtime-sidebar-meta">
          <span aria-hidden="true" className="runtime-status-dot" />
          <span>
            <small>Профиль</small>
            <strong>{profile}</strong>
          </span>
        </div>
      </aside>

      <section className="runtime-stage">
        <header className="runtime-topbar">
          <div aria-label="Положение в карьере" className="runtime-breadcrumbs">
            <span>Карьера</span>
            <span aria-hidden="true">/</span>
            <strong>{breadcrumb}</strong>
          </div>
          <div className="runtime-era-meta">
            <span>Эпоха</span>
            <strong>{era}</strong>
          </div>
        </header>

        <div id="runtime-content">{children}</div>

        <footer
          aria-label="Состояние сохранения"
          aria-live="polite"
          className="runtime-statusbar"
          role="status"
        >
          {status}
        </footer>
      </section>
    </main>
  );
}
