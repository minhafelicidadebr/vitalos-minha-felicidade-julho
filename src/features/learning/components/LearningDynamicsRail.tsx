// Rail contextual de dinâmicas de aprendizagem (Onda LDX-1) — no máximo 3
// alternativas por momento decisório (doc §7.5/§9), disponíveis com CTA +
// seção recolhida "Em evolução" para PLANNED, sem CTA. Não decide filtro —
// recebe listas já resolvidas por learning-dynamics-resolution.ts.

import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CanonicalLearningDynamic } from "@/domain/learning/learning-dynamics-registry";
import { LearningDynamicCard } from "./LearningDynamicCard";

const MAX_PER_MOMENT = 3;

export interface LearningDynamicsRailProps {
  title: string;
  /** Já filtradas pelo chamador (rota + papel) — este componente só corta em MAX_PER_MOMENT. */
  available: CanonicalLearningDynamic[];
  roadmap?: CanonicalLearningDynamic[];
  getIcon?: (dynamic: CanonicalLearningDynamic) => LucideIcon | undefined;
  getDuration?: (dynamic: CanonicalLearningDynamic) => string | undefined;
  onActivate?: (dynamic: CanonicalLearningDynamic) => void;
}

export function LearningDynamicsRail({
  title,
  available,
  roadmap = [],
  getIcon,
  getDuration,
  onActivate,
}: LearningDynamicsRailProps) {
  const shown = available.slice(0, MAX_PER_MOMENT);

  if (shown.length === 0 && roadmap.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>

      {shown.length > 0 && (
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((dynamic) => (
            <LearningDynamicCard
              key={dynamic.id}
              dynamic={dynamic}
              icon={getIcon?.(dynamic)}
              durationLabel={getDuration?.(dynamic)}
              onActivate={onActivate ? () => onActivate(dynamic) : undefined}
            />
          ))}
        </div>
      )}

      {roadmap.length > 0 && (
        <Collapsible className="mt-3">
          <CollapsibleTrigger className="group flex min-h-9 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
            Em evolução ({roadmap.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {roadmap.map((dynamic) => (
              <div
                key={dynamic.id}
                className="rounded-xl border border-dashed border-border/70 bg-transparent px-3 py-2"
              >
                <p className="text-sm font-medium text-foreground">{dynamic.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{dynamic.primaryOutcome}</p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
