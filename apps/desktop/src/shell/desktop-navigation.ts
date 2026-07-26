export type DesktopRouteNavigationItem = Readonly<{
  kind: "route";
  id: string;
  index: string;
  label: string;
  detail: string;
  href: string;
  current: boolean;
}>;

export type DesktopPlannedNavigationItem = Readonly<{
  kind: "planned";
  id: string;
  index: string;
  label: string;
}>;

export type DesktopNavigationItem =
  | DesktopRouteNavigationItem
  | DesktopPlannedNavigationItem;
