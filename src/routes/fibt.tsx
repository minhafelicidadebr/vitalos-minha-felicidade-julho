import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import {
  FIBT_ORG_RESULT,
  FIBT_ORG_N,
  FIBT_INTRO,
  FIBT_CLASS_COPY,
  FACTOR_COLOR,
  DOMAIN_TO_ESG,
  ESG_DIM_COPY,
} from "@/mocks/fibt-mock";

export const Route = createFileRoute("/fibt")({
  head: () => ({ meta: [{ title: "FIB-T · Felicidade Interna Bruta — 4 Lentes VITA" }] }),
  component: FibtPage,
});

function FibtPage() {
  const r = FIBT_ORG_RESULT;
  const cls = FIBT_CLASS_COPY[r.classification]!;

  // Ponte ESG: média dos domínios por dimensão E/S/G.
  const esg = useMemo(() => {
    const acc: Record<string, number[]> = { E: [], S: [], G: [] };
    for (const d of r.domains) acc[DOMAIN_TO_ESG[d.id] ?? "S"]!.push(d.normalized);
    return (["E", "S", "G"] as const).map((dim) => ({
      dim,
      label: ESG_DIM_COPY[dim]!.label,
      color: ESG_DIM_COPY[dim]!.color,
      value: acc[dim]!.length
        ? Math.round(acc[dim]!.reduce((s, v) => s + v, 0) / acc[dim]!.length)
        : 0,
      domains: r.domains.filter((d) => (DOMAIN_TO_ESG[d.id] ?? "S") === dim),
    }));
  }, [r]);

  const domainsSorted = [...r.domains].sort((a, b) => b.normalized - a.normalized);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {FIBT_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{FIBT_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {FIBT_INTRO.lead}
          </p>
        </motion.div>

        {/* Hero — escore bruto + índice */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="flex flex-wrap items-end justify-between gap-6 rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
        >
          <div>
            <p className="text-xs text-muted-foreground">Índice FIB-T (0–1000)</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-5xl font-semibold text-foreground">{r.index}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls.bg} ${cls.color}`}
              >
                {cls.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Escore bruto {r.escoreBruto}/12 · {FIBT_ORG_N} respondentes (anônimo)
            </p>
          </div>
          <div className="flex gap-2">
            {r.factors.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-center"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: FACTOR_COLOR[f.id] }}
                  aria-hidden
                />
                <p className="font-serif text-2xl text-foreground">{f.normalized}</p>
                <p className="max-w-[6rem] text-[9px] leading-tight text-muted-foreground">
                  {f.name}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Ponte ESG */}
        <section>
          <h2 className="mb-1 font-serif text-xl text-foreground">Ponte para o ESG</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Os 9 domínios FIB se traduzem nas três dimensões ESG — a felicidade do sistema vira
            prontidão de sustentabilidade.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {esg.map((e) => (
              <div key={e.dim} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ background: e.color }}
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-card-foreground">
                    {e.dim} · {e.label}
                  </p>
                </div>
                <p className="mt-1 font-serif text-3xl text-foreground">{e.value}</p>
                <p className="text-xs text-muted-foreground">/ 100 médio dos domínios</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {e.domains.map((d) => (
                    <span
                      key={d.id}
                      className="rounded-full border border-border/50 px-2 py-0.5 text-[9px] text-muted-foreground"
                    >
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Veja a prontidão completa em{" "}
            <Link to="/esg" className="underline underline-offset-2 hover:text-foreground">
              ESG &amp; ODS
            </Link>
            .
          </p>
        </section>

        {/* 9 Domínios FIB */}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-serif text-lg text-foreground">Os 9 Domínios da Felicidade</h2>
          <div className="space-y-3">
            {domainsSorted.map((d) => {
              const dim = DOMAIN_TO_ESG[d.id] ?? "S";
              const color = ESG_DIM_COPY[dim]!.color;
              return (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-sm text-card-foreground">
                    {d.name}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${d.normalized}%`, background: color }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                    {d.normalized}/100 · {d.mean}/4
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Honestidade */}
        <div
          className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
          role="note"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {FIBT_INTRO.disclaimer}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          A FIB-T é a 2ª lente do ciclo anual — entre o COPSOQ (risco) e o PERMA+V (florescimento).
          Veja a jornada em{" "}
          <Link to="/temporada" className="underline underline-offset-2 hover:text-foreground">
            Cronograma
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
