import { createFileRoute } from "@tanstack/react-router";
import { ProposalPage } from "@/features/proposal/ProposalPage";

// Metadados neutros: sem destinatário, valor ou termos comerciais (circulação restrita).
export const Route = createFileRoute("/proposta")({
  head: () => ({
    meta: [
      { title: "Proposta de implantação · Instituto Felicidade para Todos" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProposalPage,
});
