import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

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

      if (redirect && redirect.startsWith("/")) {
        navigate({ to: redirect });
        return;
      }

      // Look up profile role.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      const role = (profile as { role?: string } | null)?.role;
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