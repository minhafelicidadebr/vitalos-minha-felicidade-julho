import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/app/shell/AppShell";
import { ColaboradorDashboard } from "@/app/dashboards/colaborador/ColaboradorDashboard";

export const Route = createFileRoute("/colaborador")({
  head: () => ({
    meta: [{ title: "Dashboard — 4 Lentes VITA" }],
  }),
  component: ColaboradorPage,
});

function ColaboradorPage() {
  return (
    <AppShell>
      <ColaboradorDashboard />
    </AppShell>
  );
}
