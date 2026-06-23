// /driver/$driverId — "Mundo do Driver": o centro de inteligência e ação de um driver de
// trabalho saudável (blueprint §5). Compõe o driverProfile (puro): snapshot + pilares IVO +
// intersecções COPSOQ (risco) e FIB-T (ecossistema) + sinais canônicos com evidência + as
// próximas ações nas superfícies vivas. Honestidade: orienta ação, não diagnostica pessoas.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Grid3x3,
  Layers,
  MessageCircle,
  Microscope,
  ShieldAlert,
  Sprout,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { DriverMindMapSvg } from "@/app/nr1/DriverMindMapSvg";
import { driverProfile, type DimensionLink, type Priority } from "@/engine/nr1/crosswalk-engine";
import { DEMO_COPSOQ_EXPOSURE, NR1_CROSSWALK as R } from "@/mocks/nr1-crosswalk-mock";

export const Route = createFileRoute("/driver/$driverId")({
  head: () => ({ meta: [{ title: "Mundo do Driver — 4 Lentes VitalOS™" }] }),
  component: DriverWorldPage,
});

// Rótulos dos pilares IVO (enterprise) — vocabulário de domínio só para exibição.
const PILLAR_LABEL: Record<string, string> = {
  energia_vitalidade: "Energia & Vitalidade",
  proposito_significado: "Propósito & Significado",
  crescimento_maestria: "Crescimento & Maestria",
  equilibrio_autonomia: "Equilíbrio & Autonomia",
  seguranca_psicologica: "Segurança Psicológica",
  cooperacao_confianca: "Cooperação & Confiança",
  reconhecimento_pares: "Reconhecimento entre Pares",
  comunicacao_pertencimento: "Comunicação & Pertencimento",
  clareza_direcao: "Clareza & Direção",
  justica_coerencia: "Justiça & Coerência",
  desenvolvimento_pessoas: "Desenvolvimento de Pessoas",
  cuidado_ativo: "Cuidado Ativo da Liderança",
  condicoes_carga: "Condições & Carga de Trabalho",
  cultura_bem_estar: "Cultura de Bem-Estar",
  inclusao_equidade: "Inclusão, Equidade & Diversidade",
  sustentabilidade_bem_comum: "Sustentabilidade & Bem-Comum",
};

const PRIORITY_TINT: Record<Priority, string> = {
  P0: "border-red-400/50 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  P1: "border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  P2: "border-sky-400/50 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
};

