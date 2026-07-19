import { uniformBigInt } from "pure-rand/distribution/uniformBigInt";
import { uniformInt } from "pure-rand/distribution/uniformInt";
import type { RandomGenerator } from "pure-rand/types/RandomGenerator";
import {
  parseSerializedXoshiro256State,
  type SerializedXoshiro256State,
} from "@runtime-human/game-schema";

import { sha256Hex } from "./hash";
import type { RandomSource } from "./random-source";

const UINT64_MASK = 0xffff_ffff_ffff_ffffn;
const UINT32_MASK = 0xffff_ffffn;
const SPLITMIX64_GAMMA = 0x9e37_79b9_7f4a_7c15n;
const SPLITMIX64_MIX_1 = 0xbf58_476d_1ce4_e5b9n;
const SPLITMIX64_MIX_2 = 0x94d0_49bb_1331_11ebn;
const MAX_WEIGHT_COUNT = 100_000;

type XoshiroState = [bigint, bigint, bigint, bigint];

export class Xoshiro256StarStar implements RandomGenerator, RandomSource {
  private constructor(private state: XoshiroState) {}

  static fromSeed(seed: bigint): Xoshiro256StarStar {
    if (seed < 0n || seed > UINT64_MASK) {
      throw new RangeError("Xoshiro256** seed must be an unsigned 64-bit integer");
    }

    let splitState = seed;
    const words: bigint[] = [];
    for (let index = 0; index < 4; index += 1) {
      splitState = (splitState + SPLITMIX64_GAMMA) & UINT64_MASK;
      let value = splitState;
      value = ((value ^ (value >> 30n)) * SPLITMIX64_MIX_1) & UINT64_MASK;
      value = ((value ^ (value >> 27n)) * SPLITMIX64_MIX_2) & UINT64_MASK;
      words.push((value ^ (value >> 31n)) & UINT64_MASK);
    }

    return new Xoshiro256StarStar(toStateTuple(words));
  }

  static fromState(value: unknown): Xoshiro256StarStar {
    const serialized = parseSerializedXoshiro256State(value);
    return new Xoshiro256StarStar(deserializeState(serialized));
  }

  clone(): Xoshiro256StarStar {
    const [s0, s1, s2, s3] = this.state;
    return new Xoshiro256StarStar([s0, s1, s2, s3]);
  }

  next(): number {
    return this.nextUint32() | 0;
  }

  nextUint32(): number {
    return Number((this.nextUint64() >> 32n) & UINT32_MASK);
  }

  nextUint64(): bigint {
    const [s0, s1, s2, s3] = this.state;
    const result = (rotateLeft64((s1 * 5n) & UINT64_MASK, 7n) * 9n) & UINT64_MASK;
    const shifted = (s1 << 17n) & UINT64_MASK;
    const nextS2 = (s2 ^ s0) & UINT64_MASK;
    const nextS3 = (s3 ^ s1) & UINT64_MASK;
    const nextS1 = (s1 ^ nextS2) & UINT64_MASK;
    const nextS0 = (s0 ^ nextS3) & UINT64_MASK;

    this.state = [nextS0, nextS1, (nextS2 ^ shifted) & UINT64_MASK, rotateLeft64(nextS3, 45n)];
    return result;
  }

  nextInt(minInclusive: number, maxExclusive: number): number {
    if (
      !Number.isSafeInteger(minInclusive) ||
      !Number.isSafeInteger(maxExclusive) ||
      minInclusive >= maxExclusive
    ) {
      throw new RangeError("Integer range must be non-empty and use safe integers");
    }
    return uniformInt(this, minInclusive, maxExclusive - 1);
  }

  weightedIndex(weights: readonly number[]): number {
    if (weights.length === 0 || weights.length > MAX_WEIGHT_COUNT) {
      throw new RangeError(`Weight count must be between 1 and ${MAX_WEIGHT_COUNT}`);
    }

    let total = 0n;
    for (const weight of weights) {
      if (!Number.isSafeInteger(weight) || weight < 0) {
        throw new RangeError("Weights must be non-negative safe integers");
      }
      total += BigInt(weight);
    }
    if (total === 0n) {
      throw new RangeError("At least one weight must be positive");
    }

    const selected = uniformBigInt(this, 0n, total - 1n);
    let cursor = 0n;
    for (let index = 0; index < weights.length; index += 1) {
      cursor += BigInt(weights[index] ?? 0);
      if (selected < cursor) {
        return index;
      }
    }
    throw new Error("Weighted selection invariant failed");
  }

  fork(scope: string): Xoshiro256StarStar {
    if (scope.length === 0 || scope.length > 1_024 || scope.includes("\0")) {
      throw new TypeError("RNG scope must contain 1-1024 characters without NUL");
    }

    let childState = sha256Hex(`runtime-human:rng-fork:v1\0${this.exportState()}\0${scope}`);
    if (/^0{64}$/u.test(childState)) {
      childState = `01${childState.slice(2)}`;
    }
    return Xoshiro256StarStar.fromState(childState);
  }

  exportState(): SerializedXoshiro256State {
    return parseSerializedXoshiro256State(serializeState(this.state));
  }

  getState(): readonly number[] {
    return this.state.flatMap((word) => [
      Number(word & UINT32_MASK) | 0,
      Number((word >> 32n) & UINT32_MASK) | 0,
    ]);
  }
}

function rotateLeft64(value: bigint, shift: bigint): bigint {
  return ((value << shift) & UINT64_MASK) | (value >> (64n - shift));
}

function serializeState(state: XoshiroState): string {
  return state.map(serializeWordLittleEndian).join("");
}

function serializeWordLittleEndian(word: bigint): string {
  let result = "";
  for (let byte = 0n; byte < 8n; byte += 1n) {
    result += Number((word >> (byte * 8n)) & 0xffn)
      .toString(16)
      .padStart(2, "0");
  }
  return result;
}

function deserializeState(serialized: SerializedXoshiro256State): XoshiroState {
  const words: bigint[] = [];
  for (let wordIndex = 0; wordIndex < 4; wordIndex += 1) {
    let word = 0n;
    for (let byteIndex = 0; byteIndex < 8; byteIndex += 1) {
      const offset = (wordIndex * 8 + byteIndex) * 2;
      const byte = Number.parseInt(serialized.slice(offset, offset + 2), 16);
      word |= BigInt(byte) << BigInt(byteIndex * 8);
    }
    words.push(word & UINT64_MASK);
  }
  return toStateTuple(words);
}

function toStateTuple(words: readonly bigint[]): XoshiroState {
  const [s0, s1, s2, s3] = words;
  if (s0 === undefined || s1 === undefined || s2 === undefined || s3 === undefined) {
    throw new TypeError("Xoshiro256** state requires four words");
  }
  return [s0, s1, s2, s3];
}
