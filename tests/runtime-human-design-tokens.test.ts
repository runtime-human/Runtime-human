import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const TOKENS_PATH = resolve(
  process.cwd(),
  "apps",
  "desktop",
  "src",
  "design",
  "runtime-human-tokens.css",
);

const SHELL_PATH = resolve(
  process.cwd(),
  "apps",
  "desktop",
  "src",
  "shell",
  "desktop-shell.css",
);

const AI_DEFAULT_INDIGO = /#6366f1|#4f46e5|#4338ca|#3730a3|#8b5cf6|#7c3aed|#a855f7/i;
const OLD_PAPER_VALUES = /#eeece3|#f7f5ed|#d5d8cf|#f1e4d2|#f1ddd7|#dfeeda/i;

describe("Runtime Human game design foundation", () => {
  it("defines the cold game palette and excludes beige and AI-default values", async () => {
    const css = await readFile(TOKENS_PATH, "utf8");

    for (const token of [
      "--game-bg:",
      "--game-bg-deep:",
      "--game-surface-1:",
      "--game-surface-2:",
      "--game-fg:",
      "--game-fg-2:",
      "--game-border:",
      "--game-border-strong:",
      "--game-accent:",
      "--game-warning:",
      "--game-danger:",
      "--game-font-display:",
      "--game-font-ui:",
    ]) {
      expect(css).toContain(token);
    }

    expect(css).not.toMatch(OLD_PAPER_VALUES);
    expect(css).not.toMatch(AI_DEFAULT_INDIGO);
  });

  it("keeps temporary paper aliases dark and explicitly deprecated", async () => {
    const css = await readFile(TOKENS_PATH, "utf8");

    expect(css).toContain("Deprecated migration aliases");
    expect(css).toContain("--surface-paper: var(--game-surface-2);");
    expect(css).toContain("--surface-paper-raised: var(--game-surface-3);");
    expect(css).toContain("--border-paper: var(--game-border);");
  });

  it("keeps game panel radii below generic dashboard-card proportions", async () => {
    const css = await readFile(TOKENS_PATH, "utf8");

    expect(css).toContain("--game-radius-control: 4px;");
    expect(css).toContain("--game-radius-panel: 6px;");
    expect(css).toContain("--game-radius-dialog: 8px;");
  });

  it("gives the desktop renderer one fixed viewport without document scrolling", async () => {
    const css = await readFile(SHELL_PATH, "utf8");

    expect(css).toMatch(/html,\s*body,\s*#root\s*\{[^}]*height:\s*100%/s);
    expect(css).toMatch(/html,\s*body,\s*#root\s*\{[^}]*overflow:\s*hidden/s);
    expect(css).toMatch(/html,\s*body,\s*#root\s*\{[^}]*min-width:\s*1180px/s);
    expect(css).toMatch(/html,\s*body,\s*#root\s*\{[^}]*min-height:\s*720px/s);
  });
});
