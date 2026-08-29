import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

const execFileAsync = promisify(execFile);

type GamectlIo = Readonly<{ stdout: (line: string) => void; stderr: (line: string) => void }>;

type GamectlCliModule = Readonly<{
  runGamectlCli: (argv: readonly string[], io: GamectlIo) => Promise<number>;
}>;

const gamectlModuleUrl = new URL("../scripts/gamectl.ts", import.meta.url).href;

let gamectlCliModule: Promise<GamectlCliModule> | undefined;

async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  gamectlCliModule ??= import(gamectlModuleUrl) as Promise<GamectlCliModule>;
  const { runGamectlCli: runCli } = await gamectlCliModule;
  return runCli(argv, io);
}

const TECHNOLOGY_SOURCE = `{
  "schemaVersion": "content-source-v1",
  "id": "technology.qbasic",
  "kind": "technology",
  "domain": "programming",
  "era": "1980s",
  "availableFrom": "1985-01",
  "entryPoint": true,
  "references": [],
  "provenance": [
    { "sourceId": "manual.qbasic", "title": "QBasic historical reference", "locator": "chapter-1" }
  ],
  "payload": { "language": "BASIC", "environment": "DOS" }
}
`;

const STORYLET_SOURCE = `{
  "schemaVersion": "content-source-v1",
  "id": "storylet.first-program",
  "kind": "storylet",
  "domain": "programming",
  "era": "1990s",
  "availableFrom": "1990-01",
  "entryPoint": true,
  "references": ["technology.qbasic"],
  "provenance": [
    { "sourceId": "design.first-program", "title": "First program design source" }
  ],
  "payload": { "title": "Первая программа", "choices": ["independent", "guided"] }
}
`;

const BROKEN_STORYLET_SOURCE = STORYLET_SOURCE.replace(
  '"references": ["technology.qbasic"]',
  '"references": ["technology.missing"]',
);

const ZONES_FIXTURE = JSON.stringify({
  schemaVersion: 1,
  zones: [{ id: "content", paths: ["content/**"], minimumRisk: "R1" }],
});

const STUDIO_CONFIG_FIXTURES: Readonly<Record<string, unknown>> = {
  "context-map.json": { schemaVersion: 1, zones: {} },
  "models.json": {
    schemaVersion: 1,
    policy: "quality-balanced",
    forbiddenModels: [],
    profiles: {},
  },
  "skill-map.json": { schemaVersion: 1, skills: [] },
  "verification-policy.json": { schemaVersion: 1, tiers: {}, adaptiveReview: {} },
};

type FixtureOptions = Readonly<{
  broken?: boolean;
  zones?: boolean;
  studio?: boolean;
  brokenZones?: boolean;
  empty?: boolean;
}>;

type CapturedIo = Readonly<{ stdout: string[]; stderr: string[]; io: GamectlIo }>;

type Envelope = Readonly<{
  schemaVersion: string;
  command: string;
  ok: boolean;
  result?: unknown;
  error?: Readonly<{ code: string; message: string; diagnostics?: readonly unknown[] }>;
}>;

type ListResult = Readonly<{
  count: number;
  entries: readonly Readonly<{
    id: string;
    kind: string;
    era: string;
    domain: string;
    entryPoint: boolean;
    sourcePath: string;
  }>[];
}>;

type Check = Readonly<{ id: string; ok: boolean; severity: string; detail: string }>;

const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root !== undefined) fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeFixtureRepo(options: FixtureOptions = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-gamectl-"));
  tempRoots.push(root);
  if (options.empty === true) return root;
  fs.mkdirSync(path.join(root, "content", "sources", "technology"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "content", "content.config.json"),
    JSON.stringify({
      sourceRoots: ["content/sources/technology"],
      outputRoot: "apps/desktop/public/content",
    }),
  );
  fs.writeFileSync(
    path.join(root, "content", "sources", "technology", "technology.jsonc"),
    TECHNOLOGY_SOURCE,
  );
  fs.writeFileSync(
    path.join(root, "content", "sources", "technology", "storylet.jsonc"),
    options.broken === true ? BROKEN_STORYLET_SOURCE : STORYLET_SOURCE,
  );
  fs.mkdirSync(path.join(root, "tests"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "tests", "foo.test.ts"),
    "// exercises technology.qbasic\nexport {};\n",
  );
  fs.writeFileSync(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  if (options.zones === true || options.studio === true || options.brokenZones === true) {
    fs.mkdirSync(path.join(root, ".studio"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".studio", "zones.json"),
      options.brokenZones === true ? '{ "zones": [ this is not json }' : ZONES_FIXTURE,
    );
  }
  if (options.studio === true) {
    for (const [name, value] of Object.entries(STUDIO_CONFIG_FIXTURES)) {
      fs.writeFileSync(path.join(root, ".studio", name), JSON.stringify(value));
    }
  }
  return root;
}

function captureIo(): CapturedIo {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      stdout: (line) => {
        stdout.push(line);
      },
      stderr: (line) => {
        stderr.push(line);
      },
    },
  };
}

