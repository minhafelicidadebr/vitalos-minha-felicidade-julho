import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  EyeOff,
  Layers3,
  LockKeyhole,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import type { AggregationProof } from "@/lib/aggregation/aggregation-proof.server";
import { getAggregationProof } from "@/lib/api/aggregation.functions";

export const Route = createFileRoute("/pipeline-dados")({
  head: () => ({
    meta: [{ title: "Pipeline protegido de dados · VitalOS™" }],
  }),
  component: DataPipelinePage,
});

type LoadState =
  | { state: "loading" }
  | { state: "ready"; proof: AggregationProof }
  | { state: "empty" }
  | { state: "error" };

function DataPipelinePage() {
  const { packId, sectorLabel } = usePack();
  const [load, setLoad] = useState<LoadState>({ state: "loading" });

  function reload() {
    setLoad({ state: "loading" });
    void getAggregationProof({ data: { packId } })
      .then((proof) => setLoad(proof ? { state: "ready", proof } : { state: "empty" }))
      .catch(() => setLoad({ state: "error" }));
  }

  useEffect(reload, [packId]);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] border border-primary/18 bg-gradient-to-br from-primary/14 via-card to-sky-500/5 p-6 shadow-sm sm:p-8"
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_0.35fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Confiança · Pipeline protegido
              </p>
              <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                Da resposta ao agregado, sem devolver o indivíduo.
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
                A prova roda no servidor com entradas que não chegam ao bundle cliente. O contrato
                público contém somente médias de coortes com pelo menos cinco participantes.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/75 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Setor ativo
              </p>
              <p className="mt-2 font-serif text-2xl text-foreground">{sectorLabel}</p>
              <p className="text-xs text-muted-foreground">engine único, pack injetado</p>
            </div>
          </div>
        </motion.header>

        <PipelineStages />

        {load.state === "loading" && (
          <section className="grid gap-4 lg:grid-cols-2" aria-busy="true">
            <div className="h-80 animate-pulse rounded-3xl bg-muted/60" />
            <div className="h-80 animate-pulse rounded-3xl bg-muted/60" />
          </section>
        )}

        {load.state === "error" && (
          <StateCard
            icon={RefreshCw}
            title="A prova server-side não respondeu."
            text="Nenhum agregado foi presumido ou reconstruído no cliente."
            action={
              <button
                type="button"
                onClick={reload}
                className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Tentar novamente
              </button>
            }
          />
        )}

        {load.state === "empty" && (
          <StateCard
            icon={DatabaseZap}
            title="Sem instrumento agregável para esta onda."
            text="O VitalOS™ não fabrica mapeamentos ou médias quando a definição oficial não está disponível."
          />
        )}

        {load.state === "ready" && <AggregationView proof={load.proof} />}
      </div>
    </AppShell>
  );
}

function PipelineStages() {
  const stages = [
    {
      icon: Server,
      title: "Capturar",
      status: "Ativo",
      text: "Conjunto validado e conteúdo fora do recibo.",
      tone: "active",
    },
    {
      icon: Layers3,
      title: "Agregar",
      status: "Ativo",
      text: "Média por pessoa/pilar e proteção k-anônima.",
      tone: "active",
    },
    {
      icon: DatabaseZap,
      title: "Calcular índice",
      status: "Próximo sprint",
      text: "Somente agregados publicáveis alimentarão o índice.",
      tone: "next",
    },
    {
      icon: ShieldCheck,
      title: "Provar",
      status: "Planejado",
      text: "Trilha sem payload sensível e verificações reproduzíveis.",
      tone: "next",
    },
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stages.map(({ icon: Icon, title, status, text, tone }) => (
        <article
          key={title}
          className={`rounded-2xl border p-4 ${
            tone === "active"
              ? "border-emerald-300/45 bg-emerald-500/[0.045]"
              : "border-border/65 bg-card"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <Icon
              className={tone === "active" ? "h-4 w-4 text-emerald-500" : "h-4 w-4 text-primary"}
              aria-hidden
            />
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {status}
            </span>
          </div>
          <h2 className="mt-3 font-serif text-lg text-foreground">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
        </article>
      ))}
    </section>
  );
}

function AggregationView({ proof }: { proof: AggregationProof }) {
  return (
    <>
      <section className="grid gap-5 lg:grid-cols-2">
        <AggregationCard
          icon={CheckCircle2}
          eyebrow="Organização · n ≥ 5"
          title="Agregado publicável"
          aggregation={proof.organization}
        />
        <AggregationCard
          icon={LockKeyhole}
          eyebrow="Recorte sensível · n < 5"
          title="Médias removidas"
          aggregation={proof.protectedCohort}
        />
      </section>

      <section className="rounded-3xl border border-primary/20 bg-primary/[0.055] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-serif text-xl text-foreground">
              O contrato público não carrega respostas brutas
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A função server-side retornou {proof.organization.pillars.length} pilares agregados e
              marcou{" "}
              <strong>
                {proof.rawResponsesReturned ? "conteúdo presente" : "zero conteúdo individual"}
              </strong>
              . No recorte protegido, `mean` é literalmente nulo — o valor sensível não acompanha a
              flag de ocultação.
            </p>
            <Link
              to="/acesso"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
            >
              Revisar identidade e escopos
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function AggregationCard({
  icon: Icon,
  eyebrow,
  title,
  aggregation,
}: {
  icon: typeof CheckCircle2;
  eyebrow: string;
  title: string;
  aggregation: AggregationProof["organization"];
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
      <Icon
        className={aggregation.publishable ? "h-5 w-5 text-emerald-500" : "h-5 w-5 text-amber-500"}
        aria-hidden
      />
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <h2 className="font-serif text-2xl text-foreground">{title}</h2>
        <span className="font-serif text-2xl text-foreground">
          n={aggregation.participantCount}
        </span>
      </div>
      <div className="mt-5 max-h-80 space-y-2 overflow-y-auto pr-1">
        {aggregation.pillars.map((pillar) => (
          <div
            key={pillar.pillarId}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/55 bg-background/40 px-3 py-2.5"
          >
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {pillar.pillarId.replaceAll("_", " ")}
            </span>
            {pillar.visible ? (
              <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
                {pillar.mean?.toFixed(2)}
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                <LockKeyhole className="h-3 w-3" aria-hidden />
                protegido
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function StateCard({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof RefreshCw;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-8 text-center">
      <Icon className="mx-auto h-7 w-7 text-primary" aria-hidden />
      <h2 className="mt-4 font-serif text-2xl text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{text}</p>
      {action}
    </section>
  );
}
