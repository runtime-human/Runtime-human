import type { RandomSource } from "@runtime-human/game-core";

export type CountingRandomSource = Readonly<{
  random: RandomSource;
  observedCalls(): number;
}>;

export function createCountingRandomSource(source: RandomSource): CountingRandomSource {
  let observedCalls = 0;

  function wrap(random: RandomSource): RandomSource {
    return Object.freeze({
      nextUint32() {
        observedCalls += 1;
        return random.nextUint32();
      },
      nextInt(minInclusive, maxExclusive) {
        observedCalls += 1;
        return random.nextInt(minInclusive, maxExclusive);
      },
      weightedIndex(weights) {
        observedCalls += 1;
        return random.weightedIndex(weights);
      },
      fork(scope) {
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
