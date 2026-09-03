import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeAuthReturnTo } from "@/lib/auth/auth-redirect";

const ADMIN_ROLES = new Set(["RH_ADMIN", "DIRETOR", "SST"]);

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Acessando · 4 Lentes VitalOS™" }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [message, setMessage] = useState("Validando seu acesso…");

  useEffect(() => {
    let cancelled = false;

    async function resolveDestination() {
      // Wait briefly for supabase-js to consume the URL hash/code.
      const start = Date.now();
      let session = (await supabase.auth.getSession()).data.session;
      while (!session && Date.now() - start < 4000) {
        await new Promise((r) => setTimeout(r, 150));
        session = (await supabase.auth.getSession()).data.session;
      }

      if (cancelled) return;

      if (!session) {
        setMessage("Não conseguimos validar o link. Tente novamente.");
        setTimeout(() => {
          if (!cancelled) navigate({ to: "/entrar" });
        }, 1500);
        return;
      }

      const safeRedirect = sanitizeAuthReturnTo(redirect);
      if (safeRedirect) {
        navigate({ to: safeRedirect });
        return;
      }

      // Look up profile role. Timeout guard: nunca deixa a tela travada em
      // "Validando…" para sempre se a consulta não responder.
      let profile: { role?: string } | null = null;
      try {
        const lookup = supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("profile_lookup_timeout")), 8000),
        );
        const result = await Promise.race([lookup, timeout]);
        profile = (result as { data: { role?: string } | null }).data;
      } catch {
        if (cancelled) return;
        setMessage("Não foi possível carregar seu perfil. Tente novamente.");
        setTimeout(() => {
          if (!cancelled) navigate({ to: "/entrar" });
        }, 1500);
        return;
      }

      if (cancelled) return;

      if (!profile) {
        navigate({ to: "/onboarding" });
        return;
      }

      const role = profile.role;
      const destination = role && ADMIN_ROLES.has(role) ? "/rh" : "/colaborador";
      navigate({ to: destination });
    }

    resolveDestination();
    return () => {
      cancelled = true;
    };
  }, [navigate, redirect]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
          4 Lentes VitalOS™
        </p>
        <h1 className="mt-4 font-serif text-3xl text-foreground">{message}</h1>
      </div>
    </div>
  );
}
