import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useDemoGate } from "@/app/shell/demo-gate";
import { withAuthDeadline } from "@/lib/auth/auth-recovery";
import { authGateState } from "./auth-gate-state";

const PUBLIC_PREFIXES = [
  "/",
  "/entrar",
  "/auth/callback",
  "/onboarding",
  "/responder",
  "/respond",
  "/convite",
  "/quiosque",
  "/nr1",
  "/privacidade-comercial",
  "/apresentacao",
  // Guia da jornada: a leitura editorial tem a própria senha validada no servidor (/api/guia).
  "/guia-empresarial",
];

// Rotas que executam ações reais (provisionamento, escrita privilegiada) —
// nunca aceitam a senha de demonstração como suficiente. Exigem sessão
// Supabase de verdade sempre, mesmo com o portão de demo destravado.
const REAL_AUTH_ONLY_PREFIXES = ["/admin", "/plataforma", "/ativar", "/aceitar-convite"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [expired, setExpired] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const isPublic = matchesPrefix(pathname, PUBLIC_PREFIXES);
  const requiresRealAuth = matchesPrefix(pathname, REAL_AUTH_ONLY_PREFIXES);

  // A senha de demonstração (demo-gate.ts) NÃO é autenticação — é só o
  // "cordão de veludo" que mantém visitantes casuais fora da navegação.
  // Ela basta para toda a vitrine de showcase, mas nunca para rotas que
  // escrevem dados reais (essas sempre exigem sessão Supabase de verdade).
  const demoUnlocked = useDemoGate((s) => s.unlocked);
  const demoHydrated = useDemoGate((s) => s.hasHydrated);
  const gate = authGateState({
    isPublic,
    ready,
    hasSession: !!session,
    requiresRealAuth,
    demoHydrated,
    demoUnlocked,
    expired,
  });

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) setExpired(true);
    }, 8000);
    withAuthDeadline(supabase.auth.getSession(), 6000)
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setExpired(true);
          return;
        }
        setSession(data.session);
        setReady(true);
      })
      .catch(() => {
        if (mounted) setExpired(true);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setReady(true);
    });
    return () => {
      mounted = false;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (gate !== "login") return;
    navigate({
      to: "/entrar",
      search: { redirect: pathname === "/" ? undefined : pathname },
    });
  }, [gate, pathname, navigate]);

  if (gate === "recover")
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6">
          <h1 className="font-serif text-2xl">Não conseguimos verificar o acesso</h1>
          <p role="alert" className="text-sm leading-relaxed text-muted-foreground">
            Confira sua conexão e retome o acesso. Nenhum vínculo ou permissão foi alterado.
          </p>
          <a
            href={`/entrar?redirect=${encodeURIComponent(pathname)}`}
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Retomar acesso institucional
          </a>
        </div>
      </main>
    );
  if (gate === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p role="status" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Verificando acesso…
        </p>
      </div>
    );
  }

  if (gate === "login") {
    return null;
  }

  return <>{children}</>;
}
