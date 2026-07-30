import { useEffect, useRef, useState, type ReactNode } from "react";

import { SandwichPanel, type SandwichPanelState } from "./SandwichPanel";

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
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const structureKey = createStructureKey(items);

  useEffect(() => {
    const currentItems = itemsRef.current;
    setStates((current) => {
      const reconciled = reconcileStates(current, currentItems);
      const next =
        promotedId !== undefined && currentItems.some((item) => item.id === promotedId)
          ? expandOnly(reconciled, currentItems, promotedId)
          : reconciled;
      return statesEqual(current, next) ? current : next;
    });
  }, [promotedId, structureKey]);

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

function createStructureKey(items: readonly SandwichRailItem[]): string {
  return JSON.stringify(
    items.map((item) => [item.id, item.initialState, item.summary === undefined ? 0 : 1]),
  );
}

function createInitialStates(items: readonly SandwichRailItem[]): SandwichRailState {
  return reconcileStates(Object.freeze({}), items);
}

function reconcileStates(
  current: SandwichRailState,
  items: readonly SandwichRailItem[],
): SandwichRailState {
  let expandedId: string | undefined;
  const states: Record<string, SandwichPanelState> = {};

  for (const item of items) {
    const requested = current[item.id] ?? item.initialState;
    if (requested === "expanded" && expandedId !== undefined) {
      states[item.id] = demotedState(item);
      continue;
    }

    states[item.id] = requested;
    if (requested === "expanded") expandedId = item.id;
  }

  return Object.freeze(states);
}

function expandOnly(
  current: SandwichRailState,
  items: readonly SandwichRailItem[],
  expandedId: string,
): SandwichRailState {
  const next: Record<string, SandwichPanelState> = {};

  for (const item of items) {
    if (item.id === expandedId) {
      next[item.id] = "expanded";
      continue;
    }

    const currentState = current[item.id] ?? item.initialState;
    next[item.id] = currentState === "expanded" ? demotedState(item) : currentState;
  }

  return Object.freeze(next);
}

function demotedState(item: SandwichRailItem): SandwichPanelState {
  return item.summary === undefined ? "collapsed" : "summary";
}

function statesEqual(left: SandwichRailState, right: SandwichRailState): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && rightKeys.every((key) => left[key] === right[key]);
}
