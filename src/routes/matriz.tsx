// /matriz — Matriz de Intersecção Científica (NR-1 × COPSOQ II × FIB-T). Superfície viva que
// cruza os 12 drivers canônicos com as dimensões de medição, comutando entre a lente de RISCO
// (COPSOQ II, Domínio B) e a de ECOSSISTEMA (FIB-T). Compõe o crosswalk-engine (puro): a
// exposição agregada MEDIDA prioriza os drivers (Medir→Transformar). Honestidade: força ≠
// causalidade; desfechos nunca são célula de driver; k-anon respeitado.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Microscope, MousePointerClick, Sprout, Target } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import {
  cellAt,
  rankDriversByExposure,
  type Instrument,
  type Priority,
} from "@/engine/nr1/crosswalk-engine";
import { DEMO_COPSOQ_EXPOSURE, NR1_CROSSWALK as R } from "@/mocks/nr1-crosswalk-mock";

export const Route = createFileRoute("/matriz")({
  head: () => ({ meta: [{ title: "Matriz de Intersecção — 4 Lentes VitalOS™" }] }),
  component: MatrizPage,
});

const PRIORITY_DOT: Record<Priority, string> = {
  P0: "bg-red-500",
  P1: "bg-amber-500",
  P2: "bg-sky-500",
};
const PRIORITY_TINT: Record<Priority, string> = {
  P0: "border-red-400/50 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  P1: "border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  P2: "border-sky-400/50 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
};

function strengthClass(s: number): string {
  if (s >= 0.85) return "bg-primary/90";
  if (s >= 0.6) return "bg-primary/60";
  if (s >= 0.4) return "bg-primary/35";
  if (s > 0) return "bg-primary/15";
  return "bg-muted/30";
}

