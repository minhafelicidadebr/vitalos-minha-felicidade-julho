// Evidence Passport — o selo de honestidade científica do VitalOS.
//
// Renderiza EXCLUSIVAMENTE a saída de buildPassport(): todo texto de status é
// derivado dos códigos do registro congelado. Nenhuma string de confiança é
// digitada aqui — é o fix por construção do bug RECOG-2020 (protótipo que
// exibia "verificado" para estudo pendente).

import { useState } from "react";
import { buildPassport, type EvidenceStudy, type PassportLevel } from "@/engine/evidence/passport-engine";

const LEVELS: { id: PassportLevel; label: string; hint: string }[] = [
  { id: "humano", label: "Humano", hint: "para qualquer pessoa" },
  { id: "profissional", label: "Profissional", hint: "RH · SST · CHRO" },
  { id: "auditoria", label: "Auditoria", hint: "DPO · jurídico" },
];

export function EvidencePassport({
  study,
  role,
  defaultLevel = "humano",
}: {
  study: EvidenceStudy;
  /** "principal" | "complementar" — posição no orçamento de evidência da atividade. */
  role?: string;
  defaultLevel?: PassportLevel;
}) {
  const [level, setLevel] = useState<PassportLevel>(defaultLevel);
  const passport = buildPassport(study, level);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Passaporte de Evidência{role ? ` · fonte ${role}` : ""}
        </p>
        <div
          className="flex rounded-lg border border-border/70 bg-muted/40 p-0.5"
          role="group"
          aria-label="Nível de leitura do passaporte"
        >
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevel(l.id)}
              aria-pressed={level === l.id}
              title={l.hint}
              className={`min-h-8 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                level === l.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-card-foreground">{passport.claim}</p>

      {passport.caveat && (
        <div
          className="mt-3 rounded-r-lg border-l-4 border-amber-400 bg-amber-50/60 px-3 py-2 dark:bg-amber-950/20"
          role="note"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            <span className="font-semibold">Ressalva obrigatória: </span>
            {passport.caveat}
          </p>
        </div>
      )}

      <dl className="mt-3 space-y-1.5">
        {passport.lines.map((line) => (
          <div key={line.label} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <dt className="shrink-0 text-xs font-medium text-muted-foreground sm:w-44">
              {line.label}
            </dt>
            <dd className="text-xs leading-relaxed text-card-foreground">{line.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
