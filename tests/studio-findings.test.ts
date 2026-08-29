import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const studioScript = (name: string) => join(repoRoot, "scripts", "studio", name);

function createFindingRepo() {
  const root = mkdtempSync(join(tmpdir(), "runtime-human-findings-"));
  mkdirSync(join(root, ".studio", "findings"), { recursive: true });
  writeFileSync(
    join(root, ".studio", "finding-policy.json"),
    readFileSync(join(repoRoot, ".studio", "finding-policy.json"), "utf8"),
  );
  writeFileSync(
    join(root, ".studio", "zones.json"),
    readFileSync(join(repoRoot, ".studio", "zones.json"), "utf8"),
  );
  writeFileSync(join(root, ".studio", "findings", "ledger.jsonl"), "");
  writeFileSync(join(root, ".studio", "findings", "resolved.jsonl"), "");
  return root;
}

function run(root: string, script: string, args: string[]) {
  const result = spawnSync(process.execPath, [studioScript(script), ...args], {
    cwd: root,
    encoding: "utf8",
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return result.stdout;
}

const baseFinding = [
  "--zone",
  "ui",
  "--severity",
  "S2",
  "--size",
  "M",
  "--scope",
  "local",
  "--category",
  "state-sync",
  "--component",
  "dock",
  "--invariant",
  "resume",
  "--summary",
  "Dock state diverges after resume",
];

describe("Studio review finding ledger", () => {
  it("deduplicates a recurring fingerprint and merges evidence", () => {
    const root = createFindingRepo();
    const first = JSON.parse(
      run(root, "finding-add.mjs", [
        ...baseFinding,
        "--evidence",
        "apps/desktop/a.ts:10",
        "--found-by",
        "review:glm-5.3",
      ]),
    );
    const second = JSON.parse(
      run(root, "finding-add.mjs", [
        ...baseFinding,
        "--evidence",
        "tests/a.test.ts:20",
        "--found-by",
        "review:sol",
      ]),
    );

    expect(first.action).toBe("created");
    expect(second.action).toBe("deduplicated");
    expect(second.finding.id).toBe(first.finding.id);
    expect(second.finding.occurrences).toBe(2);
    expect(second.finding.evidence).toEqual(["apps/desktop/a.ts:10", "tests/a.test.ts:20"]);
  });

  it("clusters related findings, promotes recurrence, and archives verified resolution", () => {
    const root = createFindingRepo();
    const first = JSON.parse(run(root, "finding-add.mjs", baseFinding));
    run(root, "finding-add.mjs", [
      "--zone",
      "ui",
      "--severity",
      "S3",
      "--size",
      "S",
      "--scope",
      "local",
      "--category",
      "state-sync",
      "--component",
      "dock",
      "--invariant",
      "focus",
      "--summary",
      "Focus is not restored",
    ]);
    run(root, "finding-add.mjs", [
      "--zone",
      "ui",
      "--severity",
      "S3",
      "--size",
      "S",
      "--scope",
      "local",
      "--category",
      "state-sync",
      "--component",
      "dock",
      "--invariant",
      "keyboard",
      "--summary",
      "Keyboard navigation skips the dock",
    ]);

    const clusters = JSON.parse(run(root, "findings-cluster.mjs", ["--json"]));
    expect(clusters[0]).toMatchObject({
      state: "ready-batch",
      findingCount: 3,
      recommendedRisk: "R2",
    });

    run(root, "finding-add.mjs", baseFinding);
    run(root, "finding-add.mjs", baseFinding);
    run(root, "finding-add.mjs", baseFinding);
    const promotion = JSON.parse(run(root, "findings-promote.mjs", []));
    expect(promotion.promoted).toContain(first.finding.id);
    const repeatedPromotion = JSON.parse(run(root, "findings-promote.mjs", []));
    expect(repeatedPromotion.promoted).toEqual([]);

    run(root, "finding-resolve.mjs", [
      "--id",
      first.finding.id,
      "--root-cause",
      "Missing resume state guard",
      "--fix-commit",
      "abc123",
      "--prevention",
      "regression-test",
      "--prevention",
      "mechanical-guard",
    ]);

    const open = readFileSync(join(root, ".studio", "findings", "ledger.jsonl"), "utf8");
    const resolved = readFileSync(join(root, ".studio", "findings", "resolved.jsonl"), "utf8");
    expect(open).not.toContain(first.finding.id);
    expect(resolved).toContain("Missing resume state guard");
    expect(resolved).toContain("mechanical-guard");
  });
});
