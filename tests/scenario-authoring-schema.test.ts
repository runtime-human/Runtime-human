import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import {
  ScenarioAuthoringSchemaV1,
  type ScenarioAuthoringDocument,
} from "@runtime-human/game-authoring-schema";

const validate = new Ajv2020({ allErrors: true, strict: true }).compile(
  ScenarioAuthoringSchemaV1 as object,
);

const VALID_SCENARIO: ScenarioAuthoringDocument = {
  schemaVersion: "scenario-v1",
  id: "scenario.january.first-program",
  entry: "access",
  nodes: {
    access: {
      kind: "decision",
      decisionId: "january-access",
      next: "learning",
    },
    learning: {
      kind: "decision",
      decisionId: "january-learning",
      next: "work",
    },
    work: {
      kind: "provider",
      providerId: "january-work",
      next: "defect",
    },
    defect: {
      kind: "random-content",
      poolId: "january-defect-events",
      next: "response",
    },
    response: {
      kind: "decision",
      decisionId: "january-defect",
      next: "outcome",
    },
    outcome: {
      kind: "provider",
      providerId: "january-outcome",
      next: "complete",
    },
    complete: { kind: "complete" },
  },
};

describe("ScenarioAuthoringSchemaV1", () => {
  it("uses a stable JSON Schema 2020-12 identity", () => {
    expect(ScenarioAuthoringSchemaV1.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(ScenarioAuthoringSchemaV1.$id).toBe("https://runtime-human.invalid/schema/scenario-v1");
  });

  it("accepts a closed typed scenario graph", () => {
    expect(validate(VALID_SCENARIO), JSON.stringify(validate.errors)).toBe(true);
  });

  it("accepts MonthRun-compatible decision ids used by the January shadow", () => {
    const document = {
      ...VALID_SCENARIO,
      nodes: {
        ...VALID_SCENARIO.nodes,
        access: {
          kind: "decision",
          decisionId: "january-1990/access",
          next: "learning",
        },
      },
    };

    expect(validate(document), JSON.stringify(validate.errors)).toBe(true);
  });

  it.each([
    ["unknown node kind", { ...VALID_SCENARIO, nodes: { bad: { kind: "script", code: "x" } } }],
    [
      "arbitrary expression",
      {
        ...VALID_SCENARIO,
        nodes: {
          bad: {
            kind: "gate",
            predicateId: "ready",
            pass: "complete",
            fail: "complete",
            expression: "money > 2",
          },
          complete: { kind: "complete" },
        },
      },
    ],
    [
      "direct mutation payload",
      {
        ...VALID_SCENARIO,
        nodes: {
          bad: {
            kind: "provider",
            providerId: "x",
            next: "complete",
            effects: [{ set: "skill", value: 9 }],
          },
          complete: { kind: "complete" },
        },
      },
    ],
    ["invalid scenario id", { ...VALID_SCENARIO, id: "Scenario Bad" }],
  ])("rejects %s", (_label, document) => {
    expect(validate(document)).toBe(false);
  });

  it("allows semantic analyzer cases such as a missing next/fallback to pass schema shape", () => {
    const semanticInvalid = {
      schemaVersion: "scenario-v1",
      id: "scenario.semantic.invalid",
      entry: "start",
      nodes: {
        start: { kind: "decision", decisionId: "choose" },
        branch: { kind: "branch", branches: [{ predicateId: "ready", target: "done" }] },
        done: { kind: "complete" },
      },
    };
    expect(validate(semanticInvalid), JSON.stringify(validate.errors)).toBe(true);
  });
});
