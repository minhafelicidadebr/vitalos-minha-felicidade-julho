import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { resolveAuthCallbackRedirect } from "@/lib/auth/auth-redirect";
import { withAuthDeadline } from "@/lib/auth/auth-recovery";
import { InstitutionalAuthFrame, MagicLinkForm } from "@/features/auth/InstitutionalAuth";

export const Route = createFileRoute("/entrar")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Entrar · 4 Lentes VitalOS™" },
      { name: "description", content: "Acesse VitalOS com um link mágico enviado ao seu e-mail." },
    ],
  }),
  component: EntrarPage,
});
function EntrarPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  useEffect(() => {
    let active = true;
    withAuthDeadline(supabase.auth.getSession(), 6000)
      .then(({ data }) => {
        if (active && data.session) navigate({ to: "/auth/callback", search: { redirect } });
      })
      .catch(() => {
        /* O formulário continua disponível para recuperação. */
      });
    return () => {
      active = false;
    };
  }, [navigate, redirect]);
  async function sendLink(email: string) {
    const authRedirect = resolveAuthCallbackRedirect(window.location.origin, redirect, {
      VITE_FIBT_HML_ENABLED: import.meta.env.VITE_FIBT_HML_ENABLED,
      VITE_FIBT_HML_FRONTEND_BASE_URL: import.meta.env.VITE_FIBT_HML_FRONTEND_BASE_URL,
    });
    if (!authRedirect.ok) throw new Error("auth_origin_invalid");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: authRedirect.callbackUrl,
        shouldCreateUser: !authRedirect.existingAccountOnly,
      },
    });
    if (error) throw new Error("auth_send_failed");
  }
  return (
    <InstitutionalAuthFrame>
      <MagicLinkForm sendLink={sendLink} />
    </InstitutionalAuthFrame>
  );
}
