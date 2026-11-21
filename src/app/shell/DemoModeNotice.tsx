import { FlaskConical } from "lucide-react";

/** Contexto global da sessão exploratória; a página deve explicar dados específicos. */
export function DemoModeNotice() {
  return (
    <aside
      role="note"
      aria-label="Modo demonstração"
      className="mx-4 mb-4 flex max-w-7xl items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground sm:mx-6 sm:mb-6 sm:px-5 xl:mx-auto"
    >
      <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
      <p className="min-w-0">
        <strong>Modo demonstração.</strong> Esta sessão explora o produto com perfis e dados que
        podem ser exemplos. Confira a origem e os limites indicados em cada página antes de
        interpretar ou compartilhar resultados.
      </p>
    </aside>
  );
}
