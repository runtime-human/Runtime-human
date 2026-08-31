import {
  RNG_DERIVATION_MANIFEST_V1,
  parseSerializedXoshiro256State,
  type SerializedXoshiro256State,
} from "@runtime-human/game-schema";

import { canonicalizeAuthoritative } from "./authoritative-json";
import { sha256Hex } from "./hash";
import { Xoshiro256StarStar } from "./xoshiro256ss";

const RNG_DERIVATION_DOMAIN = "runtime-human:rng-derivation:v1";
const ZERO_XOSHIRO256_STATE = /^0{64}$/u;

export function deriveRngState(
  rootState: unknown,
  domainPath: readonly string[],
): SerializedXoshiro256State {
  const parsedRootState = parseSerializedXoshiro256State(rootState);
  validateDomainPath(domainPath);

  let derivedState = sha256Hex(
    canonicalizeAuthoritative({
      domain: RNG_DERIVATION_DOMAIN,
      manifest: RNG_DERIVATION_MANIFEST_V1,
      path: domainPath,
      rootState: parsedRootState,
    }),
  );

  if (ZERO_XOSHIRO256_STATE.test(derivedState)) {
    derivedState = `01${derivedState.slice(2)}`;
  }

  return parseSerializedXoshiro256State(derivedState);
}

export function deriveRandomSource(
  rootState: unknown,
  domainPath: readonly string[],
): Xoshiro256StarStar {
  return Xoshiro256StarStar.fromState(deriveRngState(rootState, domainPath));
}

function validateDomainPath(domainPath: readonly string[]): void {
  if (domainPath.length === 0) {
    throw new TypeError("RNG domain path must contain at least one segment");
  }

  for (const segment of domainPath) {
    if (segment.length === 0 || segment.includes("\0")) {
      throw new TypeError("RNG domain path segments must be non-empty and contain no NUL");
    }
  }
}
