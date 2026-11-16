import { useRef, useState, type MouseEvent } from "react";
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
import { EconomicBaselineSection } from "@/features/landing/components/EconomicBaselineSection";
import { FourLensesSection } from "@/features/landing/components/FourLensesSection";
import { GlobalEsgSection } from "@/features/landing/components/GlobalEsgSection";
import { MethodologySection } from "@/features/landing/components/MethodologySection";
import { ProductModulesSection } from "@/features/landing/components/ProductModulesSection";
import { EcosystemApplicationsSection } from "@/features/landing/components/EcosystemApplicationsSection";

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
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import { InstitutionalAccessLink } from "@/features/landing/components/InstitutionalAccessLink";

const LANDING_NAV = [
  ["Solução", "#solucao"],
  ["Metodologia", "#metodologia"],
  ["Aplicações", "#aplicacoes"],
] as const;

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

function LandingPage() {
  const navigate = useNavigate();
  const { openModal, close, runAction } = useLandingModal();
  const onAction = (action: CtaAction) => runAction(action, (to) => navigate({ to }));

  const unlocked = useDemoGate((s) => s.unlocked);
  const [gateOpen, setGateOpen] = useState(false);
  const demoTrigger = useRef<HTMLButtonElement | null>(null);
  const exploreDemo = (event: MouseEvent<HTMLButtonElement>) => {
    demoTrigger.current = event.currentTarget;
    if (unlocked) navigate({ to: "/painel" });
    else setGateOpen(true);
  };

  // Grades implícitas e controles respeitam o viewport somente nesta página pública.
  return (
    <div className="min-h-dvh break-words bg-background text-foreground [&_.grid]:auto-cols-fr [&_.grid>*]:min-w-0 [&_button]:h-auto [&_button]:min-h-11 [&_button]:max-w-full [&_button]:whitespace-normal">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
      >
        Pular para o conteúdo
      </a>

      {/* Header da landing (glass) */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/82 shadow-[0_1px_0_color-mix(in_oklab,var(--color-border)_55%,transparent)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center transition-transform duration-300 hover:-translate-y-0.5"
            aria-label="Programa VitalOS — página inicial"
          >
            <span className="sm:hidden">
              <VitalOSBrand variant="mark" size="md" />
            </span>
            <span className="hidden sm:block">
              <VitalOSBrand variant="horizontal" size="md" />
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 rounded-full border border-border/60 bg-card/55 p-1 shadow-sm backdrop-blur lg:flex"
            aria-label="Navegação da página"
          >
            {LANDING_NAV.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="[&>button]:size-11">
              <ThemeToggle />
            </span>
            <InstitutionalAccessLink compact />
            <Button
              size="sm"
              className="min-h-11 rounded-full px-3 shadow-md shadow-primary/15 sm:px-4"
              onClick={() => onAction({ kind: "modal", modal: "executive" })}
            >
              <span className="sm:hidden">Agendar</span>
              <span className="hidden sm:inline">Agendar demonstração</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1} className="outline-none">
        <LandingHero onAction={onAction} />
        <ProblemSection />
        <WhyItMattersSection onAction={onAction} />
        <EconomicBaselineSection />
        <FourLensesSection onAction={onAction} />
        <GlobalEsgSection />
        <MethodologySection onAction={onAction} />
        <Nr1Section onAction={onAction} />
        <ProductModulesSection />
        <EcosystemApplicationsSection onAction={onAction} />

        <PersonaPathwaysSection />
        <TrustSection />
        <ProofNumbersSection />
        <InstituteSection />
        <LandingCtaSection onAction={onAction} onEnterApp={exploreDemo} />
      </main>

      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            Programa VitalOS™ · Felicidade e Crescimento para Todos — Sistema Operacional da
            Vitalidade Organizacional.
          </p>
          <nav
            className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
            aria-label="Rodapé"
          >
            <Link
              to="/metodologia"
              className="inline-flex min-h-11 items-center hover:text-foreground"
            >
              Metodologia
            </Link>
            <Link
              to="/programa"
              className="inline-flex min-h-11 items-center hover:text-foreground"
            >
              O Programa
            </Link>
            <InstitutionalAccessLink />
            <button
              onClick={exploreDemo}
              className="min-h-11 rounded-md px-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Explorar demonstração
            </button>
          </nav>
        </div>
      </footer>

      <LandingModal open={openModal} onClose={close} onAction={onAction} />

      {/* Portão de senha do demo */}
      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-md [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-lg"
          onCloseAutoFocus={(event) => {
            if (demoTrigger.current?.isConnected) {
              event.preventDefault();
              demoTrigger.current.focus();
            }
          }}
        >
          <DialogHeader className="pr-10">
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
