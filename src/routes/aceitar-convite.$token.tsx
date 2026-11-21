// Aceite de convite de PESSOA — uma segunda+ pessoa entrando numa organização
// já existente, com papel explícito. Distinto de /ativar (cria organização
// nova) e de /convite (resposta anônima de pesquisa, sem login nunca).
//
// AuthGate já garante sessão real antes deste componente montar (rota em
// REAL_AUTH_ONLY_PREFIXES) — mesma garantia de /ativar. Sem formulário: org
// e papel já vêm fixos do convite, só falta confirmar.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Check, Loader2, ShieldAlert, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkMemberInviteToken, submitMemberInviteAcceptance } from "@/lib/api/member-invite.functions";
import { ROLE_HOME } from "@/app/shell/AppShell";
import { FirstAdminAcceptance } from "@/components/identity/FirstAdminAcceptance";

export const Route = createFileRoute("/aceitar-convite/$token")({
  head: () => ({ meta: [{ title: "Aceitar convite — 4 Lentes VitalOS™" }] }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useParams();
  return /^[a-f0-9]{64}$/.test(token) ? <FirstAdminAcceptance token={token} /> : <AcceptMemberInvitePage />;
}

type Resolution =
  | { valid: true; orgName: string; roleLabel: string; email: string }
  | { valid: false; error: string };

function AcceptMemberInvitePage() {
  const { token } = Route.useParams();
  const [resolution, setResolution] = useState<Resolution | "loading">("loading");

  useEffect(() => {
    let active = true;
    checkMemberInviteToken({ data: { token } })
      .then((r) => active && setResolution(r))
      .catch(() => active && setResolution({ valid: false, error: "Convite inválido." }));
    return () => {
      active = false;
    };
  }, [token]);

  if (resolution === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando convite…</p>
        </div>
      </div>
    );
  }

  if (!resolution.valid) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-dashed border-border/70 bg-card p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-serif text-xl text-foreground">Convite indisponível</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{resolution.error}</p>
        </div>
      </div>
    );
  }

  return <AcceptForm token={token} resolution={resolution} />;
}

function AcceptForm({
  token,
  resolution,
}: {
  token: string;
  resolution: { orgName: string; roleLabel: string; email: string };
}) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setError("Sessão expirada. Faça login novamente.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await submitMemberInviteAcceptance({
        data: { accessToken: session.access_token, token },
      });
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      // "/" é só a landing pública (nunca verifica sessão real) — navegar pra
      // lá aqui deixava a pessoa de volta no marketing. ROLE_HOME é a mesma
      // fonte que o AppShell usa pra resolver a home de uma sessão real
      // (mesmo princípio de resolveOrgOverviewRoute em /ativar, por papel).
      navigate({ to: ROLE_HOME[result.role] ?? "/painel" });
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
            <UserPlus className="h-7 w-7 text-primary" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            4 Lentes VitalOS™
          </p>
          <h1 className="mt-2 font-serif text-2xl text-foreground">Você foi convidado</h1>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm space-y-5">
          <p className="text-center text-base leading-relaxed text-foreground">
            <span className="font-medium">{resolution.orgName}</span> convida você a entrar como{" "}
            <span className="font-medium text-primary">{resolution.roleLabel}</span>.
          </p>
          <p className="text-center text-xs text-muted-foreground">{resolution.email}</p>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleAccept}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-serif text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              "Entrando…"
            ) : (
              <>
                <Check className="h-4 w-4" />
                Aceitar e entrar
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
