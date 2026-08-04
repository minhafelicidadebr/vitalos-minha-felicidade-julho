// Confirmação obrigatória de persona sintética (FIBT-HML-1B, Fase 3).
//
// Bloqueia o início do formulário até o testador confirmar explicitamente
// que vai usar a persona fictícia fornecida, não a própria experiência.
// `children` só renderiza depois da confirmação — não há como pular.

import { useState } from "react";
import { HML_PERSONA_CONFIRMATION_TEXT } from "@/lib/fibt-hml/hml-frontend-guard";

export function HmlPersonaConfirmationGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) return <>{children}</>;

  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/30">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
        Confirmação obrigatória antes de iniciar
      </p>
      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300/70 bg-card p-4 transition-colors hover:bg-amber-50/60 dark:border-amber-800/50">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border accent-amber-600"
          aria-label={HML_PERSONA_CONFIRMATION_TEXT}
        />
        <span className="text-sm leading-relaxed text-foreground">{HML_PERSONA_CONFIRMATION_TEXT}</span>
      </label>
      <button
        type="button"
        disabled={!checked}
        onClick={() => setConfirmed(true)}
        className="mt-4 w-full rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Confirmar e iniciar o teste
      </button>
    </div>
  );
}
