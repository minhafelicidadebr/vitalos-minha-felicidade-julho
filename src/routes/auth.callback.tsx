import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeAuthReturnTo } from "@/lib/auth/auth-redirect";
import { resolveAuthDestination, type AuthDestination } from "@/lib/auth/auth-recovery";
import { AuthCallbackStatus, InstitutionalAuthFrame } from "@/features/auth/InstitutionalAuth";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({ meta: [{ title: "Acessando · 4 Lentes VitalOS™" }] }),
  component: AuthCallbackPage,
});
function AuthCallbackPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<AuthDestination | null>(null);
  const returnTo = sanitizeAuthReturnTo(redirect);
  useEffect(() => {
    let active = true;
    resolveAuthDestination(
      {
        session: async () => {
          // Consumo normal de hash/code pelo SDK; limite global aplicado pelo resolvedor.
          const start = Date.now();
          let response = await supabase.auth.getSession();
          while (active && !response.error && !response.data.session && Date.now() - start < 4000) {
            await new Promise((resolve) => setTimeout(resolve, 150));
            response = await supabase.auth.getSession();
          }
          if (response.error) throw new Error("session_unavailable");
          return response.data.session;
        },
        profile: (id) => supabase.from("profiles").select("role").eq("id", id).maybeSingle(),
      },
      returnTo,
    ).then((next) => {
      if (!active) return;
      if (next.kind === "ready") navigate({ to: next.to });
      else setResult(next);
    });
    return () => {
      active = false;
    };
  }, [navigate, returnTo, attempt]);
  const returnHref = returnTo ? `/entrar?redirect=${encodeURIComponent(returnTo)}` : "/entrar";
  return (
    <InstitutionalAuthFrame>
      <AuthCallbackStatus
        result={result}
        returnHref={returnHref}
        retry={() => {
          setResult(null);
          setAttempt((value) => value + 1);
        }}
      />
    </InstitutionalAuthFrame>
  );
}
