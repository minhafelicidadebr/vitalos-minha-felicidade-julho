// Drawer puramente apresentacional da FlorêncIA — renderiza um
// FlorenciaResponseTemplateResult já computado (allowed/blocked) ou o
// estado vazio (result === null, nenhuma capacidade acionada ainda). Não
// resolve contexto, não roda Policy Gate, não importa registries, não
// persiste nada, não chama LLM. Ainda não é acionado por nenhuma rota —
// wiring em /voz-segura acontece numa etapa futura, com nova autorização.
//
// Reaproveita o Sheet (mesmo primitivo do menu mobile do AppShell) e o
// StatusBadge (doutrina REAL/PARCIAL/DEMO/ROADMAP do CLAUDE.md) — nenhuma
// classificação nova é inventada aqui. nextActionLabel é texto, nunca um
// controle clicável: esta onda não define para onde ele levaria.

import type { FlorenciaResponseTemplateResult } from "@/engine/florencia/response-templates";
import { StatusBadge } from "@/components/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export interface FlorenciaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: FlorenciaResponseTemplateResult | null;
}

export function FlorenciaDrawer({ open, onOpenChange, result }: FlorenciaDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[92vw] max-w-md flex-col overflow-y-auto border-l-border/60 bg-background/98 p-0 backdrop-blur-xl"
      >
        <SheetHeader className="border-b border-border/60 bg-card/55 px-6 py-5 text-left">
          <SheetTitle className="font-serif text-lg">FlorêncIA</SheetTitle>
          <SheetDescription>Copiloto contextual</SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-6 py-6">
          {result === null ? <EmptyState /> : null}
          {result?.status === "blocked" ? <BlockedState result={result} /> : null}
          {result?.status === "allowed" ? <AllowedState result={result} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState() {
  return <p className="text-sm text-muted-foreground">Nenhuma orientação selecionada ainda.</p>;
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
}: {
  result: Extract<FlorenciaResponseTemplateResult, { status: "allowed" }>;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-xl text-foreground">{result.title}</h2>
          <StatusBadge status={result.classification} />
        </div>
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

      <p className="text-sm font-medium text-foreground">
        Próximo passo sugerido: {result.nextActionLabel}
      </p>
    </div>
  );
}
