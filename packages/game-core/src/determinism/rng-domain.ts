const CONTENT_PURPOSES_V1 = Object.freeze(["selection"] as const);
const NARRATIVE_PURPOSES_V1 = Object.freeze(["event-selection", "variant"] as const);
const OUTCOME_PURPOSES_V1 = Object.freeze(["quality-roll"] as const);
const NPC_PURPOSES_V1 = Object.freeze(["action-choice", "tie-break"] as const);
const PROJECT_PURPOSES_V1 = Object.freeze(["work-package-outcome"] as const);

export const RNG_DOMAIN_PURPOSES_V1 = Object.freeze({
  content: CONTENT_PURPOSES_V1,
  narrative: NARRATIVE_PURPOSES_V1,
  outcome: OUTCOME_PURPOSES_V1,
  npc: NPC_PURPOSES_V1,
  project: PROJECT_PURPOSES_V1,
} as const);

export type RngDomainV1 = keyof typeof RNG_DOMAIN_PURPOSES_V1;
export type RngDomainPurposeV1<Domain extends RngDomainV1> =
  (typeof RNG_DOMAIN_PURPOSES_V1)[Domain][number];

type RngDomainDescriptorByDomainV1 = {
  readonly [Domain in RngDomainV1]: Readonly<{
    month: string;
    domain: Domain;
    entityId: string;
    purpose: RngDomainPurposeV1<Domain>;
  }>;
};

export type RngDomainDescriptorV1 = RngDomainDescriptorByDomainV1[RngDomainV1];

declare const rngDomainPathV1Brand: unique symbol;

export type RngDomainPathV1 = readonly [
  `month:${string}`,
  `domain:${RngDomainV1}`,
  `entity:${string}`,
  `purpose:${string}`,
] & {
  readonly [rngDomainPathV1Brand]: "RngDomainPathV1";
};

const MONTH_PATTERN = /^[1-9]\d{3}-(?:0[1-9]|1[0-2])$/u;
const MACHINE_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,255}$/u;

export function createRngDomainPathV1(
  descriptor: RngDomainDescriptorV1,
): RngDomainPathV1 {
  validateDomainIdentity(
    descriptor.month,
    descriptor.domain,
    descriptor.entityId,
    descriptor.purpose,
  );

  return Object.freeze([
    `month:${descriptor.month}`,
    `domain:${descriptor.domain}`,
    `entity:${descriptor.entityId}`,
    `purpose:${descriptor.purpose}`,
  ]) as RngDomainPathV1;
}

export function assertRngDomainPathV1(value: unknown): asserts value is RngDomainPathV1 {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    value.some((segment) => typeof segment !== "string")
  ) {
    throw new TypeError("RNG domain path v1 must contain exactly four string segments");
  }

  const [monthSegment, domainSegment, entitySegment, purposeSegment] = value as string[];
  if (
    !monthSegment?.startsWith("month:") ||
    !domainSegment?.startsWith("domain:") ||
    !entitySegment?.startsWith("entity:") ||
    !purposeSegment?.startsWith("purpose:")
  ) {
    throw new TypeError("RNG domain path v1 uses an invalid segment layout");
  }

  validateDomainIdentity(
    monthSegment.slice("month:".length),
    domainSegment.slice("domain:".length),
    entitySegment.slice("entity:".length),
    purposeSegment.slice("purpose:".length),
  );
}

function validateDomainIdentity(
  month: string,
  domain: string,
  entityId: string,
  purpose: string,
): void {
  if (!MONTH_PATTERN.test(month)) {
    throw new TypeError("RNG month identity must use a valid YYYY-MM value");
  }
  if (!isRngDomainV1(domain)) {
    throw new TypeError(`Unknown RNG domain v1: ${domain}`);
  }
  if (!MACHINE_ID_PATTERN.test(entityId)) {
    throw new TypeError(
      "RNG entity identity must be a 1-256 character lowercase ASCII machine ID",
    );
  }
  const purposes = RNG_DOMAIN_PURPOSES_V1[domain] as readonly string[];
  if (!purposes.includes(purpose)) {
    throw new TypeError(`RNG purpose ${purpose} is not registered for domain ${domain}`);
  }
}

function isRngDomainV1(value: string): value is RngDomainV1 {
  return Object.hasOwn(RNG_DOMAIN_PURPOSES_V1, value);
}
