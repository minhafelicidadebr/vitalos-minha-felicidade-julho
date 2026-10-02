import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/app/shell/AppShell";
import { IvoLensMatrix } from "@/components/ivo/IvoLensMatrix";
import { usePack } from "@/engine/pack";
import { buildIvoMatrix } from "@/engine/ivo/ivo-matrix";
import { getDimensionMappings } from "@/domain/ivo/dimension-mappings";
import { ivoDimensionsForPack, ivoLensCatalog } from "@/domain/ivo/lens-catalog";

// Fundação IVO (ADR-004). Esta tela mostra o CATÁLOGO: 4 dimensões × 4 lentes
// com o estado de cada lente. Não carrega dado de organização nem mock — a
// leitura FIB-T real entra pelo adaptador quando houver sessão autorizada
// (roadmap R5). Nenhuma pontuação é exibida.

export const Route = createFileRoute("/ivo-integral")({
  head: () => ({ meta: [{ title: "IVO integral · 4 dimensões × 4 lentes — VitalOS™" }] }),
  component: IvoIntegralPage,
});

function IvoIntegralPage() {
  const { packId } = usePack();
  const matrix = useMemo(
    () =>
      buildIvoMatrix({
        organizationId: null,
        dimensions: ivoDimensionsForPack(packId),
        lenses: ivoLensCatalog(),
        readings: [],
        mappings: getDimensionMappings(),
      }),
    [packId],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header>
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            IVO · Índice de Vitalidade Organizacional
          </p>
          <h1 className="mt-2 font-serif text-3xl text-foreground">
            Vitalidade que conecta pessoas, vínculos, liderança e sistema institucional
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">medir • aprender • transformar • comprovar</p>
        </header>
        <IvoLensMatrix matrix={matrix} />
        <p className="text-xs text-muted-foreground">
          A FIB-T é a primeira lente funcional (Q2). COPSOQ, PERMA+V e VIA-T estão planejadas e não
          produzem leitura. Associações entre lentes e dimensões dependem de aprovação metodológica.
        </p>
      </div>
    </AppShell>
  );
}
