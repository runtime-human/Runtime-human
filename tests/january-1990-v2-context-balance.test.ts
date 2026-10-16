import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { parse as parseJsonc } from "jsonc-parser";
import { describe, expect, it } from "vitest";

import { JanuaryV2ContextAuthoringSchemaV1 } from "@runtime-human/game-authoring-schema";
import {
  compileBalanceSet,
  compileJanuaryV2ContextBalance,
  JANUARY_V2_CONTEXT_SCHEMA_V1,
  JANUARY_V2_CONTEXT_SOURCE_PATH,
  loadBalanceSourceFiles,
  type ContentSourceFile,
} from "@runtime-human/game-content-compiler";
import {
  assertJanuaryV2ApproachBalance,
  canonicalizeAuthoritative,
  createJanuary1990BalanceFingerprint,
  fingerprint,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_V2_APPROACHES,
  JANUARY_V2_DECLARED_CONTEXTS,
  JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
  JANUARY_V2_PROVISIONAL_APPROACH_TABLE,
  resolveJanuaryV2Approach,
} from "@runtime-human/game-core";
import { loadJanuary1990CompiledBalance } from "./helpers/january-1990-balance";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const fixturePath = new URL(
  "../fixtures/balance/january-1990-v2-bounded-trace-v1.json",
  import.meta.url,
);
const fingerprintV2 = "c6c64a655ab1a32cf789fee4d2804f7318fbb171319c7a41a4f8dbec4e9e3791";

async function source(): Promise<ContentSourceFile> {
  const files = await loadBalanceSourceFiles({ repositoryRoot });
  const found = files.find((file) => file.path === JANUARY_V2_CONTEXT_SOURCE_PATH);
  if (found === undefined) throw new TypeError("Missing January v2 context source");
  return found;
}

type MutableContextDocument = {
  schemaVersion: string;
  sliceId: string;
  startBackground: Record<string, Record<string, number>>;
  learningMode: Record<string, Record<string, number>>;
  defect: Record<string, number>;
  [key: string]: unknown;
};

function mutate(file: ContentSourceFile, edit: (doc: MutableContextDocument) => void) {
  const doc = parseJsonc(file.text) as MutableContextDocument;
  edit(doc);
  return { ...file, text: JSON.stringify(doc) };
}

function failureCodes(files: readonly ContentSourceFile[]) {
  const result = compileJanuaryV2ContextBalance(files);
  return result.kind === "failure" ? result.diagnostics.map((item) => item.code) : [];
}

