// Painel do admin da PLATAFORMA (não de uma organização cliente) — gera os
// links de convite que fecham o self-serve. Só usuários cuja sessão bate com
// PLATFORM_ADMIN_EMAILS conseguem gerar ou listar convites; a checagem real
// acontece sempre no servidor (verifyPlatformAdmin), nunca só na tela.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, Copy, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createOrgInviteLink, listPlatformOrgInvites } from "@/lib/api/org-invite.functions";
import type { OrgInviteSummary } from "@/lib/api/org-invite.server";

export const Route = createFileRoute("/plataforma")({
  head: () => ({ meta: [{ title: "Plataforma · Convites — VitalOS™" }] }),
  component: PlataformaPage,
});

type Status = "checking" | "denied" | "ready";

function PlataformaPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [invites, setInvites] = useState<OrgInviteSummary[]>([]);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadInvites = useCallback(async (token: string) => {
    const result = await listPlatformOrgInvites({ data: { accessToken: token } });
    if (result.ok) setInvites(result.invites);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!active) return;
      if (!token) {
        setStatus("denied");
        return;
      }
      setAccessToken(token);
      const result = await listPlatformOrgInvites({ data: { accessToken: token } });
      if (!active) return;
      if (!result.ok) {
        setStatus("denied");
        return;
      }
      setInvites(result.invites);
      setStatus("ready");
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleCreate() {
    if (!accessToken || creating) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createOrgInviteLink({
        data: { accessToken, email: email.trim() || undefined },
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setEmail("");
        await loadInvites(accessToken);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink(link: string, token: string) {
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  if (status === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Verificando permissão…
          </p>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-dashed border-border/70 bg-card p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-serif text-xl text-foreground">Acesso restrito</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Esta área é exclusiva do administrador da plataforma. Se você acredita
            que deveria ter acesso, confirme se seu e-mail está na lista
            PLATFORM_ADMIN_EMAILS.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Plataforma · Provisionamento
          </p>
        </div>
        <h1 className="mt-1 font-serif text-3xl text-foreground">Convites de organização</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Gere um link de acesso único para cada cliente que contratou o serviço.
          Ao clicar, a pessoa faz login com o próprio e-mail e cadastra a empresa dela.
        </p>
      </motion.div>

      {/* Formulário de criação */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
      >
        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          E-mail do cliente (opcional — trava o convite a este e-mail)
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@empresacliente.com"
            className="flex-1 rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "Gerando…" : "Gerar link de convite"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Sem e-mail, qualquer pessoa com o link consegue usá-lo (uso único). Com
          e-mail, só quem logar com aquele endereço específico consegue completar o cadastro.
        </p>
      </motion.div>

      {/* Lista de convites */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="font-medium text-card-foreground">Convites gerados</p>
        </div>

        {invites.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum convite gerado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.token}
                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-mono text-xs text-foreground">
                      {invite.link}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        invite.usedAt
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {invite.usedAt ? "Usado" : "Pendente"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {invite.email ? `Vinculado a ${invite.email} · ` : "Sem e-mail vinculado · "}
                    Criado em {new Date(invite.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {!invite.usedAt && (
                  <button
                    onClick={() => copyLink(invite.link, invite.token)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40"
                  >
                    {copiedToken === invite.token ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
