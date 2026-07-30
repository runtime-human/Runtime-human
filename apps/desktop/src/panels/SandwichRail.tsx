import { useEffect, useState, type ReactNode } from "react";

import {
  SandwichPanel,
  type SandwichPanelState,
} from "./SandwichPanel";

export type SandwichRailItem = Readonly<{
  id: string;
  title: string;
  initialState: SandwichPanelState;
  summary?: ReactNode;
  badge?: ReactNode;
  content: ReactNode;
}>;

export type SandwichRailProps = Readonly<{
  ariaLabel: string;
  items: readonly SandwichRailItem[];
  promotedId?: string;
}>;

type SandwichRailState = Readonly<Record<string, SandwichPanelState>>;

export function SandwichRail({ ariaLabel, items, promotedId }: SandwichRailProps) {
  const [states, setStates] = useState<SandwichRailState>(() => createInitialStates(items));

  useEffect(() => {
    if (promotedId === undefined || !items.some((item) => item.id === promotedId)) return;
    setStates((current) => expandOnly(current, items, promotedId));
  }, [items, promotedId]);

  return (
    <div aria-label={ariaLabel} className="runtime-sandwich-rail" role="group">
      {items.map((item) => (
        <SandwichPanel
          badge={item.badge}
          id={item.id}
          key={item.id}
          onStateChange={(nextState) => {
            setStates((current) =>
              nextState === "expanded"
                ? expandOnly(current, items, item.id)
                : Object.freeze({ ...current, [item.id]: nextState }),
            );
          }}
          state={states[item.id] ?? item.initialState}
          summary={item.summary}
          title={item.title}
        >
          {item.content}
        </SandwichPanel>
      ))}
    </div>
  );
}

function createInitialStates(items: readonly SandwichRailItem[]): SandwichRailState {
  let expandedId: string | undefined;
  const states: Record<string, SandwichPanelState> = {};

  for (const item of items) {
    if (item.initialState === "expanded" && expandedId !== undefined) {
      states[item.id] = item.summary === undefined ? "collapsed" : "summary";
      continue;
    }

    states[item.id] = item.initialState;
    if (item.initialState === "expanded") expandedId = item.id;
  }

  return Object.freeze(states);
}

function expandOnly(
  current: SandwichRailState,
  items: readonly SandwichRailItem[],
  expandedId: string,
): SandwichRailState {
  const next: Record<string, SandwichPanelState> = { ...current };

  for (const item of items) {
    if (item.id === expandedId) {
      next[item.id] = "expanded";
      continue;
    }

    if (next[item.id] === "expanded") {
      next[item.id] = item.summary === undefined ? "collapsed" : "summary";
    }
  }

  return Object.freeze(next);
}
