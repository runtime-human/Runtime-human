import type { RandomSource } from "@runtime-human/game-core";

export type CountingRandomSource = Readonly<{
  random: RandomSource;
  observedCalls(): number;
}>;

export function createCountingRandomSource(source: RandomSource): CountingRandomSource {
  let observedCalls = 0;

  function wrap(random: RandomSource): RandomSource {
    return Object.freeze({
      nextUint32(): number {
        observedCalls += 1;
        return random.nextUint32();
      },
      nextInt(minInclusive: number, maxExclusive: number): number {
        observedCalls += 1;
        return random.nextInt(minInclusive, maxExclusive);
      },
      weightedIndex(weights: readonly number[]): number {
        observedCalls += 1;
        return random.weightedIndex(weights);
      },
      fork(scope: string): RandomSource {
        return wrap(random.fork(scope));
      },
      exportState() {
        return random.exportState();
      },
    });
  }

  return Object.freeze({
    random: wrap(source),
    observedCalls: () => observedCalls,
  });
}
