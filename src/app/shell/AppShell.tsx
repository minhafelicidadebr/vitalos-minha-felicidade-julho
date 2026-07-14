import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, MotionConfig } from "framer-motion";
import {
  Activity,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { A11yMenu } from "./A11yMenu";
import { PackSwitcher } from "./PackSwitcher";
import { DemoGateScreen } from "./DemoGate";
import { useDemoGate } from "./demo-gate";
import { DemoRouteGuard } from "@/app/identity/DemoRouteGuard";
import { usePersona } from "@/app/identity/persona-store";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { supabase } from "@/integrations/supabase/client";
import { usePack } from "@/engine/pack";
import { navForRole, resolveEffectiveRoleId } from "@/engine/rbac/rbac";
import { useA11y } from "./A11yProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * AppShell — header institucional + navegação dirigida pelo pack × papel,
 * agrupada pelo ciclo do produto (Medir · Agir · Provar · Estratégico · Confiança).
 */

// Mapeia ids de navegação do pack para rotas implementadas.
const NAV_ROUTES: Record<string, string> = {
  overview: "/", // por papel, abaixo
  ivo: "/ivo",
  pulses: "/pulse",
  espelho: "/espelho",
  // O item "ai" abre o copiloto setorial aterrado (chat pack-aware). A tela legada
  // de modos (/floresceria) segue como rota válida para rollback de uma linha.
  ai: "/copilota",
  copilota: "/copilota",
  copilot: "/copiloto",
  academy: "/academia",
  // Educar (revisão espaçada) e a plataforma de drivers NR-1 (catálogo + matriz crosswalk).
  review: "/revisar",
  diploma: "/diploma",
  practice_journal: "/diario",
  expedition: "/expedicao",
  weekly_loop: "/loop-vivo",
  matrix: "/matriz",
  drivers: "/drivers",
  missions: "/missoes",
  recognition: "/reconhecimento",
  vitrine: "/vitrine",
  access: "/acesso",
  data_pipeline: "/pipeline-dados",
  ambassadorships: "/embaixadorias",
  reports: "/relatorios",
  esg_report: "/relatorio-global",
  certification: "/selo",
  cycle_close: "/fechamento",
  cycle_book: "/livro-do-ciclo",
  action_plan: "/plano-acao",
  lab: "/lab",
  impact: "/impacto",
  experiments: "/experimentos",
  domain_b: "/sst",
  signals: "/sinais",
  privacy: "/privacidade",
  methodology: "/metodologia",
  program: "/programa",
  // "sectors" abre o Atlas Multissetorial dinâmico (todos os packs ao vivo).
  // /setores (estático, 2 setores) segue como rota legada para rollback.
  sectors: "/atlas",
  atlas: "/atlas",
  panorama: "/panorama",
  benchmark: "/benchmark",
  lupa_da_escuta: "/lupa-da-escuta",
  fibt: "/fibt",
  season: "/temporada",
  trend: "/evolucao",
  wave: "/onda",
  waves: "/ondas",
  devolutiva: "/devolutiva",
  priorities: "/prioridades",
  forecast: "/trajetoria",
  viat: "/viat",
  esg: "/esg",
};

// Exportado: usado por rotas fora do shell que precisam saber onde uma
// sessão real deve pousar por papel (ex.: aceitar-convite.$token.tsx, após
// aceitar um convite de membro — mesmo princípio de resolveOrgOverviewRoute
// para o admin em /ativar, mas por papel em vez de por pack).
export const ROLE_HOME: Record<string, string> = {
  COLABORADOR: "/colaborador",
  EMBAIXADOR: "/embaixador",
  LIDER_EQUIPE: "/lider",
  RH_ADMIN: "/rh",
  CHRO: "/rh",
  C_LEVEL: "/clevel",
  SST_PROFISSIONAL: "/sst",
  CIPA_MEMBRO: "/sst",
  HOLDING_ADMIN: "/holding",
  // Fallbacks por papel. Packs podem declarar overviewRoute para uma home adaptativa.
  DIRETOR: "/escola",
  COORDENADOR: "/escola",
  ORIENTADOR: "/escola",
  SECRETARIA_EDU: "/escola",
  GESTOR_REDE: "/escola",
  C_LEVEL_EDU: "/escola",
  EDUCADOR: "/escola",
  ESTUDANTE: "/escola",
  FAMILIA: "/escola",
  // Governo (CidadanIA) — home adaptativa por audiência.
  DIRIGENTE: "/governo",
  SECRETARIO: "/governo",
  GESTOR_ORGAO: "/governo",
  DGP_RH: "/governo",
  CONTROLE_INTERNO: "/governo",
  CIPA_SST_GOV: "/governo",
  GESTOR_EQUIPE: "/governo",
  SERVIDOR: "/governo",
  EMBAIXADOR_GOV: "/governo",
  CONSULTOR_GOV: "/governo",
  // Condomínio (ConvivIA) — home adaptativa por audiência.
  SINDICO: "/condominios",
  SUBSINDICO: "/condominios",
  CONSELHO: "/condominios",
  CONSELHO_FISCAL: "/condominios",
  ADMINISTRADORA: "/condominios",
  GESTOR_CARTEIRA: "/condominios",
  ZELADOR: "/condominios",
  FUNCIONARIO_COND: "/condominios",
  MORADOR: "/condominios",
  EMBAIXADOR_COND: "/condominios",
  CONSULTOR_COND: "/condominios",
  // Saúde (CuidarIA) — home adaptativa por audiência.
  // (GESTOR_REDE é compartilhado com o pack Escola; o overviewRoute do pack ativo
  // resolve o destino correto, então não se redefine a chave aqui.)
  DIRETOR_CLINICO: "/saude",
  SUPERINTENDENTE: "/saude",
  GERENTE_ENFERMAGEM: "/saude",
  SESMT_SAUDE: "/saude",
  QUALIDADE_SEGURANCA: "/saude",
  COORDENADOR_EQUIPE: "/saude",
  PROFISSIONAL_SAUDE: "/saude",
  RESIDENTE: "/saude",
  EMBAIXADOR_SAUDE: "/saude",
  CONSULTOR_SAUDE: "/saude",
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
    items: ["wave", "waves", "ivo", "pulses", "espelho", "signals", "trend", "season"],
  },
  {
    id: "agir",
    label: "Agir",
    hint: "O que fazer a seguir",
    items: [
      "devolutiva",
      "priorities",
      "forecast",
      "action_plan",
      "copilot",
      "missions",
      "recognition",
      "vitrine",
    ],
  },
  {
    id: "provar",
    label: "Provar",
    hint: "Evidência e certificação",
    items: ["impact", "experiments", "reports", "esg_report", "certification", "cycle_close", "cycle_book"],
  },
  {
    id: "estrategico",
    label: "Estratégico",
    hint: "Visão de board e portfólio",
    items: [
      "program",
      "sectors",
      "panorama",
      "benchmark",
      "lupa_da_escuta",
      "esg",
      "fibt",
      "viat",
      "domain_b",
      "matrix",
      "drivers",
    ],
  },
  {
    id: "comunidade",
    label: "Comunidade",
    hint: "Pessoas, forças e cultura",
    items: [
      "academy",
      "review",
      "practice_journal",
      "weekly_loop",
      "expedition",
      "diploma",
      "ambassadorships",
      "lab",
      "ai",
    ],
  },
  {
    id: "confianca",
    label: "Confiança",
    hint: "Método, privacidade e governança",
    items: ["methodology", "privacy", "access", "data_pipeline"],
  },
];

