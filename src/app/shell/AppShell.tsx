import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "./ThemeToggle";

/**
 * AppShell — moldura visual base.
 * Sidebar por papel, bottom-nav mobile e estados vazios virão nos próximos blocos.
 * Por ora: header institucional + área de conteúdo + rodapé discreto.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-3 group"
            aria-label="4 Lentes VITA — início"
          >
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground font-serif text-lg shadow-sm"
            >
              4
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-serif text-base tracking-tight">4 Lentes VITA</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Sistema da Vitalidade Organizacional
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/ivo"
              className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground sm:inline-block"
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            >
              IVO
            </Link>
            <Link
              to="/design-system"
              className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground sm:inline-block"
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            >
              Design System
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto max-w-7xl px-6 text-xs text-muted-foreground">
          4 Lentes VITA™ · Fundação (Bloco 0)
        </div>
      </footer>
    </div>
  );
}
