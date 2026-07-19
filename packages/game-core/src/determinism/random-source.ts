import type { SerializedXoshiro256State } from "@runtime-human/game-schema";

export interface RandomSource {
  nextUint32(): number;
  nextInt(minInclusive: number, maxExclusive: number): number;
  weightedIndex(weights: readonly number[]): number;
  fork(scope: string): RandomSource;
  exportState(): SerializedXoshiro256State;
}