const MOBILE_GROUP_ICONS: Record<string, LucideIcon> = {
  medir: Activity,
  agir: Sparkles,
  provar: ShieldCheck,
};

const DEMO_ROUTE_POLICIES: Record<string, string> = {
  "/sst": "domain_b",
  "/pipeline-dados": "data_pipeline",
};

const REAL_ROLE_LABEL: Record<string, string> = {
  RH_ADMIN: "Administrador",
  DIRETOR: "Diretor",
  CHRO: "CHRO",
  C_LEVEL: "C-Level",
  SST_PROFISSIONAL: "SST",
  COLABORADOR: "Colaborador",
  LIDER_EQUIPE: "Líder de Equipe",
};

/** Indicador de sessão real — substitui os seletores de demonstração (persona
 * e setor) quando o usuário é um cliente pago, não um explorador da demo. */
function RealOrgBadge({ org }: { org: import("@/app/identity/useRealOrgSession").RealOrgSession }) {
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-10 items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
        <span className="hidden max-w-[10rem] truncate xl:inline">{org.orgName}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Conta"
          className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          <li className="px-3 py-2">
            <p className="truncate text-sm font-medium text-popover-foreground">{org.orgName}</p>
            <p className="text-xs text-muted-foreground">
              {REAL_ROLE_LABEL[org.role] ?? org.role}
            </p>
          </li>
          <li role="separator" className="my-1 border-t border-border/60" />
          <li>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sair
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

function VitalOsMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor" opacity="0.92">
        <ellipse cx="20" cy="9" rx="4" ry="7" />
        <ellipse cx="20" cy="31" rx="4" ry="7" />
        <ellipse cx="9" cy="20" rx="7" ry="4" />
        <ellipse cx="31" cy="20" rx="7" ry="4" />
      </g>
      <circle cx="20" cy="20" r="4" fill="var(--color-accent)" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pack, sectorLabel } = usePack();
  const { roleId, setRole } = usePersona();
  const { reduceMotion } = useA11y();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [personaOpen, setPersonaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const guardedNavId = DEMO_ROUTE_POLICIES[pathname];

  // Portão de demonstração — fronteira única entre a landing pública e o app
  // DE DEMONSTRAÇÃO. Enquanto o localStorage não rehidrata, mostramos o
  // portão (estado seguro): servidor e 1ª renderização do cliente coincidem
  // (sem mismatch de hidratação).
  const gateUnlocked = useDemoGate((s) => s.unlocked);
  const gateHydrated = useDemoGate((s) => s.hasHydrated);
  const lockDemo = useDemoGate((s) => s.lock);

  // Cliente REAL (organização provisionada via /ativar/:token) nunca precisa
  // da senha de demonstração — a fronteira de acesso dele é a autenticação
  // Supabase + RLS, não uma senha compartilhada de marketing.
  const { loading: realOrgLoading, org: realOrg } = useRealOrgSession();
  if (realOrgLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="animate-pulse text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Carregando…
        </p>
      </div>
    );
  }
  if (!realOrg && (!gateHydrated || !gateUnlocked)) {
    return <DemoGateScreen />;
  }

  // Sessão real presente → o papel dela vence a persona de demonstração salva
  // no localStorage deste navegador. Sem isso, alguém logado como SST real
  // podia navegar pelo menu de Holding só porque foi o último papel explorado
  // na demo. Ver src/engine/rbac/rbac.ts para o teste desse invariante.
  const effectiveRoleId = resolveEffectiveRoleId(realOrg?.role, roleId);

  const roleLabel = pack?.roles?.find((r) => r.id === effectiveRoleId)?.label ?? effectiveRoleId;
  const configuredOverviewRoute =
    typeof pack?.overviewRoute === "string" ? pack.overviewRoute : undefined;
  const roleHome = configuredOverviewRoute ?? ROLE_HOME[effectiveRoleId] ?? "/painel";

  // Personas de demonstração vêm do pack ativo — pack-driven, não hardcoded.
  const demoPersonas =
    (pack?.demoPersonas as string[] | undefined) ?? (DEMO_PERSONAS_FALLBACK as readonly string[]);

  const visibleItems = pack
    ? navForRole(pack, effectiveRoleId)
        .map((item) => ({
          ...item,
          to: item.id === "overview" ? roleHome : NAV_ROUTES[item.id],
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
  const mobileTabs = [
    { id: "inicio", label: "Início", to: roleHome, icon: Home, routes: [roleHome] },
    ...groupsRendered
      .filter((group) => MOBILE_GROUP_ICONS[group.id] && group.items[0])
      .slice(0, 3)
      .map((group) => ({
        id: group.id,
        label: group.label,
        to: group.items[0]!.to!,
        icon: MOBILE_GROUP_ICONS[group.id]!,
        routes: group.items.map((item) => item.to!),
      })),
  ];

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="min-h-dvh flex flex-col bg-background text-foreground"
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
        >
          Pular para o conteúdo
        </a>
        <header className="sticky top-0 z-40 border-b border-border/60 bg-card/78 shadow-[0_1px_0_color-mix(in_oklab,var(--color-border)_58%,transparent)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/62 print:hidden">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
            {/* Mobile drawer trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <button
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card/60 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted/50 hover:shadow-md xl:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
              <SheetContent
                side="left"
                className="w-[90vw] max-w-sm overflow-y-auto border-r-border/60 bg-background/96 p-0 backdrop-blur-xl"
              >
                <SheetHeader className="border-b border-border/60 bg-card/55 px-5 py-5 text-left">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-inset ring-white/10"
                    >
                      <VitalOsMark className="h-7 w-7" />
                    </span>
                    <div className="min-w-0">
                      <SheetTitle className="font-serif text-base">Programa VitalOS™</SheetTitle>
                      <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        Sistema da Vitalidade Organizacional
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                      <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        Perfil
                      </p>
                      <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                        {roleLabel}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                      <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        Setor
                      </p>
                      <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                        {sectorLabel}
                      </p>
                    </div>
                  </div>
                </SheetHeader>
                <div className="px-3 py-4">
                  <Link
                    to="/painel"
                    onClick={() => setMobileOpen(false)}
                    className="mb-3 flex min-h-[48px] items-center gap-3 rounded-2xl border border-primary/15 bg-primary/8 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/12"
                    activeProps={{ className: "border-primary/30 bg-primary/12 text-primary" }}
                  >
                    <span
                      aria-hidden
                      className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"
                    >
                      <Home className="h-4 w-4" />
                    </span>
                    Central VitalOS™
                  </Link>
                  {overview && (
                    <Link
                      to={overview.to!}
                      onClick={() => setMobileOpen(false)}
                      className="mb-5 flex min-h-[44px] items-center rounded-xl border border-border/50 bg-secondary/55 px-3 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                      activeProps={{ className: "border-primary/25 bg-secondary" }}
                    >
                      Meu painel · {overview.label}
                    </Link>
                  )}
                  {groupsRendered.map((g) => (
                    <div key={g.id} className="mt-5 first:mt-0">
                      <div className="px-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                          {g.label}
                        </p>
                        {g.hint && (
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            {g.hint}
                          </p>
                        )}
                      </div>
                      <ul className="mt-2 space-y-1">
                        {g.items.map((item) => (
                          <li key={item.id}>
                            <Link
                              to={item.to!}
                              onClick={() => setMobileOpen(false)}
                              className="flex min-h-[44px] items-center rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/60"
                              activeProps={{
                                className:
                                  "bg-secondary font-medium text-secondary-foreground shadow-sm",
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
              className="group flex min-w-0 shrink-0 items-center gap-3"
              aria-label="4 Lentes VitalOS™ — painel"
            >
              <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/18 ring-1 ring-inset ring-white/10 transition-transform duration-300 group-hover:-translate-y-0.5"
              >
                <VitalOsMark className="h-6 w-6" />
              </span>
              <span className="hidden min-w-0 flex-col leading-tight md:flex">
                <span className="truncate font-serif text-base tracking-tight">
                  Programa VitalOS™
                </span>
                <span className="hidden truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground lg:block">
                  Sistema da Vitalidade Organizacional
                </span>
              </span>
            </Link>

            {/* Desktop grouped nav */}
            <nav
              className="ml-2 hidden flex-1 items-center gap-0.5 xl:flex"
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
              {realOrg ? (
                <RealOrgBadge org={realOrg} />
              ) : (
                <>
                  {/* Persona switcher (mock auth — demo) */}
                  <div className="relative">
                    <button
                      onClick={() => setPersonaOpen((o) => !o)}
                      aria-expanded={personaOpen}
                      aria-haspopup="listbox"
                      className="flex h-10 items-center gap-2 rounded-md border border-border/60 bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
                      <span className="hidden max-w-[8rem] truncate xl:inline">{roleLabel}</span>
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
                        <li role="separator" className="my-1 border-t border-border/60" />
                        <li>
                          <button
                            onClick={() => {
                              setPersonaOpen(false);
                              lockDemo();
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <LogOut className="h-3.5 w-3.5" aria-hidden />
                            Sair da demo
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>

                  <PackSwitcher />
                </>
              )}
              <A11yMenu />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 pb-24 outline-none xl:pb-0">
          {guardedNavId ? (
            <DemoRouteGuard navId={guardedNavId}>{children}</DemoRouteGuard>
          ) : (
            children
          )}
        </main>

        <nav
          className="fixed inset-x-3 bottom-3 z-40 grid overflow-hidden rounded-2xl border border-border/70 bg-card/88 p-1.5 shadow-2xl shadow-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-card/78 xl:hidden print:hidden"
          style={{
            gridTemplateColumns: `repeat(${mobileTabs.length + 1}, minmax(0, 1fr))`,
          }}
          aria-label="Navegação rápida"
        >
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.routes.includes(pathname);
            return (
              <Link
                key={tab.id}
                to={tab.to}
                aria-current={isActive ? "page" : undefined}
                className={`group flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors hover:bg-muted/55 hover:text-foreground ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className="group flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/55 hover:text-foreground"
            aria-label="Abrir menu completo"
          >
            <Menu className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
            <span>Menu</span>
          </button>
        </nav>

        <footer className="border-t border-border/60 pt-6 pb-28 xl:py-6 print:hidden">
          <div className="mx-auto max-w-7xl px-6 text-xs text-muted-foreground">
            4 Lentes VitalOS™ · MVP mock-first em construção
          </div>
        </footer>
      </motion.div>
    </MotionConfig>
  );
}
