export type DesktopRouteId = "overview" | "current-month";

export type DesktopRoute = Readonly<{
  id: DesktopRouteId;
  path: string;
}>;

const OVERVIEW_ROUTE = Object.freeze<DesktopRoute>({
  id: "overview",
  path: "/",
});

const CURRENT_MONTH_ROUTE = Object.freeze<DesktopRoute>({
  id: "current-month",
  path: "/month/current",
});

export function resolveDesktopRoute(pathname: string): DesktopRoute {
  const normalized = normalizePathname(pathname);
  return normalized === CURRENT_MONTH_ROUTE.path ? CURRENT_MONTH_ROUTE : OVERVIEW_ROUTE;
}

export function hrefForDesktopRoute(id: DesktopRouteId): string {
  return id === "current-month" ? CURRENT_MONTH_ROUTE.path : OVERVIEW_ROUTE.path;
}

function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed.startsWith("/")) return OVERVIEW_ROUTE.path;
  if (trimmed === "/") return OVERVIEW_ROUTE.path;
  return trimmed.replace(/\/+$/u, "");
}
