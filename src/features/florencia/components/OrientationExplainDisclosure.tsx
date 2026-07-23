// Orientation Explain Disclosure — SAFE-VOICE-BRIDGE §5, Fatia C.
//
// Renderiza EXCLUSIVAMENTE os 7 campos do OrientationRationaleViewModel
// (Fatia B) — nunca lê OrientationRationale, mechanism-registry, claim-
// registry ou skill-status diretamente (o ViewModel já é a única fronteira
// segura). Somente leitura: nenhum estado além do disclosure aberto/fechado,
// nenhuma chamada a ActionLog, nenhum evento, nenhuma persistência.
//
// Fechado por padrão. Fail-closed herdado do ViewModel: viewModel === null
// (rationale ausente, órfão, incompatível ou Skill sem nome público curado)
// não renderiza absolutamente nada — nunca um disclosure vazio ou quebrado.
//
// passportReference é apresentado como nota informativa, não como link/
// navegação nova (fora do escopo desta fatia — "não altere o Evidence
// Passport"; nenhuma rota ou âncora nova é criada aqui).

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { OrientationRationaleViewModel } from "@/engine/florencia/orientation-rationale-view-model";

export function OrientationExplainDisclosure({
  viewModel,
}: {
  viewModel: OrientationRationaleViewModel | null;
}) {
  const [open, setOpen] = useState(false);

  if (!viewModel) return null;

  return (
    <div className="border-t border-border/60 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {viewModel.title}
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {viewModel.selectionExplanation}
          </p>

          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Mecanismo por trás
            </h4>
            <p className="text-sm font-medium text-foreground">{viewModel.mechanismPublicName}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {viewModel.mechanismSafeExplanation}
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Evidência que sustenta
            </h4>
            <p className="text-xs leading-relaxed text-muted-foreground">{viewModel.evidenceSummary}</p>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Governança desta capacidade
            </h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Skill responsável: {viewModel.skillPublicName}
            </p>
          </div>

          {viewModel.passportReference && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {viewModel.passportReference.ctaLabel} — disponível na seção de evidência desta página.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
