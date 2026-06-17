import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MotionConfig } from "framer-motion";
import { Menu, ChevronDown } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { A11yMenu } from "./A11yMenu";
import { PackSwitcher } from "./PackSwitcher";
import { DemoGateScreen } from "./DemoGate";
import { useDemoGate } from "./demo-gate";
import { usePack } from "@/engine/pack";
import { navForRole, usePersona } from "@/engine/rbac/rbac";
import { useA11y } from "./A11yProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * AppShell — header institucional + navegação dirigida pelo pack × papel,
 * agrupada pelo ciclo do produto (Medir · Agir · Provar · Estratégico · Confiança).
 */

// Mapeia ids de navegação do pack para rotas implementadas.
const NAV_ROUTES: Record<string, string> = {
  overview: "/", // por papel, abaixo
  ivo: "/ivo",
  pulses: "/pulse",
  ai: "/floresceria",
  copilot: "/copiloto",
  academy: "/academia",
  ambassadorships: "/embaixadorias",
  reports: "/relatorios",
  esg_report: "/relatorio-global",
  certification: "/selo",
  cycle_close: "/fechamento",
  action_plan: "/lab",
  experiments: "/experimentos",
  domain_b: "/sst",
  signals: "/sinais",
  privacy: "/privacidade",
  methodology: "/metodologia",
  program: "/programa",
  sectors: "/setores",
  panorama: "/panorama",
  benchmark: "/benchmark",
  fibt: "/fibt",
  season: "/temporada",
  trend: "/evolucao",
  wave: "/onda",
  devolutiva: "/devolutiva",
  priorities: "/prioridades",
  forecast: "/trajetoria",
  viat: "/viat",
  esg: "/esg",
};

const ROLE_HOME: Record<string, string> = {
  COLABORADOR: "/colaborador",
  EMBAIXADOR: "/embaixador",
  LIDER_EQUIPE: "/lider",
  RH_ADMIN: "/rh",
  CHRO: "/rh",
  C_LEVEL: "/clevel",
  SST_PROFISSIONAL: "/sst",
  CIPA_MEMBRO: "/sst",
  HOLDING_ADMIN: "/holding",
  // Pack Escola (AlegrIA) — todos os papéis aterram no painel da Direção (agregado).
  DIRETOR: "/escola",
  COORDENADOR: "/escola",
  ORIENTADOR: "/escola",
  SECRETARIA_EDU: "/escola",
  GESTOR_REDE: "/escola",
  C_LEVEL_EDU: "/escola",
  EDUCADOR: "/escola",
  ESTUDANTE: "/escola",
  FAMILIA: "/escola",
};

// Fallback caso o pack ativo não declare demoPersonas (mantém compat retroativa).
const DEMO_PERSONAS_FALLBACK = [
  "COLABORADOR",
  "LIDER_EQUIPE",
  "RH_ADMIN",
  "CHRO",
  "C_LEVEL",
  "SST_PROFISSIONAL",
  "HOLDING_ADMIN",
] as const;