function parseEnvelope(stdout: readonly string[]): Envelope {
  return JSON.parse(stdout.join("\n")) as Envelope;
}

function resultAs<T>(envelope: Envelope): T {
  if (envelope.result === undefined) throw new Error("expected result in envelope");
  return envelope.result as T;
}

describe("gamectl catalog list", () => {
  it("emits a sorted JSON envelope with projected entries", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      ["--root", makeFixtureRepo(), "--json", "catalog", "list"],
      io,
    );

    expect(exit).toBe(0);
    const envelope = parseEnvelope(stdout);
    expect(envelope.schemaVersion).toBe("runtime-human-gamectl-v1");
    expect(envelope.command).toBe("catalog.list");
    expect(envelope.ok).toBe(true);
    const result = resultAs<ListResult>(envelope);
    expect(result.count).toBe(2);
    const ids = result.entries.map((entry) => entry.id);
    expect([...ids].toSorted()).toEqual(ids);
    expect(ids).toContain("technology.qbasic");
    expect(ids).toContain("storylet.first-program");
    const technology = result.entries.find((entry) => entry.id === "technology.qbasic");
    expect(technology).toMatchObject({
      kind: "technology",
      era: "1980s",
      domain: "programming",
      entryPoint: true,
      sourcePath: "content/sources/technology/technology.jsonc",
    });
  });

  it("prints human rows that contain entry ids", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(["--root", makeFixtureRepo(), "catalog", "list"], io);

    expect(exit).toBe(0);
    const text = stdout.join("\n");
    expect(text).toContain("2 entries");
    expect(text).toContain("technology.qbasic");
    expect(text).toContain("storylet.first-program");
  });

  it("applies the --kind filter and rejects unknown kinds", async () => {
    const root = makeFixtureRepo();

    const filtered = captureIo();
    const filteredExit = await runGamectlCli(
      ["--root", root, "--json", "catalog", "list", "--kind", "technology"],
      filtered.io,
    );
    expect(filteredExit).toBe(0);
    const filteredResult = resultAs<ListResult>(parseEnvelope(filtered.stdout));
    expect(filteredResult.count).toBe(1);
    expect(filteredResult.entries[0]?.id).toBe("technology.qbasic");

    const invalid = captureIo();
    const invalidExit = await runGamectlCli(
      ["--root", root, "--json", "catalog", "list", "--kind", "spell"],
      invalid.io,
    );
    expect(invalidExit).toBe(2);
    const envelope = parseEnvelope(invalid.stdout);
    expect(envelope.ok).toBe(false);
    expect(envelope.error?.code).toBe("invalid-kind");
  });
});

