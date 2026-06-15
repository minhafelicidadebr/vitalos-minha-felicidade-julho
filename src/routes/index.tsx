import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { Button } from "@/components/ui/button";
import { usePack } from "@/engine/pack";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "4 Lentes VITA — Sistema Operacional da Vitalidade Organizacional" },
      {
        name: "description",
        content:
          "Medir · Agir · Provar · Certificar — o sistema operacional B2B premium para a vitalidade organizacional.",
      },
    ],
  }),
  component: Index,
});

const ARC = [
  {
    id: "medir",
    step: "01",
    title: "Medir",
    headline: "Onde a vitalidade está hoje",
    detail: "IVO em 4 lentes, 16 pilares, pulses de 60s e sinais vivos da operação.",
    to: "/ivo",
    cta: "Ver IVO",
  },
  {
    id: "agir",
    step: "02",
    title: "Agir",
    headline: "O que fazer a seguir, em ordem",
    detail: "Prioridades calculadas, simulador de trajetória e protocolos do Culture Lab.",
    to: "/prioridades",
    cta: "Ver prioridades",
  },
  {
    id: "provar",
    step: "03",
    title: "Provar",
    headline: "Hipótese × observado, sem maquiagem",
    detail: "Camada de evidência (diff-in-diff honesto) e relatórios auditáveis.",
    to: "/experimentos",
    cta: "Ver experimentos",
  },
  {
    id: "certificar",
    step: "04",
    title: "Certificar",
    headline: "Selo Empresa Viva — computado, não comprado",
    detail: "Panorama executivo de board e o Selo derivado do arco inteiro.",
    to: "/panorama",
    cta: "Ver panorama",
  },
] as const;

const PILLARS = [
  { k: "Engine", v: "Setor-agnóstica" },
  { k: "Domain Pack", v: "Configurável por setor" },
  { k: "Privacidade", v: "k-anon ≥ 5, agregados" },
  { k: "Acessibilidade", v: "WCAG 2.2 AA" },
] as const;

function Index() {
  const { status, pack } = usePack();
  const packLabel =
    status.state === "ready" && pack
      ? `${pack.packName.split("—")[0].trim()} · v${pack.version}${
          status.validation.valid ? " · schema ✓" : " · schema ⚠"
        }`
      : "Carregando pack…";

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_14%,transparent)_0%,transparent_70%)]"
        />
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              VitalOS · Medir → Agir → Provar → Certificar
            </p>
            <h1 className="mt-6 max-w-4xl font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              O sistema operacional da{" "}
              <span className="text-primary">vitalidade organizacional</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Um arco único — do diagnóstico em 4 lentes ao Selo Empresa Viva — para CHRO, C-Level e
              líderes que querem cultura mensurável, ética e auditável.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/panorama">Abrir Panorama Executivo</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/ivo">Começar pelo IVO</Link>
              </Button>
              <span className="text-xs text-muted-foreground">{packLabel}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Arco do produto */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              O arco do VitalOS
            </p>
            <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">
              Quatro passos, um único sistema.
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Cada passo é um motor próprio — e o passo seguinte é derivado, não inventado.
          </p>
        </div>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ARC.map((s, i) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link
                to={s.to}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs tracking-widest text-muted-foreground">
                    {s.step}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium uppercase tracking-[0.14em] text-primary">
                    {s.title}
                  </span>
                </div>
                <p className="mt-4 font-serif text-lg text-card-foreground">{s.headline}</p>
                <p className="mt-2 flex-1 text-base leading-relaxed text-muted-foreground">
                  {s.detail}
                </p>
                <span className="mt-4 inline-flex items-center text-xs font-medium text-primary">
                  {s.cta}{" "}
                  <span
                    aria-hidden
                    className="ml-1 transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* Painéis por papel */}
      <section className="border-t border-border/40 bg-muted/20 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Painéis por papel
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">
            Cada pessoa vê o que precisa — só o que precisa.
          </h2>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { to: "/colaborador", k: "Colaborador", v: "Check-in, missões, kudos" },
              { to: "/lider", k: "Líder", v: "Equipe com n≥5, plano local" },
              { to: "/rh", k: "RH / CHRO", v: "Heatmap, GRO, temporada" },
              { to: "/clevel", k: "C-Level", v: "IVO, P&L, 3 prioridades" },
              { to: "/sst", k: "SST / CIPA", v: "Domínio B — NR-1 educativo" },
              { to: "/holding", k: "Holding", v: "Carteira de vitalidade" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-all hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {item.k}
                </p>
                <p className="mt-2 font-serif text-lg text-card-foreground">{item.v}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Princípios */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((item) => (
            <div
              key={item.k}
              className="rounded-xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.k}</p>
              <p className="mt-2 font-serif text-lg text-card-foreground">{item.v}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
