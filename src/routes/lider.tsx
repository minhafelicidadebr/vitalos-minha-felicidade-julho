import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/app/shell/AppShell";
import { LiderDashboard } from "@/app/dashboards/lider/LiderDashboard";

export const Route = createFileRoute("/lider")({
  head: () => ({
    meta: [{ title: "Dashboard do Líder — 4 Lentes VITA" }],
  }),
  component: LiderPage,
});

function LiderPage() {
  return (
    <AppShell>
      <LiderDashboard />
    </AppShell>
  );
}
