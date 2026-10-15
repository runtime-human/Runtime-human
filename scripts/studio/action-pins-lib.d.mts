export type ActionPin = Readonly<{ sha: string; version: string }>;

export type ActionUse = Readonly<{ file: string; line: number; ref: string; trailer: string }>;

export const REQUIRED_ACTION_PINS: Readonly<Record<string, ActionPin>>;

export function formatActionPin(action: string, pin: ActionPin): string;
export function collectActionUses(workflows: Readonly<Record<string, string>>): ActionUse[];
export function findActionPinViolations(
  workflows: Readonly<Record<string, string>>,
  requiredPins?: Readonly<Record<string, ActionPin>>,
): string[];