function DriverWorldPage() {
  const { driverId } = Route.useParams();
  const profile = useMemo(() => driverProfile(R, driverId, DEMO_COPSOQ_EXPOSURE), [driverId]);

  if (!profile) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-border/60 bg-card/50 p-8 text-center">
            <p className="font-serif text-2xl text-foreground">Driver não encontrado</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Esse identificador não existe no registro canônico. Volte ao catálogo para escolher um
              dos 12 drivers.
            </p>
            <Link
              to="/drivers"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Ver os drivers
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const { driver, copsoq, fibt, signals, exposureNeed } = profile;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-7 px-4 py-8 sm:px-6">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            to="/drivers"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Drivers
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {driver.macroLayer}
            </span>
            <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] capitalize text-muted-foreground">
              Eixo {driver.meteAxis}
            </span>
            {exposureNeed?.priority && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-400/50 bg-red-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950/30 dark:text-red-300">
                <ShieldAlert className="h-3 w-3" aria-hidden /> Prioridade agora
              </span>
            )}
          </div>
          <h1 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl">{driver.label}</h1>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-muted-foreground">
            {driver.description}
          </p>
          {exposureNeed?.topDimension && (
            <p className="mt-2 text-sm text-muted-foreground">
              Pela exposição agregada (demo, k≥5), o sinal mais forte deste driver vem de{" "}
              <span className="font-medium text-foreground">{exposureNeed.topDimension.label}</span>{" "}
              ({exposureNeed.topDimension.load}/100).
            </p>
          )}
        </motion.header>

        {/* Mapa Mental — cartografia cognitiva das intersecções */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Brain className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-card-foreground">Mapa mental</h2>
              <p className="text-[11px] text-muted-foreground">
                Cartografia cognitiva — COPSOQ II (risco) à esquerda, FIB-T (ecossistema) à
                direita, pilares IVO abaixo. Toque numa dimensão para ver detalhes.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <DriverMindMapSvg
              registry={R}
              driverId={driverId}
              exposures={DEMO_COPSOQ_EXPOSURE}
              pillarLabels={PILLAR_LABEL}
            />
          </div>
        </motion.section>

        {/* Snapshot — pilares IVO reconciliados */}
        <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Reconciliação · pilares do florescimento (IVO)
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Este driver de risco é a mesma realidade que o IVO lê como florescimento — a ponte
            Domínio A ↔ B.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {driver.pillarIds.map((pid) => (
              <span
                key={pid}
                className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
              >
                {PILLAR_LABEL[pid] ?? pid}
              </span>
            ))}
          </div>
        </section>

        {/* Intersecções */}
        <section className="grid gap-5 md:grid-cols-2">
          <IntersectionCard
            icon={Microscope}
            title="Risco psicossocial · COPSOQ II"
            subtitle="Exposição (Domínio B) — implicação NR-1/NR-17"
            links={copsoq}
            note
          />
          <IntersectionCard
            icon={Sprout}
            title="Ecossistema · FIB-T"
            subtitle="Vida em volta do trabalho — bem-comum"
            links={fibt}
          />
        </section>

        {/* Sinais & intervenção */}
        {signals.length > 0 && (
          <section>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="font-serif text-2xl text-foreground">Sinais & intervenção</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Hipóteses de trabalho e intervenções priorizadas, com fonte. Primeiro a organização do
              trabalho — nunca culpar pessoas.
            </p>
            <div className="mt-4 space-y-3">
              {signals.map((c) => {
                const dim = R.dimensions.find((d) => d.id === c.dimensionId);
                return (
                  <div
                    key={c.dimensionId}
                    className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-card-foreground">{dim?.label}</span>
                      {c.priority && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_TINT[c.priority]}`}
                        >
                          {c.priority}
                          {c.critical ? " · crítico" : ""}
                        </span>
                      )}
                    </div>
                    {c.hypothesis && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {c.hypothesis}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {c.interventionId && (
                        <span>
                          Intervenção:{" "}
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                            {c.interventionId}
                          </code>
                        </span>
                      )}
                      {c.evidence && <span className="italic">Fonte: {c.evidence}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Próximas ações — superfícies vivas */}
        <section className="rounded-3xl border border-primary/20 bg-primary/[0.03] p-5 sm:p-6">
          <h2 className="font-serif text-xl text-foreground">Aja sobre este driver</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O ciclo M.E.T.E. continua nas superfícies que já existem.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ActionLink to="/matriz" icon={Grid3x3} title="Ver na matriz" desc="Todas as intersecções deste e dos demais drivers." />
            <ActionLink to="/revisar" icon={Layers} title="Revisar a ciência" desc="Cartões de repetição espaçada (Educar)." />
            <ActionLink
              to="/copilota"
              icon={MessageCircle}
              title="Falar com o mentor"
              desc="Mentor escopado a este driver — com citação e sem alucinar."
              search={{
                driver: driver.id,
                q: `Como agir sobre ${driver.label} no trabalho real, em camadas (organização, liderança, equipe), e medir a eficácia?`,
              }}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function IntersectionCard({
  icon: Icon,
  title,
  subtitle,
  links,
  note,
}: {
  icon: typeof Microscope;
  title: string;
  subtitle: string;
  links: DimensionLink[];
  note?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2.5">
        {links.map(({ dimension, cell }) => (
          <li key={dimension.id}>
            <div className="flex items-center gap-2">
              <span className="w-32 shrink-0 truncate text-xs text-card-foreground" title={dimension.label}>
                {dimension.label}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${cell.strength * 100}%` }} />
              </div>
              <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {Math.round(cell.strength * 100)}%
              </span>
            </div>
            {note && (
              <p className="ml-0 mt-0.5 text-[11px] leading-snug text-muted-foreground/80">
                {dimension.contextNote}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionLink({
  to,
  icon: Icon,
  title,
  desc,
  search,
}: {
  to: "/matriz" | "/revisar" | "/copilota";
  icon: typeof Microscope;
  title: string;
  desc: string;
  search?: { q?: string; driver?: string };
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className="group flex flex-col gap-1 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden />
        {title}
        <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
      <span className="text-xs leading-relaxed text-muted-foreground">{desc}</span>
    </Link>
  );
}
