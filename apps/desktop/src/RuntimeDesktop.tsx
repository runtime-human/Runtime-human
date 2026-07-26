import { JanuaryRuntimeScreen } from "./january/JanuaryRuntimeScreen";
import type { JanuarySessionState } from "./january/use-january-session";
import { CareerOverviewPlaceholder } from "./overview/CareerOverviewPlaceholder";
import {
  hrefForDesktopRoute,
  type DesktopRoute,
  type DesktopRouteId,
} from "./routing/desktop-route";
import { DesktopShell, type DesktopNavigationItem } from "./shell/DesktopShell";

export type RuntimeDesktopProps = Readonly<{
  route: DesktopRoute;
  navigate(id: DesktopRouteId): void;
  session: JanuarySessionState;
}>;

const PLANNED_NAVIGATION = Object.freeze<readonly DesktopNavigationItem[]>([
  Object.freeze({ kind: "planned", id: "skills", index: "03", label: "Навыки" }),
  Object.freeze({ kind: "planned", id: "relationships", index: "04", label: "Связи" }),
  Object.freeze({ kind: "planned", id: "chronology", index: "05", label: "Хронология" }),
  Object.freeze({ kind: "planned", id: "archive", index: "06", label: "Архив" }),
]);

export function RuntimeDesktop({ route, navigate, session }: RuntimeDesktopProps) {
  const navigation = buildNavigation(route.id);
  const currentMonth = route.id === "current-month";

  return (
    <DesktopShell
      breadcrumb={currentMonth ? "Январь 1990" : "Обзор карьеры"}
      era="Персональные компьютеры"
      navigation={navigation}
      onNavigate={(id) => {
        if (isDesktopRouteId(id)) navigate(id);
      }}
      profile="Локальная карьера"
      status={
        <>
          <span>Локальное сохранение и восстановление сеанса</span>
          <strong>{session.busy ? "Операция выполняется" : "Состояние сохранено"}</strong>
        </>
      }
    >
      {currentMonth ? (
        <JanuaryRuntimeScreen
          busy={session.busy}
          onChoose={(choice) => void session.choose(choice)}
          onRetry={() => void session.retry()}
          onStart={() => void session.start()}
          view={session.view}
        />
      ) : (
        <CareerOverviewPlaceholder
          onOpenCurrentMonth={() => navigate("current-month")}
          view={session.view}
        />
      )}
    </DesktopShell>
  );
}

function buildNavigation(current: DesktopRouteId): readonly DesktopNavigationItem[] {
  return Object.freeze([
    Object.freeze({
      kind: "route" as const,
      id: "overview",
      index: "01",
      label: "Обзор карьеры",
      detail: "Текущая история",
      href: hrefForDesktopRoute("overview"),
      current: current === "overview",
    }),
    Object.freeze({
      kind: "route" as const,
      id: "current-month",
      index: "02",
      label: "Текущий месяц",
      detail: "Январь 1990",
      href: hrefForDesktopRoute("current-month"),
      current: current === "current-month",
    }),
    ...PLANNED_NAVIGATION,
  ]);
}

function isDesktopRouteId(id: string): id is DesktopRouteId {
  return id === "overview" || id === "current-month";
}
