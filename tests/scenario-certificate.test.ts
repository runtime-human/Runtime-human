import type { ScenarioAuthoringDocument } from "@runtime-human/game-authoring-schema";
import { fingerprint } from "@runtime-human/game-core";
import {
  MVP_CASUAL_SCENARIO_POLICY_V1,
  type ScenarioCertificateV1,
  type ScenarioExecutionPolicyV1,
} from "@runtime-human/game-schema";
import { certifyScenarioProgramV1, compileScenarioProgramV1 } from "@runtime-human/game-devtools";

const POLICY_NAMESPACE = "scenario-execution-policy-v1";
const CERTIFICATE_NAMESPACE = "scenario-certificate-v1";

function compile(source: ScenarioAuthoringDocument) {
  const result = compileScenarioProgramV1(source, { fingerprint });
  if (result.kind !== "success") {
    throw new Error(`Expected compile success, got ${JSON.stringify(result.diagnostics)}`);
  }
  return result.program;
}

function expectCertificate(
  source: ScenarioAuthoringDocument,
  policy: ScenarioExecutionPolicyV1 = MVP_CASUAL_SCENARIO_POLICY_V1,
): ScenarioCertificateV1 {
  const result = certifyScenarioProgramV1(compile(source), policy, { fingerprint });
  if (result.kind !== "success") {
    throw new Error(`Expected certification success, got ${JSON.stringify(result.diagnostics)}`);
  }
  return result.certificate;
}

function linearScenario(): ScenarioAuthoringDocument {
  return {
    schemaVersion: "scenario-v1",
    id: "certificate.linear",
    entry: "a",
    nodes: {
      a: { kind: "decision", decisionId: "decision.access", next: "b" },
      b: { kind: "provider", providerId: "provider.project", next: "c" },
      c: { kind: "random-content", poolId: "pool.narrative", next: "d" },
      d: { kind: "gate", predicateId: "predicate.ready", pass: "e", fail: "f" },
      e: {
        kind: "branch",
        branches: [{ predicateId: "predicate.alt", target: "f" }],
        fallback: "f",
      },
      f: { kind: "complete" },
    },
  };
}

describe("ScenarioCertificateV1", () => {
  it("proves exact DAG bounds without inventing an RNG budget", () => {
    const certificate = expectCertificate(linearScenario());
    const policyFingerprint = fingerprint(POLICY_NAMESPACE, MVP_CASUAL_SCENARIO_POLICY_V1);
    const body = {
      schemaVersion: "scenario-certificate-v1",
      policyId: "mvp-casual-ordinary-month-v1",
      policyFingerprint,
      instructionCount: 6,
      completionGuaranteed: true,
      bounded: true,
      transitionBudgetMax: 6,
      blockingDecisionsMin: 1,
      blockingDecisionsMax: 1,
      providerCallsMax: 1,
      rngCallsMax: "unknown",
    } as const;

    expect(certificate).toEqual({
      ...body,
      certificateFingerprint: fingerprint(CERTIFICATE_NAMESPACE, body),
    });
  });

  it("computes conservative decision min and max across branches", () => {
    const source: ScenarioAuthoringDocument = {
      schemaVersion: "scenario-v1",
      id: "certificate.branch",
      entry: "a",
      nodes: {
        a: { kind: "gate", predicateId: "predicate.route", pass: "b", fail: "f" },
        b: { kind: "decision", decisionId: "decision.optional", next: "f" },
        f: { kind: "complete" },
      },
    };

    const certificate = expectCertificate(source);

    expect(certificate.transitionBudgetMax).toBe(3);
    expect(certificate.blockingDecisionsMin).toBe(0);
    expect(certificate.blockingDecisionsMax).toBe(1);
    expect(certificate.providerCallsMax).toBe(0);
  });

  it("rejects a reachable cycle even when the analyzer can see an exit", () => {
    const source: ScenarioAuthoringDocument = {
      schemaVersion: "scenario-v1",
      id: "certificate.cycle",
      entry: "a",
      nodes: {
        a: { kind: "gate", predicateId: "predicate.retry", pass: "a", fail: "f" },
        f: { kind: "complete" },
      },
    };
    const result = certifyScenarioProgramV1(compile(source), MVP_CASUAL_SCENARIO_POLICY_V1, {
      fingerprint,
    });

    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.diagnostics.map(({ code }: { code: string }) => code)).toContain("SCN009");
    }
  });

  it("enforces the versioned casual blocking-decision policy", () => {
    const source: ScenarioAuthoringDocument = {
      schemaVersion: "scenario-v1",
      id: "certificate.two-decisions",
      entry: "a",
      nodes: {
        a: { kind: "decision", decisionId: "decision.first", next: "b" },
        b: { kind: "decision", decisionId: "decision.second", next: "f" },
        f: { kind: "complete" },
      },
    };
    const result = certifyScenarioProgramV1(compile(source), MVP_CASUAL_SCENARIO_POLICY_V1, {
      fingerprint,
    });

    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.diagnostics.map(({ code }: { code: string }) => code)).toContain("SCN010");
    }
  });

  it("allows an explicit fingerprinted policy to raise the decision bound", () => {
    const source: ScenarioAuthoringDocument = {
      schemaVersion: "scenario-v1",
      id: "certificate.special-month",
      entry: "a",
      nodes: {
        a: { kind: "decision", decisionId: "decision.first", next: "b" },
        b: { kind: "decision", decisionId: "decision.second", next: "f" },
        f: { kind: "complete" },
      },
    };
    const policy = {
      schemaVersion: "scenario-execution-policy-v1",
      policyId: "special-month-two-decisions-v1",
      requireAcyclic: true,
      blockingDecisionsMax: 2,
    } as const satisfies ScenarioExecutionPolicyV1;

    const certificate = expectCertificate(source, policy);

    expect(certificate.blockingDecisionsMax).toBe(2);
    expect(certificate.policyId).toBe(policy.policyId);
    expect(certificate.policyFingerprint).toBe(fingerprint(POLICY_NAMESPACE, policy));
  });
});