describe("REF-02A2b January v2 non-dominant context balance", () => {
  it("validates both closed v2 families and pins independent v1 and v2 fingerprints", async () => {
    const all = await loadBalanceSourceFiles({ repositoryRoot });
    const compiled = compileBalanceSet(all);
    expect(compiled.kind).toBe("success");
    if (compiled.kind !== "success") return;
    expect(compiled.januaryV2Context).toBeDefined();
    expect(canonicalizeAuthoritative(compiled.januaryV2Context)).toBe(
      canonicalizeAuthoritative({
        schemaVersion: "january-context-balance-v1",
        sliceId: "january-1990-v2",
        ...JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
      }),
    );
    const v2 = fingerprint("january-v2-balance-v1", {
      approaches: compiled.januaryV2Approach?.approaches,
      context: JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
    });
    expect(v2).toBe(fingerprintV2);
    const legacy = await loadJanuary1990CompiledBalance();
    expect(createJanuary1990BalanceFingerprint(legacy)).toBe(
      createJanuary1990BalanceFingerprint(JANUARY_1990_DEFAULT_BALANCE),
    );
  });

  it("matches the TypeBox and compiler schemas for valid and rejected inputs", async () => {
    const file = await source();
    const doc = parseJsonc(file.text) as MutableContextDocument;
    const build = (schema: object) =>
      new Ajv2020({
        strict: true,
        allErrors: true,
        validateFormats: false,
      }).compile(schema);
    const authoring = build(JanuaryV2ContextAuthoringSchemaV1 as object);
    const compiler = build(JANUARY_V2_CONTEXT_SCHEMA_V1 as object);
    const cases = [
      doc,
      { ...doc, schemaVersion: "january-context-balance-v2" },
      { ...doc, bogus: true },
      { ...doc, startBackground: { ...doc.startBackground, "future-access": {} } },
      { ...doc, startBackground: { ...doc.startBackground, "home-pc": { "ask-for-help": 1 } } },
      { ...doc, defect: { ...doc.defect, "logic-error": 4 } },
      { ...doc, learningMode: { ...doc.learningMode, "edit-and-debug": { finishModifier: 0 } } },
    ];
    for (const value of cases) expect(compiler(value)).toBe(authoring(value));
  });

  it("rejects dominated backgrounds or learning modes and malformed config", async () => {
    const file = await source();
    const approaches = JANUARY_V2_PROVISIONAL_APPROACH_TABLE;
    const check = (changed: ContentSourceFile) => {
      const parsed = compileJanuaryV2ContextBalance([changed]);
      if (parsed.kind !== "success") return parsed.diagnostics.map((d) => d.code);
      try {
        const { schemaVersion: _v, sliceId: _s, ...context } = parsed.document;
        assertJanuaryV2ApproachBalance(approaches, context);
      } catch {
        return ["BAL006_APPROACH_SEMANTICS"];
      }
      return [];
    };
    expect(
      check(
        mutate(file, (doc) => {
          doc.startBackground["shared-school-pc"]!["ask-for-help"] = -2;
        }),
      ),
    ).toContain("BAL006_APPROACH_SEMANTICS");
    expect(
      check(
        mutate(file, (doc) => {
          doc.learningMode["edit-and-debug"]!.practiceOpportunityModifier = -2;
        }),
      ),
    ).toContain("BAL006_APPROACH_SEMANTICS");
    expect(
      check(
        mutate(file, (doc) => {
          doc.learningMode["edit-and-debug"]!.finishModifier = 2;
        }),
      ),
    ).toContain("BAL006_APPROACH_SEMANTICS");
    expect(
      failureCodes([
        mutate(file, (doc) => {
          doc.defect["logic-error"] = 3;
        }),
      ]),
    ).toContain("SCHEMA_INVALID");
    expect(
      failureCodes([
        mutate(file, (doc) => {
          Reflect.deleteProperty(doc.startBackground["home-pc"]!, "ask-for-help");
        }),
      ]),
    ).toContain("SCHEMA_INVALID");
    expect(
      failureCodes([
        mutate(file, (doc) => {
          doc.unexpected = 1;
        }),
      ]),
    ).toContain("SCHEMA_INVALID");
    expect(failureCodes([{ ...file, text: "{" }])).toContain("JSONC_PARSE");
    expect(failureCodes([{ ...file, path: "balance/context/other.jsonc" }])).toContain(
      "INVALID_PATH",
    );
    expect(failureCodes([file, file])).toContain("DUPLICATE_PATH");
  });

  it("replays the exhaustive 8-context × 4-choice × 10-roll bounded trace", async () => {
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as {
      schemaVersion: string;
      rollsPerOption: number;
      balanceFingerprint: string;
      rows: unknown[];
    };
    expect(fixture.schemaVersion).toBe("january-v2-bounded-trace-v1");
    expect(fixture.rollsPerOption).toBe(10);
    expect(fixture.balanceFingerprint).toBe(fingerprintV2);
    const actual = JANUARY_V2_DECLARED_CONTEXTS.flatMap((context) =>
      JANUARY_V2_APPROACHES.map((approach) => {
        const results = Array.from({ length: 10 }, (_, roll) =>
          resolveJanuaryV2Approach(
            JANUARY_V2_PROVISIONAL_APPROACH_TABLE,
            context,
            approach,
            roll,
            JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
          ),
        );
        const first = results[0]!;
        return {
          ...context,
          approach,
          delivery: {
            released: results.filter((v) => v.delivery === "released").length,
            "released-with-limitation": results.filter(
              (v) => v.delivery === "released-with-limitation",
            ).length,
            "delayed-to-february": results.filter((v) => v.delivery === "delayed-to-february")
              .length,
          },
          quality: first.quality,
          participation: first.participation,
          practiceOpportunity: first.practiceOpportunity,
        };
      }),
    );
    expect(actual).toEqual(fixture.rows);
    expect(actual).toHaveLength(32);
  });
});
