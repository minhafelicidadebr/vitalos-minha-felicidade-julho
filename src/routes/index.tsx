import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LandingHero } from "@/features/landing/components/LandingHero";
import { ProblemSection } from "@/features/landing/components/ProblemSection";
import { WhyItMattersSection } from "@/features/landing/components/WhyItMattersSection";
import { ImpactCalculatorSection } from "@/features/landing/components/ImpactCalculatorSection";
import { FourLensesSection } from "@/features/landing/components/FourLensesSection";
import { GlobalEsgSection } from "@/features/landing/components/GlobalEsgSection";
import { MethodologySection } from "@/features/landing/components/MethodologySection";
import { ProductModulesSection } from "@/features/landing/components/ProductModulesSection";
import { DashboardPreviewSection } from "@/features/landing/components/DashboardPreviewSection";
import { PersonaPathwaysSection } from "@/features/landing/components/PersonaPathwaysSection";
import { TrustSection } from "@/features/landing/components/TrustSection";
import { Nr1Section } from "@/features/landing/components/Nr1Section";
import { ProofNumbersSection } from "@/features/landing/components/ProofNumbersSection";
import { InstituteSection } from "@/features/landing/components/InstituteSection";
import { LandingCtaSection } from "@/features/landing/components/LandingCtaSection";
import { LandingModal } from "@/features/landing/components/LandingModal";
import { useLandingModal } from "@/features/landing/hooks/useLandingModal";
import type { CtaAction } from "@/features/landing/data/landing-copy";
import { DemoGateForm } from "@/app/shell/DemoGate";
import { useDemoGate } from "@/app/shell/demo-gate";
import { ThemeToggle } from "@/app/shell/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Programa VitalOS™ — Felicidade e Crescimento para Todos" },
      {
        name: "description",
        content:
          "VitalOS™ — Sistema Operacional da Vitalidade Organizacional. Transforme bem-estar, riscos psicossociais, cultura e performance em dados, ações e evidências.",
      },
    ],
  }),
  component: LandingPage,
});

/** Logo simbólica do Programa VitalOS™ — quatro pétalas vivas (EU · NÓS ·
 * LIDERANÇA · ORGANIZAÇÃO) em torno de um núcleo de vitalidade. SVG puro,
 * usa tokens semânticos (currentColor + accent). */
function VitalOsLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="vlos-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Pétalas — 4 lentes */}
      <g fill="currentColor" opacity="0.9">
        <ellipse cx="20" cy="9" rx="4" ry="7" />
        <ellipse cx="20" cy="31" rx="4" ry="7" />
        <ellipse cx="9" cy="20" rx="7" ry="4" />
        <ellipse cx="31" cy="20" rx="7" ry="4" />
      </g>
      {/* Núcleo */}
      <circle cx="20" cy="20" r="9" fill="url(#vlos-core)" />
      <circle cx="20" cy="20" r="3.2" fill="var(--color-accent)" />
    </svg>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const { openModal, close, runAction } = useLandingModal();
  const onAction = (action: CtaAction) => runAction(action, (to) => navigate({ to }));

  const unlocked = useDemoGate((s) => s.unlocked);
  const [gateOpen, setGateOpen] = useState(false);
  const enterApp = () => {
    if (unlocked) navigate({ to: "/painel" });
    else setGateOpen(true);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
      >
        Pular para o conteúdo
      </a>

      {/* Header da landing (glass) */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-primary"
            aria-label="Programa VitalOS — início"
          >
            <span
              aria-hidden
              className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-inset ring-white/10"
            >
              <VitalOsLogo className="h-6 w-6 text-primary-foreground" />
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="font-serif text-base tracking-tight text-foreground">
                Programa VitalOS™
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Felicidade e Crescimento para Todos
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={enterApp}
            >
              Entrar no app
            </Button>
            <Button size="sm" onClick={() => onAction({ kind: "modal", modal: "executive" })}>
              Agendar demonstração
            </Button>
          </div>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1} className="outline-none">
        <LandingHero onAction={onAction} />
        <ProblemSection />
        <WhyItMattersSection onAction={onAction} />
        <ImpactCalculatorSection />
        <FourLensesSection onAction={onAction} />
        <GlobalEsgSection />
        <MethodologySection onAction={onAction} />
        <Nr1Section onAction={onAction} />
        <ProductModulesSection />
        <DashboardPreviewSection onAction={onAction} />
        <PersonaPathwaysSection />
        <TrustSection />
        <ProofNumbersSection />
        <InstituteSection />
        <LandingCtaSection onAction={onAction} onEnterApp={enterApp} />
      </main>

      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            Programa VitalOS™ · Felicidade e Crescimento para Todos — Sistema Operacional da
            Vitalidade Organizacional.
          </p>
          <nav className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Rodapé">
            <Link to="/metodologia" className="hover:text-foreground">
              Metodologia
            </Link>
            <Link to="/programa" className="hover:text-foreground">
              O Programa
            </Link>
            <button onClick={enterApp} className="hover:text-foreground">
              Entrar no app
            </button>
          </nav>
        </div>
      </footer>

      <LandingModal open={openModal} onClose={close} onAction={onAction} />

      {/* Portão de senha do demo */}
      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Acesso à demonstração</DialogTitle>
            <DialogDescription>
              Informe a senha para explorar o app navegável com dados fictícios.
            </DialogDescription>
          </DialogHeader>
          <DemoGateForm
            onUnlocked={() => {
              setGateOpen(false);
              navigate({ to: "/painel" });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
