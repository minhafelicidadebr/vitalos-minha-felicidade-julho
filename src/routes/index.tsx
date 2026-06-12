import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { Button } from "@/components/ui/button";
import { usePack } from "@/engine/pack";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "4 Lentes VITA — Fundação" },
      {
        name: "description",
        content:
          "Fundação técnica (Bloco 0) da plataforma 4 Lentes VITA — Sistema Operacional da Vitalidade Organizacional.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { status, pack } = usePack();
  const packLabel =
    status.state === "ready" ? `${pack?.meta.name} · v${pack?.meta.version}` : "Carregando pack…";

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            Bloco 0 — Fundação
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Sistema Operacional da{" "}
            <span className="text-primary">Vitalidade Organizacional</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Esta é a fundação técnica da plataforma 4 Lentes VITA. Design system, providers de
            acessibilidade, camada Pack setor-agnóstica e shell institucional já no lugar — pronto
            para receber os próximos blocos.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/design-system">Ver o Design System</Link>
            </Button>
            <span className="text-xs text-muted-foreground">{packLabel}</span>
          </div>
        </motion.div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { k: "Engine", v: "Setor-agnóstica" },
            { k: "Domain", v: "Configurável por Pack" },
            { k: "A11y", v: "WCAG 2.2 AA" },
          ].map((item) => (
            <div
              key={item.k}
              className="rounded-xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {item.k}
              </p>
              <p className="mt-2 font-serif text-xl text-card-foreground">{item.v}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
