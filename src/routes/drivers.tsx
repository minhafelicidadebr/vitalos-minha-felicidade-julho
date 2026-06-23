// /drivers — catálogo dos 12 drivers canônicos, a porta de entrada dos "Mundos do Driver".
// Ordena-se pela necessidade coletiva MEDIDA (rankDriversByExposure) — Medir→Educar — e agrupa
// por macrocamada. Cada card abre o centro de inteligência e ação do driver.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Grid3x3, ShieldAlert, Target } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { rankDriversByExposure } from "@/engine/nr1/crosswalk-engine";
import { DEMO_COPSOQ_EXPOSURE, NR1_CROSSWALK as R } from "@/mocks/nr1-crosswalk-mock";

export const Route = createFileRoute("/drivers")({
  head: () => ({ meta: [{ title: "Drivers de Trabalho Saudável — 4 Lentes VitalOS™" }] }),
  component: DriversPage,
});

const MACRO_ORDER = ["Condições", "Relações", "Desenvolvimento", "Sustentabilidade"] as const;

function DriversPage() {
  const needByDriver = useMemo(() => {
    const ranked = rankDriversByExposure(R, DEMO_COPSOQ_EXPOSURE);
    return new Map(ranked.map((n) => [n.driverId, n]));
  }, []);

  const focus = useMemo(
    () => rankDriversByExposure(R, DEMO_COPSOQ_EXPOSURE).filter((n) => n.priority).slice(0, 3),
    [],
  );

  const groups = useMemo(
    () =>
      MACRO_ORDER.map((layer) => ({
        layer,
        drivers: R.drivers.filter((d) => d.macroLayer === layer),
      })).filter((g) => g.drivers.length > 0),
    [],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            12 drivers de trabalho saudável · centros de inteligência e ação
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">
            Onde a vitalidade do trabalho se constrói
          </h1>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Cada driver reconcilia risco psicossocial (COPSOQ II), florescimento (IVO) e ecossistema
            (FIB-T). A ordem segue a necessidade coletiva medida — não um ranking de pessoas.
          </p>
        </motion.header>

        {focus.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/[0.04] px-4 py-3"
            role="note"
          >
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Onde focar agora:</span>{" "}
              {focus.map((f, i) => (
                <span key={f.driverId}>
                  <Link
                    to="/driver/$driverId"
                    params={{ driverId: f.driverId }}
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    {f.label}
                  </Link>
                  {i < focus.length - 1 ? ", " : ""}
                </span>
              ))}
              {" "}— pela exposição COPSOQ agregada (demonstração, k≥5).
            </p>
          </motion.div>
        )}

        {groups.map((group, gi) => (
          <section key={group.layer} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.layer}
              </span>
              <span className="h-px flex-1 bg-border/60" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.drivers.map((d, i) => {
                const need = needByDriver.get(d.id);
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: 0.03 * i + 0.04 * gi }}
                  >
                    <Link
                      to="/driver/$driverId"
                      params={{ driverId: d.id }}
                      className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                          <Grid3x3 className="h-4 w-4" aria-hidden />
                        </span>
                        {need?.priority && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-400/50 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950/30 dark:text-red-300">
                            <ShieldAlert className="h-3 w-3" aria-hidden /> Foco
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm font-semibold text-card-foreground">{d.label}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {d.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                        <span className="text-[11px] text-muted-foreground">
                          {need?.topDimension ? need.topDimension.label : `Eixo ${d.meteAxis}`}
                        </span>
                        <ArrowRight
                          className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
