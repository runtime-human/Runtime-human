import {
  RNG_DERIVATION_MANIFEST_V1,
  parseSerializedXoshiro256State,
  type SerializedXoshiro256State,
} from "@runtime-human/game-schema";

import { canonicalizeAuthoritative } from "./authoritative-json";
import { sha256Hex } from "./hash";
import { assertRngDomainPathV1, type RngDomainPathV1 } from "./rng-domain";
import { Xoshiro256StarStar } from "./xoshiro256ss";

const RNG_DERIVATION_DOMAIN = "runtime-human:rng-derivation:v1";
const ZERO_XOSHIRO256_STATE = /^0{64}$/u;

export function deriveRngState(
  rootState: unknown,
  domainPath: RngDomainPathV1,
): SerializedXoshiro256State {
  const parsedRootState = parseSerializedXoshiro256State(rootState);
  assertRngDomainPathV1(domainPath);

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
  domainPath: RngDomainPathV1,
): Xoshiro256StarStar {
  return Xoshiro256StarStar.fromState(deriveRngState(rootState, domainPath));
}
