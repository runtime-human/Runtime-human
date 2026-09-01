import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { describe, expect, it } from "vitest";

import { prepareStartupDatabasePopulation } from "../tools/desktop-evidence/src/capture-database.js";
import { parseStartupCaptureArguments } from "../tools/desktop-evidence/src/capture-options.js";

const WORKFLOW_URL = new URL(
  "../.github/workflows/perf-02a-e3-windows-series.yml",
  import.meta.url,
);
const CAPTURE_STARTUP_URL = new URL(
  "../tools/desktop-evidence/src/capture-startup.ts",
  import.meta.url,
);
const COMMIT = "a".repeat(40);

async function readWorkflow(): Promise<string> {
  return readFile(WORKFLOW_URL, "utf8");
}

async function readCaptureStartup(): Promise<string> {
  return readFile(CAPTURE_STARTUP_URL, "utf8");
}

function captureArguments(database: string): string[] {
  return [
    `--commit=${COMMIT}`,
    "--process=cold-process",
    "--os-cache=warm-os-cache",
    `--database=${database}`,
    "--sample-role=measurement",
    "--sample-index=7",
  ];
}

describe("PERF-02A E3 hosted Windows series workflow", () => {
  it("is an opt-in read-only exact-head workflow with fixed E3 coverage", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("name: perf-02a-e3-windows-series");
    expect(workflow).toContain("types: [labeled, synchronize]");
    expect(workflow).toContain(
      "github.event.pull_request.head.repo.full_name == github.repository",
    );
    expect(workflow).toContain("perf:e3-series");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("runs-on: windows-2025");
    expect(workflow).toContain("ref: ${{ github.event.pull_request.head.sha }}");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain('E3_WARMUP_COUNT: "5"');
    expect(workflow).toContain('E3_MEASUREMENT_COUNT: "30"');
    expect(workflow).toContain('"--series=e3"');

    expect(workflow.match(/pnpm evidence:desktop:build/g)).toHaveLength(1);
    expect(workflow).not.toContain("self-hosted");
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).not.toContain("workflow_dispatch");
  });

  it("selects one explicit canonical database population", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("perf:e3-existing-clean");
    expect(workflow).toContain('$database = "new-database"');
    expect(workflow).toContain('$database = "existing-clean-database"');
    expect(workflow).toContain("E3 database population labels are ambiguous");
  });

  it("uses delimiter-safe PowerShell interpolation before milestone colons", async () => {
    const workflow = await readWorkflow();

    expect(workflow).not.toContain("$Role/$Index: $required");
    expect(workflow).toContain("$Role/${Index}: $required");
  });

  it("uses the versioned report missing-metric field", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("$missingExternal[0].count -ne $measurementCount");
    expect(workflow).not.toContain("$missingExternal[0].missingCount");
  });

  it("accepts the canonical existing-clean-database startup population", () => {
    const options = parseStartupCaptureArguments(
      captureArguments("existing-clean-database"),
      process.cwd(),
    );

    expect(options.database).toBe("existing-clean-database");
    expect(basename(options.outputPath)).toBe(
      "startup-shell-fmp-cold-process-warm-os-cache-existing-clean-database-measurement-7.json",
    );
  });

  it("keeps the original new-database population valid", () => {
    const options = parseStartupCaptureArguments(captureArguments("new-database"), process.cwd());

    expect(options.database).toBe("new-database");
  });

  it("rejects database classes without canonical capture semantics", () => {
    expect(() => parseStartupCaptureArguments(captureArguments("existing-database"))).toThrow(
      "--database has an unsupported value",
    );
    expect(() => parseStartupCaptureArguments(captureArguments("mystery-database"))).toThrow(
      "--database has an unsupported value",
    );
  });

  it("does not preseed the new-database population", async () => {
    let called = false;

    await prepareStartupDatabasePopulation("new-database", {
      startSession: async () => {
        called = true;
        return Object.freeze({ id: "seed" });
      },
      waitUntilReady: async () => {
        called = true;
      },
      cleanupSession: async () => {
        called = true;
      },
      assertDatabaseExists: async () => {
        called = true;
      },
    });

    expect(called).toBe(false);
  });

  it("prepares an existing clean database before measuring the next cold process", async () => {
    const calls: string[] = [];
    const session = Object.freeze({ id: "seed" });

    await prepareStartupDatabasePopulation("existing-clean-database", {
      startSession: async () => {
        calls.push("start");
        return session;
      },
      waitUntilReady: async (candidate) => {
        expect(candidate).toBe(session);
        calls.push("ready");
      },
      cleanupSession: async (candidate) => {
        expect(candidate).toBe(session);
        calls.push("cleanup");
      },
      assertDatabaseExists: async () => {
        calls.push("database");
      },
    });

    expect(calls).toEqual(["start", "ready", "cleanup", "database"]);
  });

  it("always cleans the seed session when readiness fails", async () => {
    const calls: string[] = [];
    const session = Object.freeze({ id: "seed" });

    await expect(
      prepareStartupDatabasePopulation("existing-clean-database", {
        startSession: async () => {
          calls.push("start");
          return session;
        },
        waitUntilReady: async () => {
          calls.push("ready");
          throw new Error("seed readiness failed");
        },
        cleanupSession: async () => {
          calls.push("cleanup");
        },
        assertDatabaseExists: async () => {
          calls.push("database");
        },
      }),
    ).rejects.toThrow("seed readiness failed");

    expect(calls).toEqual(["start", "ready", "cleanup"]);
  });

  it("wires database preparation into the physical startup capture", async () => {
    const source = await readCaptureStartup();

    expect(source).toContain("prepareStartupDatabasePopulation");
    expect(source).toContain('join(isolatedDataDirectory, "runtime-human.sqlite3")');
  });
});
