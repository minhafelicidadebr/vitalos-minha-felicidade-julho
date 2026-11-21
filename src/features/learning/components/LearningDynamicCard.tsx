// Card de uma dinâmica de aprendizagem (Onda LDX-1) — sempre a partir de um
// CanonicalLearningDynamic já resolvido (nunca decide status aqui). Badge e
// presença do CTA são derivados do registro, nunca digitados por quem chama
// este componente — mesmo princípio do Evidence Passport (nenhuma superfície
// exibe mais certeza do que o registro autoriza).

import type { LucideIcon } from "lucide-react";
import { ArrowRight, Clock } from "lucide-react";
import type { CanonicalLearningDynamic, PublicExposure, PersistenceStatus } from "@/domain/learning/learning-dynamics-registry";

const PERSISTENCE_LABEL: Record<PersistenceStatus, string> = {
  PERSISTED_PRIVATE: "Registro privado",
  PERSISTED_TENANT: "Registro da organização",
  PERSISTED_AGGREGATED: "Registro agregado",
  SESSION_ONLY: "Somente na sessão",
  NONE: "Sem persistência",
  NOT_APPLICABLE: "Não aplicável",
};

const EXPOSURE_LABEL: Record<PublicExposure, string> = {
  AVAILABLE: "Disponível",
  PILOT: "Piloto",
  DEMO: "Demonstração",
  PREPARATION: "Em preparação",
  HIDDEN: "Oculto",
  R_AND_D: "Pesquisa",
};

const EXPOSURE_STYLE: Record<PublicExposure, string> = {
  AVAILABLE: "border-primary/40 bg-primary/10 text-primary",
  PILOT: "border-primary/30 bg-primary/5 text-primary",
  DEMO: "border-border/70 bg-muted/50 text-muted-foreground",
  PREPARATION: "border-dashed border-border/70 bg-transparent text-muted-foreground",
  HIDDEN: "border-border/70 bg-muted/50 text-muted-foreground",
  R_AND_D: "border-dashed border-border/70 bg-transparent text-muted-foreground",
};

/** Só estes runtimeStatus autorizam CTA ativo — mesma allowlist do engine de resolução. */
const OPERATIONAL_RUNTIME_STATUSES = new Set(["REAL", "PARCIAL", "DEMO"]);

export interface LearningDynamicCardProps {
  dynamic: CanonicalLearningDynamic;
  /** Rótulo de duração — vem do conteúdo da rota que chama, nunca do registro de governança. */
  durationLabel?: string;
  /** Ícone decorativo (aria-hidden), escolhido por quem compõe a rota. */
  icon?: LucideIcon;
  /** Ausente = card informativo sem CTA (uso em "Em evolução"). */
  onActivate?: () => void;
  ctaLabel?: string;
}

export function LearningDynamicCard({
  dynamic,
  durationLabel,
  icon: Icon,
  onActivate,
  ctaLabel = "Abrir",
}: LearningDynamicCardProps) {
  // Segunda trava, independente da resolução: mesmo que o chamador passe
  // onActivate por engano, um runtimeStatus de roadmap nunca renderiza CTA.
  const canActivate = Boolean(onActivate) && OPERATIONAL_RUNTIME_STATUSES.has(dynamic.runtimeStatus);

  return (
    <div className="flex h-full min-w-0 flex-col break-words rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          )}
          <p className="font-serif text-base leading-snug text-foreground">{dynamic.title}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${EXPOSURE_STYLE[dynamic.publicExposure]}`}
        >
          {EXPOSURE_LABEL[dynamic.publicExposure]}
        </span>
      </div>

      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{dynamic.primaryOutcome}</p>
      <p className="mt-3 rounded-lg border border-border bg-muted/20 p-2 text-xs leading-relaxed text-muted-foreground">Persistência declarada no registro: <span className="font-medium text-foreground">{PERSISTENCE_LABEL[dynamic.persistenceStatus]}</span>. Consulte as condições da atividade; este status não confirma um envio.</p>

      <div className="mt-3 flex items-center justify-between gap-2">
        {durationLabel ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {durationLabel}
          </span>
        ) : (
          <span />
        )}
        {canActivate && (
          <button
            type="button"
            onClick={onActivate}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
