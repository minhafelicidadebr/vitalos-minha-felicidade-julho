import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
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
import { InstituteSection } from "@/features/landing/components/InstituteSection";
import { LandingCtaSection } from "@/features/landing/components/LandingCtaSection";
import { LandingModal } from "@/features/landing/components/LandingModal";
import { useLandingModal } from "@/features/landing/hooks/useLandingModal";
import type { CtaAction } from "@/features/landing/data/landing-copy";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "4 Lentes VITA™ — O Sistema Operacional da Vitalidade Organizacional" },
      {
        name: "description",
        content:
          "Plataforma SaaS para transformar bem-estar, riscos psicossociais, cultura e performance humana em dados, ações e evidências — com as 4 Lentes VITA™.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const { openModal, close, runAction } = useLandingModal();
  const onAction = (action: CtaAction) => runAction(action, (to) => navigate({ to }));

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
            to="/landing"
            className="flex items-center gap-2.5"
            aria-label="4 Lentes VITA — início"
          >
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-md bg-primary font-serif text-lg text-primary-foreground shadow-sm"
            >
              4
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="font-serif text-base tracking-tight">4 Lentes VITA™</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Sistema da Vitalidade Organizacional
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/">Entrar no app</Link>
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
        <FourLensesSection />
        <GlobalEsgSection />
        <MethodologySection />
        <Nr1Section onAction={onAction} />
        <ProductModulesSection />
        <DashboardPreviewSection onAction={onAction} />
        <PersonaPathwaysSection />
        <TrustSection />
        <InstituteSection />
        <LandingCtaSection onAction={onAction} />
      </main>

      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            4 Lentes VITA™ · VitalOS — Sistema Operacional da Vitalidade Organizacional.
          </p>
          <nav className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Rodapé">
            <Link to="/metodologia" className="hover:text-foreground">
              Metodologia
            </Link>
            <Link to="/programa" className="hover:text-foreground">
              O Programa
            </Link>
            <Link to="/" className="hover:text-foreground">
              Entrar no app
            </Link>
          </nav>
        </div>
      </footer>

      <LandingModal open={openModal} onClose={close} />
    </div>
  );
}