describe("gamectl catalog show/refs/impact", () => {
  it("shows a full entry as JSON", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      ["--root", makeFixtureRepo(), "--json", "catalog", "show", "technology.qbasic"],
      io,
    );

    expect(exit).toBe(0);
    const envelope = parseEnvelope(stdout);
    expect(envelope.command).toBe("catalog.show");
    const result = resultAs<{
      entry: { id: string; availableFrom: string; provenance: unknown[] };
    }>(envelope);
    expect(result.entry.id).toBe("technology.qbasic");
    expect(result.entry.availableFrom).toBe("1985-01");
    expect(result.entry.provenance).toHaveLength(1);
  });

  it("reports outgoing and incoming references", async () => {
    const root = makeFixtureRepo();

    const refs = captureIo();
    const refsExit = await runGamectlCli(
      ["--root", root, "--json", "catalog", "refs", "technology.qbasic"],
      refs.io,
    );
    expect(refsExit).toBe(0);
    const refsEnvelope = parseEnvelope(refs.stdout);
    expect(refsEnvelope.command).toBe("catalog.refs");
    const refsResult = resultAs<{ id: string; outgoing: unknown[]; incoming: string[] }>(
      refsEnvelope,
    );
    expect(refsResult.id).toBe("technology.qbasic");
    expect(refsResult.outgoing).toHaveLength(0);
    expect(refsResult.incoming).toContain("storylet.first-program");

    const outgoing = captureIo();
    const outgoingExit = await runGamectlCli(
      ["--root", root, "--json", "catalog", "refs", "storylet.first-program"],
      outgoing.io,
    );
    expect(outgoingExit).toBe(0);
    const outgoingResult = resultAs<{
      outgoing: readonly { id: string; resolved: boolean }[];
    }>(parseEnvelope(outgoing.stdout));
    expect(outgoingResult.outgoing).toEqual([{ id: "technology.qbasic", resolved: true }]);
  });

  it("computes impact with consumers, tests and zones", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      [
        "--root",
        makeFixtureRepo({ zones: true }),
        "--json",
        "catalog",
        "impact",
        "technology.qbasic",
      ],
      io,
    );

    expect(exit).toBe(0);
    const envelope = parseEnvelope(stdout);
    expect(envelope.command).toBe("catalog.impact");
    const result = resultAs<{
      id: string;
      sourcePath: string;
      consumers: string[];
      tests: string[];
      zones: string[];
    }>(envelope);
    expect(result.id).toBe("technology.qbasic");
    expect(result.sourcePath).toBe("content/sources/technology/technology.jsonc");
    expect(result.consumers).toContain("storylet.first-program");
    expect(result.tests.some((test) => test.includes("foo.test.ts"))).toBe(true);
    expect(result.zones).toContain("content");
  });

  it("exits 2 with unknown-entity for unknown ids", async () => {
    const root = makeFixtureRepo();

    const runs = await Promise.all(
      [
        ["catalog", "show"],
        ["catalog", "refs"],
        ["catalog", "impact"],
      ].map(async (args) => {
        const captured = captureIo();
        const exit = await runGamectlCli(
          ["--root", root, "--json", ...args, "technology.nope"],
          captured.io,
        );
        return { exit, captured };
      }),
    );

    expect(runs).toHaveLength(3);
    for (const run of runs) {
      expect(run.exit).toBe(2);
      const envelope = parseEnvelope(run.captured.stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.error?.code).toBe("unknown-entity");
    }
  });
});

describe("gamectl content validate/source", () => {
  it("validates a correct fixture with an empty diagnostics list", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      ["--root", makeFixtureRepo(), "--json", "content", "validate"],
      io,
    );

    expect(exit).toBe(0);
    const envelope = parseEnvelope(stdout);
    expect(envelope.command).toBe("content.validate");
    expect(envelope.ok).toBe(true);
    const result = resultAs<{ entryCount: number; diagnostics: unknown[] }>(envelope);
    expect(result.entryCount).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it("reports structured diagnostics and exit 1 for broken content", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      ["--root", makeFixtureRepo({ broken: true }), "--json", "content", "validate"],
      io,
    );

    expect(exit).toBe(1);
    const envelope = parseEnvelope(stdout);
    expect(envelope.ok).toBe(false);
    expect(envelope.error?.code).toBe("content-invalid");
    const diagnostics = envelope.error?.diagnostics ?? [];
    expect(diagnostics.length).toBeGreaterThan(0);
    expect((diagnostics[0] as { schemaVersion: string }).schemaVersion).toBe(
      "runtime-human-diagnostic-v1",
    );
  });

  it("resolves the source path for an entry", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      ["--root", makeFixtureRepo(), "--json", "content", "source", "technology.qbasic"],
      io,
    );

    expect(exit).toBe(0);
    const envelope = parseEnvelope(stdout);
    expect(envelope.command).toBe("content.source");
    const result = resultAs<{ id: string; path: string }>(envelope);
    expect(result).toEqual({
      id: "technology.qbasic",
      path: "content/sources/technology/technology.jsonc",
    });
  });
});

describe("gamectl doctor", () => {
  it("exits 4 with an environment failure when .studio configs are missing", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(["--root", makeFixtureRepo(), "--json", "doctor"], io);

    expect(exit).toBe(4);
    const envelope = parseEnvelope(stdout);
    expect(envelope.ok).toBe(false);
    const report = resultAs<{ ok: boolean; checks: Check[] }>(envelope);
    expect(report.ok).toBe(false);
    expect(
      report.checks.some(
        (check) => check.id === "studio-configs" && !check.ok && check.severity === "environment",
      ),
    ).toBe(true);
  });

  it("passes on a fixture with valid .studio configs", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      ["--root", makeFixtureRepo({ studio: true }), "--json", "doctor"],
      io,
    );

    expect(exit).toBe(0);
    const envelope = parseEnvelope(stdout);
    expect(envelope.ok).toBe(true);
    const report = resultAs<{ ok: boolean; checks: Check[] }>(envelope);
    expect(report.checks.every((check) => check.ok)).toBe(true);
  });

  it("exits 1 when the content graph is broken", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      ["--root", makeFixtureRepo({ broken: true, studio: true }), "--json", "doctor"],
      io,
    );

    expect(exit).toBe(1);
    const envelope = parseEnvelope(stdout);
    expect(envelope.ok).toBe(false);
    const report = resultAs<{ ok: boolean; checks: Check[] }>(envelope);
    expect(report.checks.some((check) => !check.ok && check.severity === "content")).toBe(true);
    expect(report.checks.some((check) => !check.ok && check.severity === "environment")).toBe(
      false,
    );
  });
});

