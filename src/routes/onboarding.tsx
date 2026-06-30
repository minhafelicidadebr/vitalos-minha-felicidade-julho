// Primeira configuração do cliente — chamada quando admin loga sem organização.
// Cria org + perfil RH_ADMIN e redireciona para /rh.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitOnboarding } from "@/lib/api/onboarding.functions";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Configurar organização — VitalOS™" }] }),
  component: OnboardingPage,
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(v: string) {
    setOrgName(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim() || !slug.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Sessão expirada. Faça login novamente.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await submitOnboarding({
        data: {
          userId: session.user.id,
          orgName: orgName.trim(),
          orgSlug: slug.trim(),
        },
      });

      if (!result.ok) {
        setError(result.error);
      } else {
        navigate({ to: "/rh" });
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            4 Lentes VitalOS™
          </p>
          <h1 className="mt-2 font-serif text-2xl text-foreground">
            Configure sua organização
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Estas informações identificam sua empresa no sistema.
            Você poderá editar depois.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm space-y-5">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Nome da organização
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Empresa ABC Ltda"
              required
              className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <span>Identificador único</span>
              <span className="normal-case font-normal text-muted-foreground/70">URL-safe · gerado automaticamente</span>
            </label>
            <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30">
              <span className="text-muted-foreground/60 shrink-0">org/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                pattern="[a-z0-9-]+"
                required
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!orgName.trim() || !slug.trim() || submitting}
            className="w-full rounded-2xl bg-primary px-6 py-3.5 font-serif text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Configurando…" : "Iniciar plataforma"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          Como administrador, você terá acesso completo ao painel de RH,
          criação de ondas e relatórios da sua organização.
        </p>
      </motion.div>
    </div>
  );
}
