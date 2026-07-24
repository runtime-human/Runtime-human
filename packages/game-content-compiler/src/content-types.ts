import type { Node as JsoncNode } from "jsonc-parser";

import type {
  CompiledContentBundleV1,
  CompiledContentProvenanceV1,
  ContentKindV1,
} from "@runtime-human/game-content";
import type { AuthoritativeJsonValue } from "@runtime-human/game-schema";

import type { ContentDiagnostic } from "./content-diagnostics";

export type ContentSourceFile = Readonly<{
  path: string;
  text: string;
}>;

export type ContentSourceDocumentV1 = Readonly<{
  schemaVersion: "content-source-v1";
  id: string;
  kind: ContentKindV1;
  domain: string;
  era: string;
  availableFrom: string;
  availableTo?: string;
  entryPoint: boolean;
  references: readonly string[];
  provenance: readonly CompiledContentProvenanceV1[];
  payload: AuthoritativeJsonValue;
}>;

export type ParsedContentDocument = Readonly<{
  file: ContentSourceFile;
  root: JsoncNode;
  source: ContentSourceDocumentV1;
}>;

export type CompileContentResult =
  | Readonly<{ kind: "success"; bundle: CompiledContentBundleV1 }>
  | Readonly<{ kind: "failure"; diagnostics: readonly ContentDiagnostic[] }>;

export function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
