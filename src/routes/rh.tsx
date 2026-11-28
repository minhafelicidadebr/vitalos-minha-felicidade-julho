import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/app/shell/AppShell";
import { Q2DemoWalkthrough, parseQ2DemoSearch } from "@/features/guide/Q2DemoWalkthrough";
import { RHDashboard } from "@/app/dashboards/rh/RHDashboard";
import { Q1PreparationEntry } from "@/components/ivo/Q1PreparationEntry";

export const Route = createFileRoute("/rh")({
  validateSearch: parseQ2DemoSearch,
  head: () => ({
    meta: [{ title: "Visão Executiva RH/CHRO — 4 Lentes VitalOS™" }],
  }),
  component: RHPage,
});

function RHPage() {
  return (
    <AppShell>
      <Q2DemoWalkthrough step="rh" search={Route.useSearch()} />
      <Q1PreparationEntry audience="rh" />
      <RHDashboard />
    </AppShell>
  );
}
