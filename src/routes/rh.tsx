import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/app/shell/AppShell";
import { RHDashboard } from "@/app/dashboards/rh/RHDashboard";

export const Route = createFileRoute("/rh")({
  head: () => ({
    meta: [{ title: "Visão Executiva RH/CHRO — 4 Lentes VitalOS™" }],
  }),
  component: RHPage,
});

function RHPage() {
  return (
    <AppShell>
      <RHDashboard />
    </AppShell>
  );
}
