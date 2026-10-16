import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { parse as parseJsonc } from "jsonc-parser";
import { describe, expect, it } from "vitest";

import { JanuaryV2ApproachBalanceAuthoringSchemaV1 } from "@runtime-human/game-authoring-schema";
import {
  compileBalanceSet,
  compileJanuaryV2ApproachBalance,
  JANUARY_V2_APPROACH_BALANCE_SCHEMA_V1,
  JANUARY_V2_APPROACH_SOURCE_PATH,
  loadBalanceSourceFiles,
  type ContentSourceFile,
} from "@runtime-human/game-content-compiler";
import {
  canonicalizeAuthoritative,
  createJanuary1990BalanceFingerprint,
  fingerprint,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_V2_PROVISIONAL_APPROACH_TABLE,
} from "@runtime-human/game-core";
import { loadJanuary1990CompiledBalance } from "./helpers/january-1990-balance";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

async function source(): Promise<ContentSourceFile> {
  const files = await loadBalanceSourceFiles({ repositoryRoot });
  const found = files.find((file) => file.path === JANUARY_V2_APPROACH_SOURCE_PATH);
  if (found === undefined) throw new TypeError("Missing committed January v2 approach balance");
  return found;
}

type MutableApproaches = Record<
  "investigate-first" | "ask-for-help" | "reduce-scope" | "defer-or-recover",
  Record<string, unknown>
>;
type MutableDocument = {
  schemaVersion: string;
  sliceId: string;
  approaches: MutableApproaches;
  [key: string]: unknown;
};

function mutate(file: ContentSourceFile, change: (value: MutableDocument) => void) {
  const doc = parseJsonc(file.text) as MutableDocument;
  change(doc);
  return { ...file, text: JSON.stringify(doc) };
}

function errors(file: ContentSourceFile): readonly string[] {
  const result = compileJanuaryV2ApproachBalance([file]);
  return result.kind === "failure" ? result.diagnostics.map((e) => e.code) : [];
}

describe("REF-02A2a closed January v2 approach balance contract", () => {
  it("compiles the checked-in JSONC through the canonical balance gate", async () => {
    const files = await loadBalanceSourceFiles({ repositoryRoot });
    const result = compileBalanceSet(files);
    expect(result.kind).toBe("success");
    if (result.kind !== "success") return;
    expect(result.slices).toHaveLength(1);
    expect(result.januaryV2Approach).toBeDefined();
    expect(result.januaryV2Approach?.schemaVersion).toBe("approach-balance-v1");
    expect(result.januaryV2Approach?.sliceId).toBe("january-1990-v2");
    expect(canonicalizeAuthoritative(result.januaryV2Approach?.approaches)).toBe(
      canonicalizeAuthoritative(JANUARY_V2_PROVISIONAL_APPROACH_TABLE),
    );

    const v1 = await loadJanuary1990CompiledBalance();
    expect(createJanuary1990BalanceFingerprint(v1)).toBe(
      createJanuary1990BalanceFingerprint(JANUARY_1990_DEFAULT_BALANCE),
    );
    expect(fingerprint("january-v2-approach-balance-v1", result.januaryV2Approach)).toMatch(
      /^[0-9a-f]{64}$/u,
    );
  });

  it("keeps the TypeBox and compiler schemas in acceptance parity", async () => {
    const file = await source();
    const original = parseJsonc(file.text) as MutableDocument;
    const createValidator = (schema: object) =>
      new Ajv2020({
        strict: true,
        allErrors: true,
        validateFormats: false,
      }).compile(schema);
    const authoring = createValidator(JanuaryV2ApproachBalanceAuthoringSchemaV1 as object);
    const compiler = createValidator(JANUARY_V2_APPROACH_BALANCE_SCHEMA_V1 as object);
    const sample = [
      original,
      { ...original, schemaVersion: "quality-balance-v1" },
      { ...original, unexpected: 1 },
      {
        ...original,
        approaches: {
          ...original.approaches,
          "future-approach": original.approaches["ask-for-help"],
        },
      },
      {
        ...original,
        approaches: {
          ...original.approaches,
          "ask-for-help": { ...original.approaches["ask-for-help"], quality: "excellent" },
        },
      },
      {
        ...original,
        approaches: {
          ...original.approaches,
          "ask-for-help": { ...original.approaches["ask-for-help"], finishThreshold: -1 },
        },
      },
      {
        ...original,
        approaches: {
          ...original.approaches,
          "ask-for-help": { ...original.approaches["ask-for-help"], learningValue: 2.5 },
        },
      },
      {
        ...original,
        approaches: Object.fromEntries(
          Object.entries(original.approaches).filter(([id]) => id !== "reduce-scope"),
        ),
      },
    ];
    for (const document of sample) {
      expect(compiler(document)).toBe(authoring(document));
    }
  });

  it("rejects a dominated option and tampering with assistance or cost", async () => {
    const file = await source();
    expect(
      errors(
        mutate(file, (doc) => {
          doc.approaches["investigate-first"].finishThreshold = 10;
          doc.approaches["investigate-first"].quality = "strong";
        }),
      ),
    ).toContain("BAL006_APPROACH_SEMANTICS");
    expect(
      errors(
        mutate(file, (doc) => {
          doc.approaches["ask-for-help"].participation = "independent";
        }),
      ),
    ).toContain("BAL006_APPROACH_SEMANTICS");
    expect(
      errors(
        mutate(file, (doc) => {
          doc.approaches["ask-for-help"].cost = "completion-risk";
        }),
      ),
    ).toContain("BAL006_APPROACH_SEMANTICS");
    expect(
      errors(
        mutate(file, (doc) => {
          Reflect.deleteProperty(doc.approaches, "reduce-scope");
        }),
      ),
    ).toContain("SCHEMA_INVALID");
  });

  it("rejects duplicate JSONC keys, unknown paths and malformed content", async () => {
    const file = await source();
    const duplicate = {
      ...file,
      text: file.text.replace(
        '"sliceId": "january-1990-v2",',
        '"sliceId": "january-1990-v2", "sliceId": "january-1990-v2",',
      ),
    };
    expect(errors(duplicate)).toContain("BAL005_FORBIDDEN_PROPERTY");
    expect(errors({ path: "balance/approach/other.jsonc", text: file.text })).toContain(
      "INVALID_PATH",
    );
    expect(errors({ ...file, text: "{" })).toContain("JSONC_PARSE");
    expect(compileJanuaryV2ApproachBalance([file, file]).kind).toBe("failure");
    expect(
      errors(
        mutate(file, (doc) => {
          doc.approaches["reduce-scope"].unknown = true;
        }),
      ),
    ).toContain("SCHEMA_INVALID");
  });
});
