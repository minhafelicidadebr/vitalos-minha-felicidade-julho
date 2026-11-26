import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/app/shell/AppShell";
import { Q2DemoWalkthrough, parseQ2DemoSearch } from "@/features/guide/Q2DemoWalkthrough";
import { ColaboradorDashboard } from "@/app/dashboards/colaborador/ColaboradorDashboard";

export const Route = createFileRoute("/colaborador")({
  validateSearch: parseQ2DemoSearch,
  head: () => ({
    meta: [{ title: "Dashboard — 4 Lentes VitalOS™" }],
  }),
  component: ColaboradorPage,
});

function ColaboradorPage() {
  return (
    <AppShell>
      <Q2DemoWalkthrough step="equipe" search={Route.useSearch()} />
      <ColaboradorDashboard />
    </AppShell>
  );
}
