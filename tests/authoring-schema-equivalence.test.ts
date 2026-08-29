import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import { parse as parseJsonc } from "jsonc-parser";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { CONTENT_SOURCE_SCHEMA_V1 } from "@runtime-human/game-content-compiler";
import {
  ContentSourceAuthoringSchemaV1,
  type ContentSourceAuthoringDocument,
} from "@runtime-human/game-authoring-schema";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function compile(schema: object): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
  return ajv.compile(schema);
}

const validateExisting = compile(CONTENT_SOURCE_SCHEMA_V1);
const validateGenerated = compile(ContentSourceAuthoringSchemaV1 as object);

function assertParity(document: unknown, label: string): void {
  const existing = validateExisting(document);
  const generated = validateGenerated(document);
  expect(existing, `${label}: existing schema decision`).toBe(generated);
}

async function loadCorpus(): Promise<readonly { label: string; document: unknown }[]> {
  const corpus: { label: string; document: unknown }[] = [];

  const fixtureDir = join(repositoryRoot, "tests", "fixtures", "content-compiler", "valid");
  for (const name of (await readdir(fixtureDir)).toSorted()) {
    if (!name.endsWith(".jsonc")) continue;
    const text = await readFile(join(fixtureDir, name), "utf8");
    corpus.push({ label: `fixture/${name}`, document: parseJsonc(text) });
  }

  const contentRoot = join(repositoryRoot, "content");
  for (const entry of (
    await readdir(contentRoot, { recursive: true, withFileTypes: true })
  ).toSorted((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || !entry.name.endsWith(".jsonc")) continue;
    const absolutePath = join(entry.parentPath, entry.name);
    const text = await readFile(absolutePath, "utf8");
    corpus.push({
      label: absolutePath.slice(repositoryRoot.length),
      document: parseJsonc(text),
    });
  }

  return corpus;
}

const VALID_DOCUMENT: ContentSourceAuthoringDocument = {
  schemaVersion: "content-source-v1",
  id: "technology.qbasic",
  kind: "technology",
  domain: "programming",
  era: "1980s",
  availableFrom: "1985-01",
  entryPoint: false,
  references: [],
  provenance: [{ sourceId: "manual.qbasic", title: "QBasic historical reference" }],
  payload: { language: "BASIC" },
};

function mutated(
  label: string,
  mutate: (document: ContentSourceAuthoringDocument) => unknown,
): {
  label: string;
  document: unknown;
} {
  return { label, document: mutate(structuredClone(VALID_DOCUMENT)) };
}

const REJECTION_MATRIX: readonly { label: string; document: unknown }[] = [
  ...(
    [
      "schemaVersion",
      "id",
      "kind",
      "domain",
      "era",
      "availableFrom",
      "entryPoint",
      "references",
      "provenance",
      "payload",
    ] as const
  ).map((field) =>
    mutated(`missing ${field}`, (document) => {
      const clone = document as Record<string, unknown>;
      delete clone[field];
      return clone;
    }),
  ),
  mutated("wrong schemaVersion", (document) => ({
    ...document,
    schemaVersion: "content-source-v2",
  })),
  mutated("wrong id type", (document) => ({ ...document, id: 42 })),
  mutated("uppercase id", (document) => ({ ...document, id: "Technology.Qbasic" })),
  mutated("leading digit id", (document) => ({ ...document, id: "1technology" })),
  mutated("double separator id", (document) => ({ ...document, id: "technology..qbasic" })),
  mutated("oversized id", (document) => ({ ...document, id: `${"a".repeat(161)}` })),
  mutated("unknown kind", (document) => ({ ...document, kind: "skill" })),
  mutated("wrong kind type", (document) => ({ ...document, kind: ["technology"] })),
  mutated("space in domain", (document) => ({ ...document, domain: "game programming" })),
  mutated("bad era format", (document) => ({ ...document, era: "19 90" })),
  mutated("uppercase era", (document) => ({ ...document, era: "1980S" })),
  mutated("bad availableFrom month", (document) => ({ ...document, availableFrom: "1985-13" })),
  mutated("bad availableFrom shape", (document) => ({ ...document, availableFrom: "1985" })),
  mutated("bad availableTo month", (document) => ({ ...document, availableTo: "1985-00" })),
  mutated("wrong availableTo type", (document) => ({ ...document, availableTo: 198501 })),
  mutated("wrong entryPoint type", (document) => ({ ...document, entryPoint: "true" })),
  mutated("duplicate references", (document) => ({
    ...document,
    references: ["technology.gw-basic", "technology.gw-basic"],
  })),
  mutated("wrong reference type", (document) => ({ ...document, references: [42] })),
  mutated("empty provenance", (document) => ({ ...document, provenance: [] })),
  mutated("provenance missing title", (document) => ({
    ...document,
    provenance: [{ sourceId: "manual.qbasic" }],
  })),
  mutated("provenance empty title", (document) => ({
    ...document,
    provenance: [{ sourceId: "manual.qbasic", title: "" }],
  })),
  mutated("provenance extra property", (document) => ({
    ...document,
    provenance: [{ sourceId: "s", title: "t", url: "https://invalid" }],
  })),
  mutated("extra top-level property", (document) => ({
    ...document,
    futureField: "not allowed",
  })),
  mutated("float payload number", (document) => ({ ...document, payload: 1.5 })),
  mutated("nested float payload", (document) => ({
    ...document,
    payload: { score: { value: [0.25] } },
  })),
  mutated("array payload with float", (document) => ({ ...document, payload: [1, 2.5] })),
];

describe("authoring schema equivalence (content-source family)", () => {
  it("uses JSON Schema 2020-12 with a stable identifier", () => {
    const schema = ContentSourceAuthoringSchemaV1 as Readonly<Record<string, unknown>>;
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.$id).toBe("https://runtime-human.invalid/schema/content-source-v1");
  });

  it("generates a deterministic schema object", () => {
    expect(ContentSourceAuthoringSchemaV1).toBe(ContentSourceAuthoringSchemaV1);
    const serialized = JSON.stringify(
      ContentSourceAuthoringSchemaV1,
      Object.keys(ContentSourceAuthoringSchemaV1 as object).toSorted(),
    );
    const reserialized = JSON.stringify(
      ContentSourceAuthoringSchemaV1,
      Object.keys(ContentSourceAuthoringSchemaV1 as object).toSorted(),
    );
    expect(serialized).toBe(reserialized);
  });

  it("accepts the same valid corpus as the existing compiler schema", async () => {
    const corpus = await loadCorpus();
    expect(corpus.length).toBeGreaterThanOrEqual(25);

    for (const { label, document } of corpus) {
      assertParity(document, label);
      expect(validateGenerated(document), `${label}: generated acceptance`).toBe(true);
    }
  });

  it("rejects the same invalid documents as the existing compiler schema", () => {
    expect(REJECTION_MATRIX.length).toBeGreaterThanOrEqual(30);
    for (const { label, document } of REJECTION_MATRIX) {
      assertParity(document, label);
      expect(validateGenerated(document), `${label}: generated rejection`).toBe(false);
    }
  });

  it("accepts a document typed by the generated Static type", () => {
    assertParity(VALID_DOCUMENT, "static-typed document");
    expect(validateExisting(VALID_DOCUMENT)).toBe(true);
  });
});
