import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type BottomGameDockItem = Readonly<{
  id: string;
  label: string;
  panel: ReactNode;
}>;

export type BottomGameDockProps = Readonly<{
  activeId: string;
  items: readonly BottomGameDockItem[];
  onActiveChange(id: string): void;
  label?: string;
}>;

export function BottomGameDock({
  activeId,
  items,
  onActiveChange,
  label = "Игровой док",
}: BottomGameDockProps) {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;
  const [focusedId, setFocusedId] = useState<string | undefined>(activeItem?.id ?? items[0]?.id);

  useEffect(() => {
    setFocusedId(activeItem?.id ?? items[0]?.id);
  }, [activeItem?.id, items]);

  function focusTab(index: number): void {
    const item = items[index];
    if (item === undefined) return;

    setFocusedId(item.id);
    tabRefs.current[index]?.focus();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    item: BottomGameDockItem,
    index: number,
  ): void {
    if (items.length === 0) return;

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusTab((index + 1) % items.length);
        return;
      case "ArrowLeft":
        event.preventDefault();
        focusTab((index - 1 + items.length) % items.length);
        return;
      case "Home":
        event.preventDefault();
        focusTab(0);
        return;
      case "End":
        event.preventDefault();
        focusTab(items.length - 1);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        onActiveChange(item.id);
        return;
      default:
        return;
    }
  }

  return (
    <section className="runtime-bottom-game-dock">
      <div aria-label={label} className="runtime-bottom-game-dock__tabs" role="tablist">
        {items.map((item, index) => {
          const selected = item.id === activeId;
          const tabId = `${baseId}-tab-${index}`;
          const panelId = `${baseId}-panel-${index}`;

          return (
            <button
              aria-controls={panelId}
              aria-selected={selected}
              className="runtime-bottom-game-dock__tab"
              id={tabId}
              key={item.id}
              onClick={() => {
                setFocusedId(item.id);
                onActiveChange(item.id);
              }}
              onFocus={() => setFocusedId(item.id)}
              onKeyDown={(event) => handleKeyDown(event, item, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={item.id === focusedId ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {activeItem === undefined ? null : (
        <div
          aria-labelledby={`${baseId}-tab-${activeIndex}`}
          className="runtime-bottom-game-dock__panel"
          id={`${baseId}-panel-${activeIndex}`}
          role="tabpanel"
          tabIndex={0}
        >
          {activeItem.panel}
        </div>
      )}
    </section>
  );
}