describe("gamectl input errors", () => {
  it("rejects unknown commands with usage on stderr", async () => {
    const { io, stdout, stderr } = captureIo();
    const exit = await runGamectlCli(["--root", makeFixtureRepo(), "--json", "frobnicate"], io);

    expect(exit).toBe(2);
    const envelope = parseEnvelope(stdout);
    expect(envelope.command).toBe("unknown");
    expect(envelope.ok).toBe(false);
    expect(envelope.error?.code).toBe("unknown-command");
    expect(stderr.join("\n")).toContain("Usage: gamectl");
  });

  it("maps parseArgs violations to usage-error with exit 2", async () => {
    const { io, stdout, stderr } = captureIo();
    const exit = await runGamectlCli(["--nope", "--json"], io);

    expect(exit).toBe(2);
    expect(parseEnvelope(stdout).error?.code).toBe("usage-error");
    expect(stderr.join("\n")).toContain("Usage: gamectl");
  });

  it.each([
    ["nonexistent root", path.join(os.tmpdir(), "runtime-human-gamectl-does-not-exist")],
    ["empty root string", ""],
  ])("rejects %s as invalid-root with exit 2", async (_name, root) => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(["--root", root, "--json", "catalog", "list"], io);

    expect(exit).toBe(2);
    const envelope = parseEnvelope(stdout);
    expect(envelope.ok).toBe(false);
    expect(envelope.error?.code).toBe("invalid-root");
  });

  it("maps an empty repository root to config-missing with exit 4", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      ["--root", makeFixtureRepo({ empty: true }), "--json", "catalog", "list"],
      io,
    );

    expect(exit).toBe(4);
    const envelope = parseEnvelope(stdout);
    expect(envelope.ok).toBe(false);
    expect(envelope.error?.code).toBe("config-missing");
    expect((envelope.error?.diagnostics as { code: string }[] | undefined)?.[0]?.code).toBe(
      "CONFIG_MISSING",
    );
  });

  it("rejects empty string filters with exit 2", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      ["--root", makeFixtureRepo(), "--json", "catalog", "list", "--domain", ""],
      io,
    );

    expect(exit).toBe(2);
    expect(parseEnvelope(stdout).error?.code).toBe("invalid-filter");
  });

  it("maps a broken zones config to zones-invalid with exit 1 for catalog impact", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      [
        "--root",
        makeFixtureRepo({ zones: true, brokenZones: true }),
        "--json",
        "catalog",
        "impact",
        "technology.qbasic",
      ],
      io,
    );

    expect(exit).toBe(1);
    const envelope = parseEnvelope(stdout);
    expect(envelope.ok).toBe(false);
    expect(envelope.error?.code).toBe("zones-invalid");
  });

  it("reports broken studio config JSON as an environment failure in doctor", async () => {
    const { io, stdout } = captureIo();
    const exit = await runGamectlCli(
      ["--root", makeFixtureRepo({ studio: true, brokenZones: true }), "--json", "doctor"],
      io,
    );

    expect(exit).toBe(4);
    const envelope = parseEnvelope(stdout);
    const report = resultAs<{ ok: boolean; checks: Check[] }>(envelope);
    expect(report.checks.find((check) => check.id === "studio-configs")).toMatchObject({
      ok: false,
      severity: "environment",
    });
    expect(report.checks.find((check) => check.id === "studio-configs")?.detail).toContain(
      "zones.json",
    );
  });
});

describe("gamectl real process e2e", () => {
  it("runs the CLI in a real node process against the repository", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", "scripts/gamectl.ts", "catalog", "list", "--json"],
      {
        cwd: repositoryRoot,
        windowsHide: true,
      },
    );

    const envelope = JSON.parse(stdout) as Envelope;
    expect(envelope.schemaVersion).toBe("runtime-human-gamectl-v1");
    expect(envelope.command).toBe("catalog.list");
    expect(envelope.ok).toBe(true);
    expect(resultAs<ListResult>(envelope).count).toBeGreaterThan(0);
  }, 60_000);
});
