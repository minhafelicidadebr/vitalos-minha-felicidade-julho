import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useDemoGate } from "@/app/shell/demo-gate";

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
];

// Rotas que executam ações reais (provisionamento, escrita privilegiada) —
// nunca aceitam a senha de demonstração como suficiente. Exigem sessão
// Supabase de verdade sempre, mesmo com o portão de demo destravado.
const REAL_AUTH_ONLY_PREFIXES = ["/admin", "/plataforma", "/ativar"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
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
  const allowedByDemoGate = !requiresRealAuth && demoUnlocked;

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready || !demoHydrated) return;
    if (isPublic) return;
    if (session) return;
    if (allowedByDemoGate) return;
    navigate({
      to: "/entrar",
      search: { redirect: pathname === "/" ? undefined : pathname },
    });
  }, [ready, demoHydrated, session, isPublic, allowedByDemoGate, pathname, navigate]);

  if ((!ready || !demoHydrated) && !isPublic) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Verificando acesso…
        </p>
      </div>
    );
  }

  if (!isPublic && !session && !allowedByDemoGate) {
    return null;
  }

  return <>{children}</>;
}