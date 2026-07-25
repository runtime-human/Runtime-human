import type { AuthoritativeJsonValue, Fingerprint } from "@runtime-human/game-schema";

export type JanuaryContentEntryPort = Readonly<{
  id: string;
  kind: "event" | "reference" | "storylet" | "technology";
  references: readonly string[];
  payload: AuthoritativeJsonValue;
}>;

export type JanuaryContentRegistryPort = Readonly<{
  contentFingerprint: Fingerprint;
  get(id: string): JanuaryContentEntryPort | undefined;
}>;
