// Banner permanente de homologação sintética (FIBT-HML-1B, Fase 3).
//
// Só renderiza quando `active` é true (ver resolveHmlMode) — nunca aparece na
// aplicação produtiva comum. Não tem botão de fechar: não pode ser
// dispensado pelo usuário. Não imprime o project ref completo, só a forma
// mascarada, e só quando explicitamente pedida (não por padrão).

import { HML_BANNER_TEXT } from "@/lib/fibt-hml/hml-frontend-guard";

export function HmlHomologationBanner({ batchId }: { batchId: string }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="sticky top-0 z-40 border-b-4 border-amber-500 bg-amber-100 px-4 py-3 text-amber-950 shadow-md dark:bg-amber-950 dark:text-amber-100"
    >
      <div className="mx-auto max-w-2xl space-y-1 text-center">
        <p className="text-sm font-extrabold uppercase tracking-[0.14em]">{HML_BANNER_TEXT.line1}</p>
        <p className="text-xs font-bold uppercase tracking-[0.1em]">{HML_BANNER_TEXT.line2}</p>
        <p className="text-xs font-semibold leading-relaxed">{HML_BANNER_TEXT.line3}</p>
        <p className="text-xs font-semibold leading-relaxed">{HML_BANNER_TEXT.line4}</p>
        <p className="text-[11px] italic leading-relaxed opacity-90">{HML_BANNER_TEXT.line5}</p>
        <p className="text-[10px] uppercase tracking-[0.1em] opacity-70">Lote: {batchId}</p>
      </div>
    </div>
  );
}
