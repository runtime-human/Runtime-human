// Repository-wide GitHub Actions pin policy.
//
// Every remote `uses:` must be pinned to a full 40-character commit SHA with a
// trailing `# v<version>` comment, and one action may not be pinned to
// different commits across workflows. Exact pins the control plane depends on
// live in `REQUIRED_ACTION_PINS`; a Dependabot bump must update this table in
// the same PR, otherwise the fast feedback gate fails with an explicit drift
// diagnostic instead of breaking `main` after merge.

export const REQUIRED_ACTION_PINS = Object.freeze({
  "Mozilla-Actions/sccache-action": Object.freeze({
    sha: "fc920bf0ec8de6ee65d409111f7ec508035751ba",
    version: "v0.0.11",
  }),
  "actions/cache": Object.freeze({
    sha: "55cc8345863c7cc4c66a329aec7e433d2d1c52a9",
    version: "v6.1.0",
  }),
  "actions/upload-artifact": Object.freeze({
    sha: "cf430e030ddbb5b0abf93d22962f4752f3646cd9",
    version: "v7.0.2",
  }),
});

const USES_LINE = /^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/u;
const PINNED_REF = /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)((?:\/[A-Za-z0-9_.-]+)*)@([0-9a-f]{40})$/u;
const VERSION_COMMENT = /^\s+#\s+(v\d+(?:\.\d+){0,2})\s*$/u;

export function formatActionPin(action, pin) {
  return `${action}@${pin.sha} # ${pin.version}`;
}

export function collectActionUses(workflows) {
  const uses = [];
  for (const [file, text] of Object.entries(workflows)) {
    const lines = String(text).split(/\r?\n/u);
    lines.forEach((line, index) => {
      const match = USES_LINE.exec(line);
      if (!match) return;
      uses.push({ file, line: index + 1, ref: match[1], trailer: match[2] });
    });
  }
  return uses;
}

export function findActionPinViolations(workflows, requiredPins = REQUIRED_ACTION_PINS) {
  const violations = [];
  const seen = new Map();

  for (const use of collectActionUses(workflows)) {
    const where = `${use.file}:${use.line}`;
    if (use.ref.startsWith("./") || use.ref.startsWith("docker://")) continue;

    const pinned = PINNED_REF.exec(use.ref);
    if (!pinned) {
      violations.push(`${where} ${use.ref} must be pinned to a full 40-character commit SHA`);
      continue;
    }
    const version = VERSION_COMMENT.exec(use.trailer)?.[1];
    if (!version) {
      violations.push(`${where} ${use.ref} must carry a trailing "# v<version>" comment`);
      continue;
    }

    const action = pinned[1];
    const pin = { sha: pinned[3], version };
    const previous = seen.get(action);
    if (previous && (previous.pin.sha !== pin.sha || previous.pin.version !== pin.version)) {
      violations.push(
        `${where} ${formatActionPin(action, pin)} drifts from ${previous.where} ${formatActionPin(action, previous.pin)}`,
      );
    } else if (!previous) {
      seen.set(action, { where, pin });
    }

    const required = requiredPins[action];
    if (required && (required.sha !== pin.sha || required.version !== pin.version)) {
      violations.push(
        `${where} ${formatActionPin(action, pin)} does not match control-plane pin ${formatActionPin(action, required)}; review the action release and update REQUIRED_ACTION_PINS in scripts/studio/action-pins-lib.mjs in the same change`,
      );
    }
  }

  for (const [action, required] of Object.entries(requiredPins)) {
    if (!seen.has(action)) {
      violations.push(
        `control-plane pin ${formatActionPin(action, required)} is not used by any workflow`,
      );
    }
  }

  return violations;
}
