// Confirmação obrigatória de persona sintética (FIBT-HML-1B, Fase 3).
//
// Bloqueia o início do formulário até o testador confirmar explicitamente
// que vai usar a persona fictícia fornecida, não a própria experiência.
// `children` só renderiza depois da confirmação — não há como pular.
//
// FIBT-HML-1D (Fase 8): a FIBT-HML-1C confirmou que, sem isso, a confirmação
// persistia ao trocar de link (mesma aba, navegação client-side) — um
// testador podia confirmar uma vez e depois abrir outro convite já
// "confirmado". Defesa dupla: o chamador renderiza este componente com
// `key={token}` (remonta o componente inteiro a cada convite novo) E, aqui
// dentro, um efeito reseta o estado se `token` mudar sem remontagem — a
// segunda camada cobre o caso de algum chamador futuro esquecer a `key`.

import { useEffect, useState } from "react";
import { HML_PERSONA_CONFIRMATION_TEXT } from "@/lib/fibt-hml/hml-frontend-guard";

export function HmlPersonaConfirmationGate({
  children,
  token,
}: {
  children: React.ReactNode;
  token?: string;
}) {
  const [checked, setChecked] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setChecked(false);
    setConfirmed(false);
  }, [token]);

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
