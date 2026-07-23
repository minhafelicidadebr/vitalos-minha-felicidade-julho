// Drawer puramente apresentacional da FlorêncIA — renderiza um
// FlorenciaResponseTemplateResult já computado (allowed/blocked) ou o
// estado vazio (result === null, nenhuma capacidade acionada ainda). Não
// resolve contexto, não roda Policy Gate, não importa registries, não
// persiste nada, não chama LLM. Acionado por /voz-segura via
// FlorenciaSafeConversationEntryPoint (onInteraction registra o desfecho
// "allowed" no ActionLog local da rota — o drawer em si continua sem
// gravar nada).
//
// Reaproveita o Sheet (mesmo primitivo do menu mobile do AppShell) e o
// StatusBadge (doutrina REAL/PARCIAL/DEMO/ROADMAP do CLAUDE.md) — nenhuma
// classificação nova é inventada aqui. nextActionLabel é texto, nunca um
// controle clicável: esta onda não define para onde ele levaria.

import type { FlorenciaResponseTemplateResult } from "@/engine/florencia/response-templates";
import type { OrientationRationaleViewModel } from "@/engine/florencia/orientation-rationale-view-model";
import { StatusBadge } from "@/components/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OrientationExplainDisclosure } from "./OrientationExplainDisclosure";

export interface FlorenciaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: FlorenciaResponseTemplateResult | null;
  /**
   * SAFE-VOICE-BRIDGE §5, Fatia C — projeção já computada pelo caller
   * (nunca resolvida aqui: o drawer continua puramente apresentacional).
   * Opcional/null por padrão — nenhum caller existente precisa mudar.
   */
  viewModel?: OrientationRationaleViewModel | null;
}

export function FlorenciaDrawer({ open, onOpenChange, result, viewModel = null }: FlorenciaDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[92vw] max-w-md flex-col overflow-y-auto border-l-border/60 bg-background/98 p-0 backdrop-blur-xl"
      >
        <SheetHeader className="border-b border-border/60 bg-card/55 px-6 py-5 text-left">
          <SheetTitle className="font-serif text-lg">FlorêncIA — Copiloto VitalOS</SheetTitle>
          <SheetDescription>
            Inteligência para compreender, aprender, transformar e evoluir.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-6 py-6">
          {result === null ? <EmptyState /> : null}
          {result?.status === "blocked" ? <BlockedState result={result} /> : null}
          {result?.status === "allowed" ? <AllowedState result={result} viewModel={viewModel} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Fallback defensivo — o orquestrador não deve abrir o drawer com
// result === null. O drawer não busca, gera ou reconstrói o resultado.
function EmptyState() {
  return <p className="text-sm text-muted-foreground">Não foi possível preparar esta orientação.</p>;
}

function BlockedState({
  result,
}: {
  result: Extract<FlorenciaResponseTemplateResult, { status: "blocked" }>;
}) {
  return <p className="text-sm text-foreground">{result.safeMessage}</p>;
}

function AllowedState({
  result,
  viewModel,
}: {
  result: Extract<FlorenciaResponseTemplateResult, { status: "allowed" }>;
  viewModel: OrientationRationaleViewModel | null;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-xl text-foreground">{result.title}</h2>
          <StatusBadge status={result.classification} />
        </div>
        {result.classification === "DEMO" ? (
          <p className="text-xs text-muted-foreground">Conteúdo demonstrativo.</p>
        ) : null}
        {result.requiresHumanReview ? (
          <p className="rounded-lg border border-amber-400/40 bg-amber-50/60 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-300" role="note">
            Requer revisão humana antes de qualquer uso real — esta orientação não é
            aprovação automática.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">{result.summary}</p>
      </div>

      <Separator />

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Como conduzir
        </h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
          {result.guidance.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>

      <Separator />

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Limites desta orientação
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {result.limitations.map((limitation, index) => (
            <li key={index}>{limitation}</li>
          ))}
        </ul>
      </div>

      <Separator />

      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Próximo passo sugerido
        </h3>
        <p className="text-sm font-medium text-foreground">{result.nextActionLabel}</p>
      </div>

      <OrientationExplainDisclosure viewModel={viewModel} />
    </div>
  );
}
