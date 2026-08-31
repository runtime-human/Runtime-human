export type VersionState = Readonly<{
  canonical: string;
  rootPackage: string;
  desktopPackage: string;
  cargoPackage: string;
  cargoLockPackage: string;
}>;

export type VersionCheck = Readonly<{
  ok: boolean;
  version: string;
  errors: string[];
}>;

export function readVersionState(root?: string): VersionState;
export function checkVersionState(state: VersionState): VersionCheck;
export function nextGameVersion(version: string): string;
export function bumpGameVersion(
  root?: string,
  explicitTarget?: string,
): Readonly<{ previous: string; version: string }>;
