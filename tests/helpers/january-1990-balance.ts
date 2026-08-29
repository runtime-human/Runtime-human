import { fileURLToPath } from "node:url";

import {
  compileBalanceSet,
  loadBalanceSourceFiles,
  type BalanceSliceCompilationV1,
} from "@runtime-human/game-content-compiler";
import {
  JANUARY_1990_BALANCE_SLICE_ID,
  parseJanuary1990Balance,
  type January1990BalanceV1,
} from "@runtime-human/game-core";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

export async function loadJanuary1990CompiledBalance(): Promise<January1990BalanceV1> {
  const files = await loadBalanceSourceFiles({ repositoryRoot });
  const compilation = compileBalanceSet(files);
  if (compilation.kind === "failure") {
    throw new TypeError(
      `January balance files failed validation: ${compilation.diagnostics
        .map((diagnostic) => diagnostic.code)
        .join(", ")}`,
    );
  }
  const slice = requireJanuarySlice(compilation.slices);
  return parseJanuary1990Balance({
    schemaVersion: "january-1990-balance-v1",
    sliceId: slice.sliceId,
    quality: stripFamilyEnvelope(slice.quality),
    skillEvidence: stripFamilyEnvelope(slice.skillEvidence),
  });
}

function requireJanuarySlice(
  slices: readonly BalanceSliceCompilationV1[],
): BalanceSliceCompilationV1 {
  const slice = slices.find((candidate) => candidate.sliceId === JANUARY_1990_BALANCE_SLICE_ID);
  if (slice === undefined) {
    throw new TypeError(`Balance set has no ${JANUARY_1990_BALANCE_SLICE_ID} slice`);
  }
  return slice;
}

function stripFamilyEnvelope(
  document: Readonly<Record<string, unknown>> & { sliceId: string },
): Readonly<Record<string, unknown>> {
  const { schemaVersion: _schemaVersion, sliceId: _sliceId, ...body } = document;
  return body;
}
