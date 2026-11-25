import { createFileRoute } from "@tanstack/react-router";
import { EcosystemProposalPage } from "@/features/proposal/ecosystem/EcosystemProposal";

// Metadados neutros: sem destinatário, valor ou termos comerciais (circulação restrita).
export const Route = createFileRoute("/proposta_/ecossistema")({
  head: () => ({
    meta: [
      { title: "Proposta para o ecossistema · Instituto Felicidade para Todos" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EcosystemProposalPage,
});
