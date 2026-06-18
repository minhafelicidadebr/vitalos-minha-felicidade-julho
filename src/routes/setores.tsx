import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { calculateIVO, type IVOResult } from "@/engine/index/ivo-engine";
import type { ProprietaryIndex } from "@/engine/pack/pack-types";
import ivoFramework from "@/domain/packs/enterprise/ivo-framework.json";
import ievFramework from "@/domain/packs/school/iev-framework.json";
import { ivoCurrentCycle, DEMO_ORG } from "@/mocks/ivo-mock";
import { SCHOOL_CYCLE, SCHOOL_ORG, SECTOR_ROADMAP, SETORES_INTRO } from "@/mocks/school-mock";

export const Route = createFileRoute("/setores")({
  head: () => ({ meta: [{ title: "Multissetorial · Engine ≠ Domínio — 4 Lentes VitalOS™" }] }),
  component: SetoresPage,
});

const STATUS_COPY: Record<string, { label: string; cls: string }> = {
  ativo: {
    label: "Ativo",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  demo: { label: "Demo", cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  roadmap: { label: "Roadmap", cls: "bg-muted text-muted-foreground" },
};

function SetoresPage() {
  // O MESMO motor calculateIVO, dois frameworks de setores diferentes.
  const enterprise = useMemo(
    () => calculateIVO(ivoCurrentCycle, ivoFramework as unknown as ProprietaryIndex),
    [],
  );
  const school = useMemo(
    () => calculateIVO(SCHOOL_CYCLE, ievFramework as unknown as ProprietaryIndex),
    [],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {SETORES_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{SETORES_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {SETORES_INTRO.lead}
          </p>
        </motion.div>

        {/* Prova lado a lado */}
        <section>
          <p className="mb-3 text-sm text-muted-foreground">{SETORES_INTRO.proof}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <SectorCard sector="Empresa" org={DEMO_ORG.name} result={enterprise} index="IVO" />
            <SectorCard sector="Escola" org={SCHOOL_ORG.name} result={school} index="IEV" />
          </div>
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center">
            <p className="text-sm font-medium text-foreground">
              Os mesmos 16 motores — zero linha de engine alterada.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <code className="rounded bg-muted px-1 py-0.5">calculateIVO(ciclo, framework)</code> —
              só o framework (JSON) muda. Engine ≠ Domínio, provado.
            </p>
          </div>
        </section>

        {/* Roadmap de packs */}
        <section>
          <h2 className="mb-3 font-serif text-xl text-foreground">A opcionalidade de unicórnio</h2>
          <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
            Cada novo setor é um Domain Pack — não um novo produto. Se um pack exigir mudar o motor,
            a mudança sobe como capacidade genérica configurável.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {SECTOR_ROADMAP.map((s) => {
              const st = STATUS_COPY[s.status]!;
              return (
                <div key={s.id} className="rounded-2xl border border-border/60 bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-card-foreground">{s.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.product}</p>
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          A mesma arquitetura que serve a empresa serve a escola, o condomínio, a cidade e a saúde —
          mudando apenas o vocabulário, nunca o motor.
        </p>
      </div>
    </AppShell>
  );
}

function SectorCard({
  sector,
  org,
  result,
  index,
}: {
  sector: string;
  org: string;
  result: IVOResult;
  index: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{sector}</p>
          <p className="font-medium text-card-foreground">{org}</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {index}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-serif text-5xl font-semibold text-foreground">{result.ivoScore}</span>
        <span className="text-sm text-muted-foreground">/ 1000</span>
      </div>
      <p className="text-sm font-medium text-primary">{result.maturityLevel.name}</p>

      {/* 4 lentes do setor */}
      <div className="mt-4 space-y-2">
        {result.lenses.map((lens) => (
          <div key={lens.lensId} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-xs text-card-foreground">
              {lens.lensName.split(" — ")[0]}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${(lens.score / 1000) * 100}%`, background: lens.color }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {lens.score}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
