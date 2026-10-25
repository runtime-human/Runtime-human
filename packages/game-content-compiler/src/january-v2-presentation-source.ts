import { parse as parseJsonc } from "jsonc-parser";

import {
  assertJanuaryV2ApproachBalance,
  JANUARY_V2_APPROACHES,
  JANUARY_V2_DECLARED_CONTEXTS,
  JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
  JANUARY_V2_PROVISIONAL_APPROACH_TABLE,
  resolveJanuaryV2Approach,
  type JanuaryV2Approach,
} from "@runtime-human/game-core";

import { compileContentSources } from "./compile-content-sources";
import type { ContentSourceFile } from "./content-types";

export const JANUARY_V2_PRESENTATION_SOURCE_PATH =
  "content/january-v2/presentation/january-1990.jsonc" as const;
export const JANUARY_V2_PRESENTATION_ID = "core.situation-presentation.january-1990-v2" as const;

const EXPECTED_MARKERS = {
  "investigate-first": ["independent-experience:gain", "finish-chance:cost"],
  "ask-for-help": ["finish-chance:gain", "independent-experience:cost"],
  "reduce-scope": ["release-timing:gain", "scope:cost"],
  "defer-or-recover": ["quality:gain", "release-timing:cost"],
} as const;

const PREVIEW_FORBIDDEN =
  /[\p{N}%％]|(?:\b(?:xp|mastery|readiness|evidence|debugging|programming|npc|mentor|teacher)\b)|(?:наставник|учител|одноклассник|родител|\bдруг\b|лучши|рекоменду|оптимальн|мастерств|отладк|программировани|готовност)/iu;
const PREVIEW_CONTROLS = /[\p{Cc}\p{Cf}]/u;

function closed(value: unknown, keys: readonly string[], where: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${where} must be an object`);
  }
  const record = value as Record<string, unknown>;
  if (JSON.stringify(Object.keys(record).toSorted()) !== JSON.stringify([...keys].toSorted())) {
    throw new TypeError(`${where} must have a closed field set`);
  }
  return record;
}

function string(value: unknown, where: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${where} must be a nonempty string`);
  }
  return value;
}

function array(value: unknown, length: number, where: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length !== length) {
    throw new TypeError(`${where} must have exactly ${length} entries`);
  }
  return value;
}

/**
 * REF-02B1 authoring gate. Validates the separate source before it can be
 * published. Marker witnesses use the frozen January v2 balance oracle;
 * the RU wording and historical code examples still require source review.
 * No runtime, save, or January v1 rules are modified.
 */
