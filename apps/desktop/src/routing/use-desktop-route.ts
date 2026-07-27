import { useCallback, useEffect, useState } from "react";

import {
  hrefForDesktopRoute,
  resolveDesktopRoute,
  type DesktopRoute,
  type DesktopRouteId,
} from "./desktop-route";

export type DesktopRouteState = Readonly<{
  route: DesktopRoute;
  navigate(id: DesktopRouteId): void;
}>;

export function useDesktopRoute(): DesktopRouteState {
  const [route, setRoute] = useState<DesktopRoute>(() => readCurrentRoute());

  useEffect(() => {
    const handlePopState = () => setRoute(readCurrentRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((id: DesktopRouteId) => {
    const current = readCurrentRoute();
    if (current.id === id) return;

    const href = hrefForDesktopRoute(id);
    window.history.pushState({}, "", href);
    setRoute(resolveDesktopRoute(href));
  }, []);

  return Object.freeze({ route, navigate });
}

function readCurrentRoute(): DesktopRoute {
  if (typeof window === "undefined") return resolveDesktopRoute("/");
  return resolveDesktopRoute(window.location.pathname);
}
