import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "./ThemeToggle";
import { usePack } from "@/engine/pack";
import { navForRole, usePersona } from "@/engine/rbac/rbac";

/**
 * AppShell — header institucional + navegação dirigida pelo pack × papel
 * (Bloco 1: RBAC + seletor de persona para demo) + rodapé.
 */

// Mapeia ids de navegação do pack para rotas implementadas.
// Itens sem rota ainda não aparecem (vão entrando bloco a bloco).
const NAV_ROUTES: Record<string, string> = {
  overview: "/", // por papel, abaixo
  ivo: "/ivo",
  pulses: "/pulse",
  ai: "/floresceria",
  copilot: "/copiloto",
  academy: "/academia",
  ambassadorships: "/embaixadorias",
  reports: "/relatorios",
  action_plan: "/lab", // Culture Lab abriga protocolos/experimentos por ora
  experiments: "/experimentos",
  domain_b: "/sst",
  panorama: "/panorama",
  season: "/temporada",
  priorities: "/prioridades",
  forecast: "/trajetoria",
  viat: "/viat",
  esg: "/esg",
};

// Home de cada papel (item "overview")
const ROLE_HOME: Record<string, string> = {
  COLABORADOR: "/colaborador",
  EMBAIXADOR: "/colaborador",
  LIDER_EQUIPE: "/lider",
  RH_ADMIN: "/rh",
  CHRO: "/rh",
  C_LEVEL: "/clevel",
  SST_PROFISSIONAL: "/sst",
  CIPA_MEMBRO: "/sst",
  HOLDING_ADMIN: "/holding",
};

// Papéis exibidos no seletor de demo (com dashboards implementados)
const DEMO_PERSONAS = [
  "COLABORADOR",
  "LIDER_EQUIPE",
  "RH_ADMIN",
  "CHRO",
  "C_LEVEL",
  "SST_PROFISSIONAL",
  "HOLDING_ADMIN",
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pack } = usePack();
  const { roleId, setRole } = usePersona();
  const [personaOpen, setPersonaOpen] = useState(false);

  const roleLabel = pack?.roles?.find((r) => r.id === roleId)?.label ?? roleId;

  const navItems = pack
    ? navForRole(pack, roleId)
        .map((item) => ({
          ...item,
          to: item.id === "overview" ? (ROLE_HOME[roleId] ?? "/") : NAV_ROUTES[item.id],
        }))
        .filter((item) => Boolean(item.to))
    : [];

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-3 group"
            aria-label="4 Lentes VITA — início"
          >
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground font-serif text-lg shadow-sm"
            >
              4
            </span>
            <span className="hidden flex-col leading-tight md:flex">
              <span className="font-serif text-base tracking-tight">4 Lentes VITA</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Sistema da Vitalidade Organizacional
              </span>
            </span>
          </Link>

          {/* Pack-driven nav */}
          <nav
            className="hidden items-center gap-0.5 overflow-x-auto lg:flex"
            aria-label="Navegação principal"
          >
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.to!}
                className="whitespace-nowrap rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Persona switcher (mock auth — demo) */}
            <div className="relative">
              <button
                onClick={() => setPersonaOpen((o) => !o)}
                aria-expanded={personaOpen}
                aria-haspopup="listbox"
                className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
                <span className="max-w-[8rem] truncate">{roleLabel}</span>
                <span aria-hidden className="text-muted-foreground">
                  ▾
                </span>
              </button>

              {personaOpen && (
                <ul
                  role="listbox"
                  aria-label="Trocar papel de demonstração"
                  className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-border bg-popover p-1 shadow-lg"
                >
                  <li className="px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Demo — trocar papel
                  </li>
                  {DEMO_PERSONAS.map((id) => {
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

            <ThemeToggle />
          </div>
        </div>

        {/* Mobile nav strip */}
        <nav
          className="flex gap-0.5 overflow-x-auto border-t border-border/40 px-3 py-1.5 lg:hidden"
          aria-label="Navegação principal (mobile)"
        >
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.to!}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto max-w-7xl px-6 text-xs text-muted-foreground">
          4 Lentes VITA™ · MVP mock-first em construção
        </div>
      </footer>
    </div>
  );
}
