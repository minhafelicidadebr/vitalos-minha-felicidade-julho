import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/app/shell/AppShell";
import { Q2DemoWalkthrough, parseQ2DemoSearch } from "@/features/guide/Q2DemoWalkthrough";
import { LiderDashboard } from "@/app/dashboards/lider/LiderDashboard";

export const Route = createFileRoute("/lider")({
  validateSearch: parseQ2DemoSearch,
  head: () => ({
    meta: [{ title: "Dashboard do Líder — 4 Lentes VitalOS™" }],
  }),
  component: LiderPage,
});

function LiderPage() {
  return (
    <AppShell>
      <Q2DemoWalkthrough step="lider" search={Route.useSearch()} />
      <LiderDashboard />
    </AppShell>
  );
}
