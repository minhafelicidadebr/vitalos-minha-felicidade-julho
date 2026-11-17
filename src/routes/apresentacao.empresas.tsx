import { createFileRoute } from "@tanstack/react-router";
import { EnterprisePresentation } from "@/features/presentation/EnterprisePresentation";

export const Route = createFileRoute("/apresentacao/empresas")({
  head: () => ({
    meta: [
      { title: "VitalOS™ · Apresentação empresarial" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EnterprisePresentation,
});