function MatrizPage() {
  const [lens, setLens] = useState<Instrument>("copsoq");
  const [filter, setFilter] = useState<"ALL" | Priority>("ALL");
  const [sel, setSel] = useState<{ d: string; dim: string } | null>(null);

  const columns = useMemo(
    () => R.dimensions.filter((dim) => dim.instrument === lens && !dim.isOutcome),
    [lens],
  );

  // Medir → Transformar: a exposição COPSOQ agregada (demo) aponta onde focar agora.
  const focus = useMemo(
    () => rankDriversByExposure(R, DEMO_COPSOQ_EXPOSURE).filter((x) => x.priority).slice(0, 3),
    [],
  );

  const selDriver = sel ? R.drivers.find((d) => d.id === sel.d) : null;
  const selDim = sel ? R.dimensions.find((x) => x.id === sel.dim) : null;
  const selCell = sel ? cellAt(R, sel.d, sel.dim) : undefined;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Matriz de intersecção científica · NR-1 × COPSOQ II × FIB-T
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">
            Da norma ao driver, em uma superfície viva
          </h1>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Cada driver de trabalho saudável cruzado com as dimensões que o medem. Troque a lente
            entre <span className="font-medium text-foreground">risco psicossocial</span> (COPSOQ II)
            e <span className="font-medium text-foreground">ecossistema</span> (FIB-T). Toque numa
            célula para ver a hipótese, a implicação NR-1 e a intervenção — com fonte.
          </p>
        </motion.header>

        {/* Espinha M.E.T.E. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {[
            ["Medir", "COPSOQ II + FIB-T"],
            ["Educar", "conteúdo do driver"],
            ["Transformar", "intervenção priorizada"],
            ["Evoluir", "reavaliação k≥5"],
          ].map(([a, b], i) => (
            <span key={a} className="inline-flex items-center gap-1.5">
              <span className="font-medium text-foreground">{a}</span>
              <span className="text-muted-foreground/70">{b}</span>
              {i < 3 && <ArrowRight className="h-3 w-3 opacity-40" aria-hidden />}
            </span>
          ))}
        </div>

        {/* Onde focar agora — Medir→Transformar */}
        {focus.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="rounded-2xl border border-primary/25 bg-primary/[0.04] px-4 py-3"
            role="note"
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-sm font-medium text-foreground">Onde focar agora</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Pela exposição COPSOQ agregada (demonstração, k≥5), os drivers de maior necessidade
              coletiva são{" "}
              {focus.map((f, i) => (
                <span key={f.driverId}>
                  <span className="font-medium text-foreground">{f.label}</span>
                  {f.topDimension ? ` (${f.topDimension.label})` : ""}
                  {i < focus.length - 1 ? ", " : ""}
                </span>
              ))}
              . É orientação de ação a partir de agregados — nunca avaliação de pessoas.
            </p>
          </motion.div>
        )}

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-border/70 bg-card p-1" role="tablist" aria-label="Lente de medição">
            <LensTab active={lens === "copsoq"} onClick={() => { setLens("copsoq"); setSel(null); }} icon={Microscope} label="COPSOQ II · risco" />
            <LensTab active={lens === "fibt"} onClick={() => { setLens("fibt"); setSel(null); }} icon={Sprout} label="FIB-T · ecossistema" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Prioridade</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "ALL" | Priority)}
              className="min-h-9 rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Filtrar por prioridade NR-1"
            >
              <option value="ALL">Todas</option>
              <option value="P0">P0 · crítico</option>
              <option value="P1">P1 · alto</option>
              <option value="P2">P2 · médio</option>
            </select>
          </div>
        </div>

        {/* Matriz */}
        <div className="overflow-x-auto pb-2">
          <div
            role="grid"
            aria-label="Matriz drivers por dimensões"
            className="grid items-end gap-1"
            style={{ gridTemplateColumns: `clamp(120px,28vw,168px) repeat(${columns.length}, minmax(34px,1fr))`, minWidth: lens === "copsoq" ? 680 : 560 }}
          >
            <div />
            {columns.map((c) => (
              <div key={c.id} role="columnheader" className="flex h-24 items-end justify-center">
                <span
                  className="whitespace-nowrap pb-1 text-[11px] leading-none text-muted-foreground"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  {c.label}
                </span>
              </div>
            ))}

            {R.drivers.map((d) => {
              const rowHasPriority = columns.some((c) => {
                const cell = cellAt(R, d.id, c.id);
                return cell?.priority && (filter === "ALL" || cell.priority === filter);
              });
              const rowDim = filter === "ALL" ? 1 : rowHasPriority ? 1 : 0.32;
              return (
                <DriverRow key={d.id}>
                  <div
                    role="rowheader"
                    className="self-center pr-2 text-right text-xs leading-tight text-foreground"
                    style={{ opacity: rowDim }}
                  >
                    {d.label}
                    <span className="block text-[10px] capitalize text-muted-foreground">{d.meteAxis}</span>
                  </div>
                  {columns.map((c) => {
                    const cell = cellAt(R, d.id, c.id);
                    const s = cell?.strength ?? 0;
                    const faded = filter !== "ALL" && (!cell?.priority || cell.priority !== filter);
                    const isSel = sel?.d === d.id && sel?.dim === c.id;
                    return (
                      <button
                        key={c.id}
                        role="gridcell"
                        type="button"
                        onClick={() => setSel(isSel ? null : { d: d.id, dim: c.id })}
                        aria-label={`${d.label} × ${c.label}: relação ${Math.round(s * 100)}%${cell?.priority ? `, prioridade ${cell.priority}` : ""}`}
                        className={`relative h-8 rounded-md border transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${strengthClass(s)} ${isSel ? "border-foreground ring-1 ring-foreground" : "border-border/40"} hover:scale-[1.08]`}
                        style={{ opacity: faded ? 0.2 : rowDim }}
                      >
                        {cell?.priority && (
                          <span
                            className={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[cell.priority]} ${cell.critical ? "ring-2 ring-red-400/40" : ""}`}
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                </DriverRow>
              );
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="flex gap-0.5">
              <span className="h-3 w-4 rounded-sm bg-primary/15" />
              <span className="h-3 w-4 rounded-sm bg-primary/45" />
              <span className="h-3 w-4 rounded-sm bg-primary/90" />
            </span>
            força da relação
          </span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> P0 risco crítico (NR-1)</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> P1 alto</span>
          <span className="text-muted-foreground/70">
            Burnout e comportamentos ofensivos são lidos como <em>desfecho</em> (Domínio B), nunca como célula de driver.
          </span>
        </div>

        {/* Detalhe da célula */}
        {selDriver && selDim ? (
          <motion.div
            key={`${selDriver.id}|${selDim.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-serif text-lg text-foreground">{selDriver.label}</span>
              <span className="text-muted-foreground/50">×</span>
              <span className="font-serif text-lg text-foreground">{selDim.label}</span>
              <span className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  relação {Math.round((selCell?.strength ?? 0) * 100)}%
                </span>
                {selCell?.priority ? (
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${PRIORITY_TINT[selCell.priority]}`}>
                    {selCell.priority}{selCell.critical ? " · crítico" : ""}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/70">sem prioridade canônica</span>
                )}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{selDriver.description}</p>

            <dl className="mt-4 space-y-3">
              <Field label="Hipótese de trabalho">
                {selCell?.hypothesis ??
                  "Relação de leitura semântica entre o driver e a dimensão. Sem vínculo causal canônico — usar como orientação exploratória, nunca diagnóstico."}
              </Field>
              <Field label={lens === "copsoq" ? "Implicação NR-1 / NR-17" : "Leitura de ecossistema"}>
                {selDim.contextNote}
              </Field>
              {selCell?.interventionId && (
                <Field label="Intervenção priorizada">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{selCell.interventionId}</code>
                </Field>
              )}
              {selCell?.evidence && <Field label="Evidência">{selCell.evidence}</Field>}
              <Field label="Fluxo M.E.T.E.">
                Medir ({lens === "copsoq" ? "COPSOQ II" : "FIB-T"}) → Educar ({selDriver.label}) →
                Transformar (intervenção) → Evoluir (reavaliação, k≥5).
              </Field>
            </dl>
            <Link
              to="/driver/$driverId"
              params={{ driverId: selDriver.id }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Abrir o Mundo do Driver
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </motion.div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
            <MousePointerClick className="h-4 w-4 shrink-0" aria-hidden />
            Toque numa célula para ver a hipótese, a implicação NR-1/NR-17, a intervenção priorizada e a evidência.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function LensTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Microscope;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

function DriverRow({ children }: { children: React.ReactNode }) {
  return <div className="contents">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">{label}</dt>
      <dd className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{children}</dd>
    </div>
  );
}
