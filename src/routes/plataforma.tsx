// Painel do admin da PLATAFORMA (não de uma organização cliente) — gera os
// links de convite que fecham o self-serve. Só usuários cuja sessão bate com
// PLATFORM_ADMIN_EMAILS conseguem gerar ou listar convites; a checagem real
// acontece sempre no servidor (verifyPlatformAdmin), nunca só na tela.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, Copy, CheckCircle2, Loader2, KeyRound, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createOrgInviteLink, listPlatformOrgInvites } from "@/lib/api/org-invite.functions";
import type { OrgInviteSummary } from "@/lib/api/org-invite.server";
import { adminListLeads, adminListAccountHealth } from "@/lib/api/lead-capture.functions";
import type { LeadRow } from "@/lib/growth/lead-capture.server";
import type { AccountHealthRow } from "@/lib/growth/customer-health.server";
import { FirstAdminInvites } from "@/components/identity/FirstAdminInvites";
import { PlatformModules } from "@/components/identity/EnterpriseModules";
import { PartnerInterestQueue } from "@/components/identity/PartnerInterestQueue";
import { Q1DelegationPanel } from "@/components/identity/Q1DelegationPanel";
import { Q1ReviewerAssignment } from "@/components/identity/Q1ReviewerAssignment";

export const Route = createFileRoute("/plataforma")({
  head: () => ({ meta: [{ title: "Plataforma · Convites — VitalOS™" }] }),
  component: PlataformaPage,
});

type Status = "checking" | "denied" | "ready";

type PlanId = "pilot" | "growth" | "enterprise";

const PLAN_OPTIONS: { id: PlanId; label: string; hint: string }[] = [
  { id: "pilot", label: "Pilot", hint: "1 onda/mês · até 50 convites" },
  { id: "growth", label: "Growth", hint: "mais ondas e convites" },
  { id: "enterprise", label: "Enterprise", hint: "sem limites de piloto" },
];

function PlataformaPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [invites, setInvites] = useState<OrgInviteSummary[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [accounts, setAccounts] = useState<AccountHealthRow[]>([]);
  const [accountsStatus, setAccountsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<PlanId>("pilot");
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
      adminListLeads({ data: { accessToken: token } }).then((r) => setLeads(r.leads));
      adminListAccountHealth({ data: { accessToken: token } })
        .then((r) => {
          if (!active) return;
          setAccounts(r.accounts);
          setAccountsStatus("ready");
        })
        .catch(() => {
          if (!active) return;
          setAccounts([]);
          setAccountsStatus("error");
        });
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
        data: { accessToken, email: email.trim() || undefined, plan },
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setEmail("");
        setPlan("pilot");
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
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          <p role="status" className="text-sm text-muted-foreground">
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
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-xl text-foreground">Acesso restrito</h1>
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
          Gere um link de acesso único para cada cliente que contratou o serviço. Ao clicar, a
          pessoa faz login com o próprio e-mail e cadastra a empresa dela.
        </p>
      </motion.div>

      {accessToken && <FirstAdminInvites accessToken={accessToken} />}
      {accessToken && <PlatformModules accessToken={accessToken} />}
      {accessToken && <Q1DelegationPanel key={accessToken} accessToken={accessToken} />}
      {accessToken && <Q1ReviewerAssignment key={"review/" + accessToken} accessToken={accessToken} />}
      {import.meta.env.DEV && accessToken && (
        <PartnerInterestQueue key={accessToken} accessToken={accessToken} />
      )}
      {/* Formulário de criação */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
      >
        <label
          htmlFor="invite-email"
          className="mb-2 block text-sm font-medium text-muted-foreground"
        >
          E-mail do cliente (opcional — trava o convite a este e-mail)
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contato@empresacliente.com"
          className="w-full rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />

        <fieldset className="mt-4">
          <legend className="mb-2 block text-sm font-medium text-muted-foreground">
            Plano contratado
          </legend>
          <div className="flex flex-wrap gap-2">
            {PLAN_OPTIONS.map((opt) => {
              const selected = plan === opt.id;
              return (
                <label
                  key={opt.id}
                  htmlFor={`plan-${opt.id}`}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-left text-sm font-medium transition-all focus-within:ring-2 focus-within:ring-ring ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background text-foreground hover:border-primary/40"
                  }`}
                >
                  <input
                    id={`plan-${opt.id}`}
                    type="radio"
                    name="plan"
                    value={opt.id}
                    checked={selected}
                    onChange={() => setPlan(opt.id)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span>
                    {opt.label}
                    <span
                      className={`ml-1.5 text-xs font-normal ${
                        selected ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {opt.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {creating ? "Gerando…" : "Gerar link de convite"}
        </button>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Sem e-mail, qualquer pessoa com o link consegue usá-lo (uso único). Com e-mail, só quem
          logar com aquele endereço específico consegue completar o cadastro. O setor
          (empresa/escola/governo/condomínio/saúde) é escolhido pelo próprio cliente ao ativar o
          link.
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
                    <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {invite.plan ?? "pilot"}
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

      {/* Saúde das contas (S8 · Customer Health v1, E4) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
      >
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-medium text-card-foreground">Acompanhamento operacional legado</h2>
        </div>
        <p role="note" className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Contagens das tabelas do fluxo legado; publicações protegidas de Q2 e aprendizagem
          vinculada às ações não estão integralmente contempladas. Zero neste quadro não significa
          ausência dessas atividades. A pontuação resume uso operacional, sem medir vitalidade,
          aprendizagem ou eficácia. Consulte a jornada específica antes de encaminhar uma ação.
        </p>

        {accountsStatus === "loading" ? (
          <p role="status" className="py-4 text-sm text-muted-foreground">
            Consultando registros operacionais…
          </p>
        ) : accountsStatus === "error" ? (
          <p role="alert" className="py-4 text-sm text-destructive">
            Não foi possível consultar o acompanhamento. Nenhuma pontuação foi calculada. Recarregue
            a página para tentar novamente.
          </p>
        ) : accounts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma organização disponível neste inventário.
          </p>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div key={acc.orgId} className="rounded-xl border border-border/60 bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{acc.orgName}</p>
                  <div className="flex items-center gap-2">
                    {acc.health?.northStarMet && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Marcos operacionais do modelo atingidos
                      </span>
                    )}
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {acc.packId} · {acc.plan}
                    </span>
                    {acc.health ? (
                      <>
                        <span
                          aria-label="Pontuação operacional legada"
                          className="text-sm font-semibold tabular-nums text-foreground"
                        >
                          {acc.health.score}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            /100
                          </span>
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {acc.health.band}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Consulta indisponível</span>
                    )}
                  </div>
                </div>
                {acc.health ? (
                  <>
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {acc.health.dimensions.map((dim) => (
                        <div key={dim.id} className="rounded-lg border border-border/50 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-foreground">{dim.label}</p>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {dim.score}/25
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {dim.evidence}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2.5 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Sugestão do modelo legado:
                      </span>{" "}
                      {acc.health.nextBestAction}
                    </p>
                  </>
                ) : (
                  <p role="status" className="mt-3 text-sm text-muted-foreground">
                    Não foi possível conferir todas as contagens desta conta. Nenhuma pontuação
                    parcial foi calculada. Recarregue a página para tentar novamente.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Leads da landing (S7 · Porta de Entrada) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <p className="font-medium text-card-foreground">Leads recentes</p>
        </div>

        {leads.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum lead ainda — os pedidos de demonstração da landing (`/`, `/nr1`) aparecem aqui.
          </p>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => (
              <div key={lead.id} className="rounded-xl border border-border/60 bg-background p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {lead.name} · {lead.company}
                  </p>
                  <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {lead.interest}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {lead.email}
                  {lead.whatsapp ? ` · ${lead.whatsapp}` : ""}
                  {lead.role ? ` · ${lead.role}` : ""}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Origem: {lead.sourcePage}
                  {lead.utmSource ? ` · utm_source=${lead.utmSource}` : " · acesso direto"}
                  {lead.utmCampaign ? ` · ${lead.utmCampaign}` : ""}
                  {" · "}
                  {new Date(lead.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
