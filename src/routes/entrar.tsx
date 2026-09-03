import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { resolveAuthCallbackRedirect } from "@/lib/auth/auth-redirect";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/entrar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar · 4 Lentes VitalOS™" },
      {
        name: "description",
        content: "Acesse VitalOS com um link mágico enviado ao seu e-mail.",
      },
    ],
  }),
  component: EntrarPage,
});

function EntrarPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/auth/callback", search: { redirect } });
    });
    return () => {
      active = false;
    };
  }, [navigate, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMsg(null);
    const authRedirect = resolveAuthCallbackRedirect(window.location.origin, redirect, {
      VITE_FIBT_HML_ENABLED: import.meta.env.VITE_FIBT_HML_ENABLED,
      VITE_FIBT_HML_FRONTEND_BASE_URL: import.meta.env.VITE_FIBT_HML_FRONTEND_BASE_URL,
    });
    if (!authRedirect.ok) {
      setStatus("error");
      setErrorMsg("Não foi possível iniciar o acesso neste ambiente.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: authRedirect.callbackUrl,
        shouldCreateUser: !authRedirect.existingAccountOnly,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            4 Lentes VitalOS™
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-foreground">
            Entrar com link mágico
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sem senha. Enviamos um link de acesso para o seu e-mail corporativo.
          </p>
        </div>

        {status === "sent" ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center">
            <p className="font-serif text-xl text-foreground">Verifique seu e-mail</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviamos um link de acesso para{" "}
              <span className="font-medium text-foreground">{email}</span>. Abra o e-mail no mesmo
              dispositivo para continuar.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-5 text-xs uppercase tracking-[0.2em] text-primary hover:underline"
            >
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] uppercase tracking-[0.24em] text-muted-foreground"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                className="mt-2 h-12 w-full rounded-md border border-input bg-background px-4 font-serif text-lg text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {errorMsg ? <p className="text-sm text-destructive">{errorMsg}</p> : null}
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {status === "sending" ? "Enviando…" : "Entrar com link mágico"}
            </button>
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Ao continuar você aceita os{" "}
              <Link to="/privacidade" className="underline hover:text-foreground">
                termos de privacidade
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
