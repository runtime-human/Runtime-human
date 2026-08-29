import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatBalanceDiagnostics,
  loadBalanceSourceFiles,
  compileBalanceSet,
} from "@runtime-human/game-content-compiler";
import {
  canonicalizeAuthoritative,
  createJanuary1990BalanceFingerprint,
  JANUARY_1990_BALANCE_SLICE_ID,
  JANUARY_1990_DEFAULT_BALANCE,
  parseJanuary1990Balance,
} from "@runtime-human/game-core";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const files = await loadBalanceSourceFiles({ repositoryRoot });
const compilation = compileBalanceSet(files);

if (compilation.kind === "failure") {
  for (const line of formatBalanceDiagnostics(compilation.diagnostics)) {
    console.error(line);
  }
  console.error("[balance] FAIL: balance files are invalid");
  process.exitCode = 1;
} else {
  const unexpectedSlices = compilation.slices
    .map((slice) => slice.sliceId)
    .filter((sliceId) => sliceId !== JANUARY_1990_BALANCE_SLICE_ID);
  if (unexpectedSlices.length > 0) {
    console.error(
      `[balance] FAIL: unknown balance slices ${unexpectedSlices.map((s) => JSON.stringify(s)).join(", ")}; only ${JSON.stringify(JANUARY_1990_BALANCE_SLICE_ID)} is canonical`,
    );
    process.exitCode = 1;
  }
  const slice = compilation.slices.find(
    (candidate) => candidate.sliceId === JANUARY_1990_BALANCE_SLICE_ID,
  );
  if (slice === undefined) {
    console.error(`[balance] FAIL: no ${JANUARY_1990_BALANCE_SLICE_ID} slice found`);
    process.exitCode = 1;
  } else {
    const balance = parseJanuary1990Balance({
      schemaVersion: "january-1990-balance-v1",
      sliceId: slice.sliceId,
      quality: stripFamilyEnvelope(slice.quality),
      skillEvidence: stripFamilyEnvelope(slice.skillEvidence),
    });

    const compiledCanonical = canonicalizeAuthoritative(balance);
    const defaultCanonical = canonicalizeAuthoritative(JANUARY_1990_DEFAULT_BALANCE);
    if (compiledCanonical !== defaultCanonical) {
      console.error(
        "[balance] FAIL: compiled balance differs from the canonical game-core default balance",
      );
      process.exitCode = 1;
    } else if (
      createJanuary1990BalanceFingerprint(balance) !==
      createJanuary1990BalanceFingerprint(JANUARY_1990_DEFAULT_BALANCE)
    ) {
      console.error("[balance] FAIL: balance fingerprints diverge");
      process.exitCode = 1;
    } else {
      console.log(
        `[balance] OK: ${compilation.slices.length} slice(s), ${files.length} file(s), balanceFingerprint ${createJanuary1990BalanceFingerprint(balance)}`,
      );
    }
  }
}

function stripFamilyEnvelope(
  document: Readonly<Record<string, unknown>> & { sliceId: string },
): Readonly<Record<string, unknown>> {
  const { schemaVersion: _schemaVersion, sliceId: _sliceId, ...body } = document;
  return body;
}