export function assertJanuaryV2PresentationSource(files: readonly ContentSourceFile[]): void {
  if (files.length !== 1 || files[0]?.path !== JANUARY_V2_PRESENTATION_SOURCE_PATH) {
    throw new TypeError("January v2 presentation requires exactly its canonical source");
  }
  const compilation = compileContentSources(files);
  if (compilation.kind !== "success") {
    throw new TypeError("January v2 source fails generic compilation");
  }
  const entry = compilation.bundle.chunks.flatMap((chunk) => chunk.entries)[0];
  if (
    entry?.id !== JANUARY_V2_PRESENTATION_ID ||
    entry.kind !== "storylet" ||
    entry.domain !== "programming-v2" ||
    entry.era !== "1990s" ||
    !entry.entryPoint
  ) {
    throw new TypeError("January v2 presentation has an incorrect identity or chunk");
  }
  const document = parseJsonc(files[0].text) as { payload: unknown };
  const payload = closed(
    document.payload,
    [
      "contentType",
      "locale",
      "decisionId",
      "contentVersion",
      "situation",
      "startBackground",
      "learningMode",
      "approaches",
      "listings",
      "strings",
    ],
    "January v2 presentation",
  );
  if (
    payload.contentType !== "january-v2-presentation-v1" ||
    payload.locale !== "ru" ||
    payload.decisionId !== "january-1990/approach" ||
    payload.contentVersion !== "january-1990-presentation-v1"
  ) {
    throw new TypeError("January v2 presentation version and locale mismatch");
  }

  const dictionaryValue = payload.strings;
  if (
    dictionaryValue === null ||
    typeof dictionaryValue !== "object" ||
    Array.isArray(dictionaryValue)
  ) {
    throw new TypeError("January v2 strings must be an object");
  }
  const dictionary = dictionaryValue as Record<string, unknown>;
  const usedKeys = new Set<string>();
  const readText = (value: unknown, where: string, maxLength: number): void => {
    const key = string(value, where);
    if (!/^january\.v2\.[a-z]+(?:\.[a-z]+)*$/u.test(key) || !Object.hasOwn(dictionary, key)) {
      throw new TypeError(`${where} refers to an unknown localization key`);
    }
    usedKeys.add(key);
    const text = string(dictionary[key], key);
    if (
      text.trim() !== text ||
      [...text].length > maxLength ||
      PREVIEW_CONTROLS.test(text) ||
      PREVIEW_FORBIDDEN.test(text)
    ) {
      throw new TypeError(`${key} violates January v2 preview wording limits`);
    }
  };

  const situation = closed(
    payload.situation,
    ["titleKey", "goalKey", "problemKey", "causeKeys", "stakesKey"],
    "situation",
  );
  readText(situation.titleKey, "situation.titleKey", 72);
  readText(situation.goalKey, "situation.goalKey", 180);
  readText(situation.problemKey, "situation.problemKey", 240);
  for (const key of array(situation.causeKeys, 2, "situation.causeKeys")) {
    readText(key, "situation.causeKeys", 180);
  }
  readText(situation.stakesKey, "situation.stakesKey", 180);

  for (const [field, ids, defaultId] of [
    ["startBackground", ["home-pc", "shared-school-pc"], "home-pc"],
    ["learningMode", ["read-and-run", "edit-and-debug"], "read-and-run"],
  ] as const) {
    const family = closed(payload[field], ["defaultOptionId", "options"], field);
    if (family.defaultOptionId !== defaultId) {
      throw new TypeError(`${field} must have the canonical default`);
    }
    for (const [index, option] of array(family.options, 2, `${field}.options`).entries()) {
      const item = closed(option, ["id", "labelKey", "forecastKey"], field);
      if (item.id !== ids[index]) throw new TypeError(`${field} option order mismatch`);
      readText(item.labelKey, `${field}.labelKey`, 64);
      readText(item.forecastKey, `${field}.forecastKey`, 180);
    }
  }

  const approaches = array(payload.approaches, 4, "approaches");
  for (const [index, option] of approaches.entries()) {
    const item = closed(
      option,
      ["id", "availability", "labelKey", "forecastKey", "tradeOffs"],
      "approach",
    );
    if (item.id !== JANUARY_V2_APPROACHES[index] || item.availability !== "available") {
      throw new TypeError("January v2 approach order or availability mismatch");
    }
    readText(item.labelKey, "approach.labelKey", 64);
    readText(item.forecastKey, "approach.forecastKey", 180);
    const markers = array(item.tradeOffs, 2, "approach.tradeOffs");
    for (const [markerIndex, marker] of markers.entries()) {
      const record = closed(marker, ["axis", "polarity", "textKey"], "marker");
      if (
        `${String(record.axis)}:${String(record.polarity)}` !==
        EXPECTED_MARKERS[item.id as JanuaryV2Approach][markerIndex]
      ) {
        throw new TypeError("January v2 marker semantic witness mismatch");
      }
      readText(record.textKey, "marker.textKey", 96);
    }
  }

  const listingTypes = ["syntax-error", "logic-error"] as const;
  for (const [index, item] of array(payload.listings, 2, "listings").entries()) {
    const listing = closed(
      item,
      ["eventType", "captionKey", "highlightedLine", "sourceId", "lines"],
      "listing",
    );
    if (
      listing.eventType !== listingTypes[index] ||
      listing.sourceId !== "microsoft.gw-basic.manual" ||
      listing.highlightedLine !== 20
    ) {
      throw new TypeError("January v2 listing metadata mismatch");
    }
    readText(listing.captionKey, "listing.captionKey", 180);
    for (const [lineIndex, line] of array(listing.lines, 3, "listing.lines").entries()) {
      const text = string(line, "listing line");
      if (!text.startsWith(`${(lineIndex + 1) * 10} `) || text.length > 120) {
        throw new TypeError("January v2 listing lines must be bounded and numbered");
      }
    }
  }

  if (
    Object.keys(dictionary).length !== usedKeys.size ||
    !Object.keys(dictionary).every((key) => usedKeys.has(key))
  ) {
    throw new TypeError("January v2 strings contain unused localization entries");
  }

  // The static marker IDs are insufficient: verify their directions on all
  // declared contexts and every roll against the pinned v2 oracle.
  assertJanuaryV2ApproachBalance(
    JANUARY_V2_PROVISIONAL_APPROACH_TABLE,
    JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
  );
  for (const context of JANUARY_V2_DECLARED_CONTEXTS) {
    const outcomes = (approach: JanuaryV2Approach) =>
      Array.from({ length: 10 }, (_, roll) =>
        resolveJanuaryV2Approach(
          JANUARY_V2_PROVISIONAL_APPROACH_TABLE,
          context,
          approach,
          roll,
          JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
        ),
      );
    const solo = outcomes("investigate-first");
    const help = outcomes("ask-for-help");
    const scope = outcomes("reduce-scope");
    const defer = outcomes("defer-or-recover");
    const finishes = (items: typeof solo) =>
      items.filter((item) => item.delivery !== "delayed-to-february").length;
    if (
      !(finishes(help) > finishes(solo) && finishes(solo) < 10) ||
      !solo.every((item) => item.participation === "independent") ||
      !help.every((item) => item.participation === "assisted") ||
      !scope.every((item) => item.delivery === "released-with-limitation") ||
      !defer.every((item) => item.delivery === "delayed-to-february" && item.quality === "strong")
    ) {
      throw new TypeError("January v2 marker predictions are not supported by balance");
    }
  }
}
