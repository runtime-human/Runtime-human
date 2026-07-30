import type { ReactNode } from "react";

import "./sandwich-panel.css";

export type SandwichPanelState = "collapsed" | "summary" | "expanded";

export type SandwichPanelProps = Readonly<{
  id: string;
  title: string;
  state: SandwichPanelState;
  summary?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  onStateChange(state: SandwichPanelState): void;
}>;

export function SandwichPanel({
  id,
  title,
  state,
  summary,
  badge,
  children,
  onStateChange,
}: SandwichPanelProps) {
  const detailId = `${id}-details`;
  const hasSummary = summary !== undefined;
  const showSummary = hasSummary && state !== "collapsed";
  const showDetails = state === "expanded";

  return (
    <section className={`runtime-sandwich-panel runtime-sandwich-panel--${state}`}>
      <button
        aria-controls={showDetails ? detailId : undefined}
        aria-expanded={showDetails}
        className="runtime-sandwich-toggle"
        onClick={() => onStateChange(nextPanelState(state, hasSummary))}
        type="button"
      >
        <span className="runtime-sandwich-title">{title}</span>
        {badge === undefined ? null : (
          <span aria-hidden="true" className="runtime-sandwich-badge">
            {badge}
          </span>
        )}
        <span aria-hidden="true" className="runtime-sandwich-chevron">
          {showDetails ? "−" : "+"}
        </span>
      </button>

      {showSummary ? <div className="runtime-sandwich-summary">{summary}</div> : null}

      {showDetails ? (
        <div aria-label={title} className="runtime-sandwich-details" id={detailId} role="region">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function nextPanelState(state: SandwichPanelState, hasSummary: boolean): SandwichPanelState {
  switch (state) {
    case "collapsed":
      return hasSummary ? "summary" : "expanded";
    case "summary":
      return "expanded";
    case "expanded":
      return hasSummary ? "summary" : "collapsed";
  }
}
