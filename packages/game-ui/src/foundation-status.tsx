import type { CSSProperties, JSX } from "react";

export interface FoundationCheck {
  readonly id: string;
  readonly label: string;
  readonly state: "ready" | "planned";
}

export interface FoundationStatusProps {
  readonly title: string;
  readonly summary: string;
  readonly checks: readonly FoundationCheck[];
}

const stateLabels = {
  ready: "Готово",
  planned: "Запланировано",
} as const;

const styles = {
  page: {
    boxSizing: "border-box",
    minHeight: "100vh",
    padding: "48px",
    background: "#f4f1e8",
    color: "#18211b",
    fontFamily: "system-ui, sans-serif",
  },
  panel: {
    maxWidth: "760px",
    margin: "0 auto",
    padding: "32px",
    border: "1px solid #89958c",
    borderRadius: "16px",
    background: "#fffdf7",
    boxShadow: "0 18px 60px rgba(24, 33, 27, 0.12)",
  },
  eyebrow: {
    margin: "0 0 8px",
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: { margin: 0, fontSize: "clamp(2rem, 6vw, 4.5rem)", lineHeight: 1 },
  summary: { margin: "20px 0 28px", maxWidth: "62ch", lineHeight: 1.6 },
  list: { display: "grid", gap: "12px", padding: 0, listStyle: "none" },
  item: {
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    padding: "14px 16px",
    border: "1px solid #c8cec9",
    borderRadius: "10px",
  },
  state: { whiteSpace: "nowrap", fontWeight: 700 },
} satisfies Record<string, CSSProperties>;

export function FoundationStatus({ title, summary, checks }: FoundationStatusProps): JSX.Element {
  return (
    <main aria-labelledby="foundation-title" style={styles.page}>
      <section style={styles.panel}>
        <p style={styles.eyebrow}>Runtime Human · Foundation</p>
        <h1 id="foundation-title" style={styles.title}>
          {title}
        </h1>
        <p style={styles.summary}>{summary}</p>
        <ul aria-label="Состояние Foundation" style={styles.list}>
          {checks.map((check) => (
            <li key={check.id} style={styles.item}>
              <span>{check.label}</span>
              <span style={styles.state}>{stateLabels[check.state]}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
