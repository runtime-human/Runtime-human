export type GamectlCapabilitiesIo = Readonly<{
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}>;

export declare const GAMECTL_ENVELOPE_SCHEMA: "runtime-human-gamectl-v1";
export declare const GAMECTL_CAPABILITIES_SCHEMA: "runtime-human-gamectl-capabilities-v1";

export declare const IMPLEMENTED_GAMECTL_COMMANDS: Readonly<{
  capabilities: 1;
  doctor: 1;
  "catalog.list": 1;
  "catalog.show": 1;
  "catalog.refs": 1;
  "catalog.impact": 1;
  "content.validate": 1;
  "content.source": 1;
  "simulate.run": 1;
  "simulate.compare": 1;
  "fixture.list": 1;
  "fixture.materialize": 1;
  replay: 1;
  explain: 1;
}>;

export declare function gamectlCapabilitiesResult(): Readonly<{
  schemaVersion: "runtime-human-gamectl-capabilities-v1";
  commands: typeof IMPLEMENTED_GAMECTL_COMMANDS;
  contracts: Readonly<{
    transport: "runtime-human-gamectl-v1";
    diagnostic: "runtime-human-diagnostic-v1";
    simulationReport: "simulation-report-v1";
    gameplayFixture: "gameplay-fixture-v1";
    repro: "game-repro-v1";
  }>;
}>;

export declare function runGamectlCapabilities(
  argv: readonly string[],
  io: GamectlCapabilitiesIo,
): number | null;
