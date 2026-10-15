import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  REQUIRED_ACTION_PINS,
  findActionPinViolations,
  formatActionPin,
} from "../scripts/studio/action-pins-lib.mjs";

const root = path.resolve(import.meta.dirname, "..");
const workflowDir = path.join(root, ".github/workflows");

function readWorkflows(): Record<string, string> {
  return Object.fromEntries(
    fs
      .readdirSync(workflowDir)
      .filter((name) => /\.ya?ml$/u.test(name))
      .toSorted()
      .map((name) => [
        `.github/workflows/${name}`,
        fs.readFileSync(path.join(workflowDir, name), "utf8"),
      ]),
  );
}

const UPLOAD = "actions/upload-artifact";
const uploadPin = REQUIRED_ACTION_PINS[UPLOAD]!;

describe("GitHub Actions pin policy", () => {
  it("accepts every committed workflow", () => {
    expect(findActionPinViolations(readWorkflows())).toEqual([]);
  });

  it("keeps the foundation evidence upload on the control-plane pin", () => {
    const foundation = readWorkflows()[".github/workflows/foundation.yml"]!;
    expect(foundation).toContain(`uses: ${formatActionPin(UPLOAD, uploadPin)}`);
  });

  it("reports a Dependabot-style bump that did not update the control-plane pin", () => {
    const bumped = "0123456789abcdef0123456789abcdef01234567";
    const workflows = Object.fromEntries(
      Object.entries(readWorkflows()).map(([file, text]) => [
        file,
        text.replaceAll(formatActionPin(UPLOAD, uploadPin), `${UPLOAD}@${bumped} # v7.0.3`),
      ]),
    );
    const violations = findActionPinViolations(workflows);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.every((violation) => violation.includes("REQUIRED_ACTION_PINS"))).toBe(true);
    expect(violations[0]).toContain(`${UPLOAD}@${bumped} # v7.0.3`);
    expect(violations[0]).toContain(formatActionPin(UPLOAD, uploadPin));
  });

  it("rejects tags, short SHAs and missing version comments", () => {
    const violations = findActionPinViolations(
      {
        "a.yml": [
          "      - uses: actions/checkout@v7",
          "      - uses: actions/setup-node@949feb2 # v7",
          "        uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413",
          "      - uses: ./local-action",
        ].join("\n"),
      },
      {},
    );
    expect(violations).toEqual([
      "a.yml:1 actions/checkout@v7 must be pinned to a full 40-character commit SHA",
      "a.yml:2 actions/setup-node@949feb2 must be pinned to a full 40-character commit SHA",
      'a.yml:3 pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 must carry a trailing "# v<version>" comment',
    ]);
  });

  it("rejects the same action pinned to different commits across workflows", () => {
    const first = "1111111111111111111111111111111111111111";
    const second = "2222222222222222222222222222222222222222";
    const violations = findActionPinViolations(
      {
        "a.yml": `      - uses: actions/checkout@${first} # v7`,
        "b.yml": `      - uses: actions/checkout@${second} # v7`,
      },
      {},
    );
    expect(violations).toEqual([
      `b.yml:1 actions/checkout@${second} # v7 drifts from a.yml:1 actions/checkout@${first} # v7`,
    ]);
  });

  it("reports a required pin that no workflow uses", () => {
    const violations = findActionPinViolations({ "a.yml": "jobs: {}" }, { [UPLOAD]: uploadPin });
    expect(violations).toEqual([
      `control-plane pin ${formatActionPin(UPLOAD, uploadPin)} is not used by any workflow`,
    ]);
  });
});
