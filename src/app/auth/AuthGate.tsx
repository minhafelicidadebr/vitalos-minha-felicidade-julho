import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const PUBLIC_PREFIXES = [
  "/entrar",
  "/auth/callback",
  "/onboarding",
  "/responder",
  "/respond",
  "/convite",
  "/quiosque",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const isPublic = isPublicPath(pathname);

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
    if (!ready) return;
    if (isPublic) return;
    if (!session) {
      navigate({
        to: "/entrar",
        search: { redirect: pathname === "/" ? undefined : pathname },
      });
    }
  }, [ready, session, isPublic, pathname, navigate]);

  if (!ready && !isPublic) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Verificando acesso…
        </p>
      </div>
    );
  }

  if (!isPublic && !session) {
    return null;
  }

  return <>{children}</>;
}