// Grupos do ciclo do produto. Itens fora destes grupos caem em "Mais".
type NavGroupDef = { id: string; label: string; hint?: string; items: string[] };
const NAV_GROUPS: NavGroupDef[] = [
  {
    id: "medir",
    label: "Medir",
    hint: "Onde a vitalidade está hoje",
    items: ["wave", "ivo", "pulses", "signals", "trend", "season"],
  },
  {
    id: "agir",
    label: "Agir",
    hint: "O que fazer a seguir",
    items: ["devolutiva", "priorities", "forecast", "action_plan", "copilot"],
  },
  {
    id: "provar",
    label: "Provar",
    hint: "Evidência e certificação",
    items: ["experiments", "reports", "esg_report", "certification", "cycle_close"],
  },
  {
    id: "estrategico",
    label: "Estratégico",
    hint: "Visão de board e portfólio",
    items: ["program", "sectors", "panorama", "benchmark", "esg", "fibt", "viat", "domain_b"],
  },
  {
    id: "comunidade",
    label: "Comunidade",
    hint: "Pessoas, forças e cultura",
    items: ["academy", "ambassadorships", "ai"],
  },
  {
    id: "confianca",
    label: "Confiança",
    hint: "Método, privacidade e governança",
    items: ["methodology", "privacy"],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { pack } = usePack();
  const { roleId, setRole } = usePersona();
  const { reduceMotion } = useA11y();
  const [personaOpen, setPersonaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Portão de demonstração — fronteira única entre a landing pública e o app.
  // Enquanto o localStorage não rehidrata, mostramos o portão (estado seguro):
  // servidor e 1ª renderização do cliente coincidem (sem mismatch de hidratação).
  const gateUnlocked = useDemoGate((s) => s.unlocked);
  const gateHydrated = useDemoGate((s) => s.hasHydrated);
  if (!gateHydrated || !gateUnlocked) {
    return <DemoGateScreen />;
  }

  const roleLabel = pack?.roles?.find((r) => r.id === roleId)?.label ?? roleId;

  // Personas de demonstração vêm do pack ativo — pack-driven, não hardcoded.
  const demoPersonas =
    (pack?.demoPersonas as string[] | undefined) ?? (DEMO_PERSONAS_FALLBACK as readonly string[]);

  const visibleItems = pack
    ? navForRole(pack, roleId)
        .map((item) => ({
          ...item,
          to: item.id === "overview" ? (ROLE_HOME[roleId] ?? "/painel") : NAV_ROUTES[item.id],
        }))
        .filter((item) => Boolean(item.to))
    : [];

  const overview = visibleItems.find((i) => i.id === "overview");
  const groupedIds = new Set(NAV_GROUPS.flatMap((g) => g.items));
  const groupsRendered = NAV_GROUPS.map((g) => ({
    ...g,
    items: visibleItems.filter((vi) => g.items.includes(vi.id)),
  })).filter((g) => g.items.length > 0);
  const extras = visibleItems.filter((i) => i.id !== "overview" && !groupedIds.has(i.id));

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <div className="min-h-dvh flex flex-col bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
        >
          Pular para o conteúdo
        </a>
        <header className="sticky top-0 z-40 border-b border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 print:hidden">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
            {/* Mobile drawer trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/60 text-foreground transition-colors hover:bg-muted/40 lg:hidden"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" aria-hidden />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-0">
                <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
                  <SheetTitle className="font-serif text-base">Navegação</SheetTitle>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {roleLabel}
                  </p>
                </SheetHeader>
                <div className="px-3 py-4">
                  {overview && (
                    <Link
                      to={overview.to!}
                      onClick={() => setMobileOpen(false)}
                      className="mb-3 flex min-h-[44px] items-center rounded-lg bg-secondary/60 px-3 py-2.5 text-sm font-medium text-secondary-foreground"
                      activeProps={{ className: "bg-secondary" }}
                    >
                      {overview.label}
                    </Link>
                  )}
                  {groupsRendered.map((g) => (
                    <div key={g.id} className="mt-4 first:mt-0">
                      <p className="px-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {g.label}
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {g.items.map((item) => (
                          <li key={item.id}>
                            <Link
                              to={item.to!}
                              onClick={() => setMobileOpen(false)}
                              className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/60"
                              activeProps={{
                                className: "bg-secondary text-secondary-foreground",
                              }}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {extras.length > 0 && (
                    <div className="mt-4">
                      <p className="px-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Mais
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {extras.map((item) => (
                          <li key={item.id}>
                            <Link
                              to={item.to!}
                              onClick={() => setMobileOpen(false)}
                              className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/60"
                              activeProps={{
                                className: "bg-secondary text-secondary-foreground",
                              }}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Link
              to="/painel"
              className="flex shrink-0 items-center gap-3 group"
              aria-label="4 Lentes VITA — painel"
            >
              <span
                aria-hidden
                className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground font-serif text-lg shadow-sm"
              >
                4
              </span>
              <span className="hidden flex-col leading-tight md:flex">
                <span className="font-serif text-base tracking-tight">4 Lentes VITA</span>
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Sistema da Vitalidade Organizacional
                </span>
              </span>
            </Link>

            {/* Desktop grouped nav */}
            <nav
              className="ml-2 hidden flex-1 items-center gap-0.5 lg:flex"
              aria-label="Navegação principal"
            >
              {overview && (
                <Link
                  to={overview.to!}
                  className="rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                  activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                >
                  {overview.label}
                </Link>
              )}
              {groupsRendered.map((g) => (
                <DropdownMenu key={g.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-secondary data-[state=open]:text-secondary-foreground"
                      aria-label={`${g.label} — abrir menu`}
                    >
                      {g.label}
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-60">
                    {g.hint && (
                      <DropdownMenuLabel className="text-xs font-normal uppercase tracking-[0.14em] text-muted-foreground">
                        {g.hint}
                      </DropdownMenuLabel>
                    )}
                    {g.items.map((item) => (
                      <DropdownMenuItem key={item.id} asChild>
                        <Link
                          to={item.to!}
                          className="cursor-pointer"
                          activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                        >
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
              {extras.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                      aria-label="Mais — abrir menu"
                    >
                      Mais
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {extras.map((item) => (
                      <DropdownMenuItem key={item.id} asChild>
                        <Link to={item.to!} className="cursor-pointer">
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              {/* Persona switcher (mock auth — demo) */}
              <div className="relative">
                <button
                  onClick={() => setPersonaOpen((o) => !o)}
                  aria-expanded={personaOpen}
                  aria-haspopup="listbox"
                  className="flex h-10 items-center gap-2 rounded-md border border-border/60 bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
                  <span className="hidden max-w-[8rem] truncate sm:inline">{roleLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                </button>

                {personaOpen && (
                  <ul
                    role="listbox"
                    aria-label="Trocar papel de demonstração"
                    className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-border bg-popover p-1 shadow-lg"
                  >
                    <li className="px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Demo — trocar papel
                    </li>
                    {demoPersonas.map((id) => {
                      const label = pack?.roles?.find((r) => r.id === id)?.label ?? id;
                      return (
                        <li key={id} role="option" aria-selected={roleId === id}>
                          <button
                            onClick={() => {
                              setRole(id);
                              setPersonaOpen(false);
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                              roleId === id
                                ? "bg-secondary text-secondary-foreground"
                                : "text-popover-foreground hover:bg-muted/50"
                            }`}
                          >
                            {label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <PackSwitcher />
              <A11yMenu />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>

        <footer className="border-t border-border/60 py-6 print:hidden">
          <div className="mx-auto max-w-7xl px-6 text-xs text-muted-foreground">
            4 Lentes VITA™ · MVP mock-first em construção
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
