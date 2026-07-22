// Evidence Explorer — torna o corpus de evidência navegável (LD-005, Fatia B).
//
// Reusa o motor puro (evidence-explorer-engine) e o Evidence Passport já
// existente. Não decide nada sobre confiança — só decide o que fica visível
// e em qual nível de leitura. Fail-closed herdado de filterStudies:
// estudo reprovado no trustGate nunca aparece aqui.

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  explorerSummary,
  filterStudies,
  groupByAxis,
} from "@/engine/evidence/evidence-explorer-engine";
import {
  buildPassport,
  validateEvidenceRegistry,
  type EvidenceRegistry,
  type PassportLevel,
} from "@/engine/evidence/passport-engine";
import { EvidencePassport } from "./EvidencePassport";

const LEVELS: { id: PassportLevel; label: string; hint: string }[] = [
  { id: "humano", label: "Humano", hint: "para qualquer pessoa" },
  { id: "profissional", label: "Profissional", hint: "RH · SST · CHRO" },
  { id: "auditoria", label: "Auditoria", hint: "DPO · jurídico" },
];

export function EvidenceExplorerCard({ registry }: { registry: EvidenceRegistry }) {
  const registryCheck = useMemo(() => validateEvidenceRegistry(registry), [registry]);

  // ─── Erro: registro corrompido nunca renderiza lista ───────────────────────
  if (!registryCheck.valid) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-card p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
          Corpus indisponível
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Nenhum estudo é exibido sem lastro validado. Motivo técnico:{" "}
          {registryCheck.errors[0] ?? "registro não passou na validação de integridade"}.
        </p>
      </div>
    );
  }

  return <EvidenceExplorer studies={registry.studies} />;
}

function EvidenceExplorer({ studies }: { studies: EvidenceRegistry["studies"] }) {
  const [query, setQuery] = useState("");
  const [axis, setAxis] = useState<string | null>(null);
  const [level, setLevel] = useState<PassportLevel>("humano");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const summary = useMemo(() => explorerSummary(studies), [studies]);
  const axisCounts = useMemo(() => groupByAxis(studies), [studies]);
  const filtered = useMemo(
    () => filterStudies(studies, { axis: axis ?? undefined, query }),
    [studies, axis, query],
  );

  const hasFilters = query.trim().length > 0 || axis !== null;

  return (
    <div className="space-y-4">
      {/* Resumo honesto do corpus */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2.5 py-1">
          <strong className="text-foreground">{summary.trusted}</strong> estudos verificados
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1">
          <strong className="text-foreground">{summary.axes}</strong> eixos
        </span>
        {summary.requiringCaveat > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <strong>{summary.requiringCaveat}</strong> com ressalva obrigatória
          </span>
        )}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por citação, mecanismo ou eixo…"
          aria-label="Buscar no corpus de evidência"
          className="w-full rounded-xl border border-border/70 bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Filtro por eixo (chips com contagem) */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por eixo">
        <button
          type="button"
          onClick={() => setAxis(null)}
          aria-pressed={axis === null}
          className={`min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            axis === null
              ? "border-foreground bg-foreground text-background"
              : "border-border/70 bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          Todos ({studies.length})
        </button>
        {axisCounts.map((a) => (
          <button
            key={a.axis}
            type="button"
            onClick={() => setAxis(a.axis === axis ? null : a.axis)}
            aria-pressed={axis === a.axis}
            className={`min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              axis === a.axis
                ? "border-foreground bg-foreground text-background"
                : "border-border/70 bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {a.axis} ({a.count})
          </button>
        ))}
      </div>

      {/* Nível de leitura */}
      <div
        className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5"
        role="group"
        aria-label="Nível de leitura dos estudos"
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

      {/* Vazio: filtro/busca sem resultado */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum estudo encontrado{hasFilters ? " para este filtro" : ""}.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setAxis(null);
              }}
              className="mt-2 text-xs font-medium text-foreground underline underline-offset-2"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((study) => {
            const passport = buildPassport(study, level);
            const isExpanded = expandedId === study.study_id;
            return (
              <li
                key={study.study_id}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : study.study_id)}
                  aria-expanded={isExpanded}
                  className="flex w-full min-h-11 items-start justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {study.origin_driver}
                      </span>
                      {passport.caveat && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                          Ressalva obrigatória
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-sm font-medium text-card-foreground">
                      {study.canonical_citation}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {passport.claim}
                    </p>
                  </div>
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
                {isExpanded && (
                  <div className="border-t border-border/60 p-4 pt-3">
                    <EvidencePassport study={study} defaultLevel={level} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
