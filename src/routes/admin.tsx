// Painel de administração SaaS — disponível apenas quando Cloud está ativo.
// O RH usa esta tela para: criar ondas, gerar links de convite, monitorar coleta.
// Em modo demo: mostra instrução para ativar Lovable Cloud.

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Copy, Plus, Waves, Database, CheckCircle2, AlertCircle,
  ExternalLink, MessageCircle, RefreshCw, Lock, Users, UserPlus, Zap,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import { adminCreateWave, adminListWaves, adminCloseWave } from "@/lib/api/wave-admin.functions";
import { createMemberInviteLink } from "@/lib/api/member-invite.functions";
import { adminListOpsEvents } from "@/lib/api/sector-link.functions";
import { checkAndAggregateCapsule } from "@/lib/api/capsule-aggregator.functions";
import { SectorOperationsPanel } from "@/components/admin/SectorOperationsPanel";
import { protectSectorParticipation } from "@/lib/survey/sector-operations";
import { isFibtPilotEnabled } from "@/lib/fibt/fibt-pilot-flag";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { supabase } from "@/integrations/supabase/client";
import { resolvePackBundle } from "@/domain/packs/registry";
import { invitableRoles } from "@/domain/packs/pack-routes";

// A organização não vem mais do cliente (P0-04) — o servidor resolve quem é
// o admin de verdade a partir do access_token da própria sessão.
async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Gestão de Ondas — 4 Lentes VitalOS™" }] }),
  component: AdminPage,
});

type Instrument = "COPSOQ" | "PERMA" | "VIA_T" | "FIB_T";

// Código de banco → nome público do instrumento. O banco guarda códigos
// estáveis (VIA_T, FIB_T — ver instrument-mapping.ts); a UI e as mensagens
// mostram os nomes de produto (VIA-T, FIB-T).
const INSTRUMENT_LABEL: Record<Instrument, string> = {
  COPSOQ: "COPSOQ II · NR-1",
  PERMA: "PERMA",
  VIA_T: "VIA-T",
  FIB_T: "FIB-T",
};
const instrumentLabel = (code: string) => INSTRUMENT_LABEL[code as Instrument] ?? code;

interface CreatedWave {
  waveId: string;
  inviteLinks: string[];
  instrument: string;
  createdAt: string;
  linkModel: "INDIVIDUAL" | "SECTOR";
}

interface WaveItem {
  id: string;
  instrument: string;
  label: string | null;
  status: string;
  invitedCount: number;
  responseCount: number;
  closesAt: string | null;
  createdAt: string;
  sealedAt: string | null;
}

function buildWhatsAppMessage(links: string[], instrument: string): string {
  const singleLink = links.length === 1;
  const linkBlock = singleLink
    ? `🔗 ${links[0]}`
    : links.map((l, i) => `🔗 Participante ${i + 1}: ${l}`).join("\n");

  return [
    `🌟 Pesquisa de Bem-Estar — 4 Lentes VitalOS™`,
    ``,
    `Olá! Você está sendo convidado(a) para participar da nossa pesquisa de clima organizacional (${instrument}).`,
    ``,
    `✅ Respostas anônimas e confidenciais`,
    `✅ Resultados só aparecem com 5+ participantes`,
    `✅ Leva aproximadamente 10 minutos`,
    ``,
    `Seu link exclusivo:`,
    linkBlock,
    ``,
    `Obrigado pela sua participação! 🙏`,
  ].join("\n");
}

function AdminPage() {
  const cloudActive = isCloudReady();
  const fibtPilotEnabled = isFibtPilotEnabled();
  const { loading: orgLoading, org: realOrg } = useRealOrgSession();
  const orgId = realOrg?.orgId;
  const [instrument, setInstrument] = useState<Instrument>("COPSOQ");
  const [inviteCount, setInviteCount] = useState(30);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedWave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [waves, setWaves] = useState<WaveItem[]>([]);
  const [loadingWaves, setLoadingWaves] = useState(false);

  // Convidar pessoa (papel real, distinto de convidar organização) — os
  // papéis oferecidos vêm do pack DA ORGANIZAÇÃO REAL, nunca do pack de
  // demonstração selecionado no navegador (podem divergir).
  const orgPack = resolvePackBundle(realOrg?.orgPackId ?? "enterprise").pack;
  const invitablePersonRoles = invitableRoles(orgPack);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const effectiveInviteRole = inviteRole || invitablePersonRoles[0]?.id || "";
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const fetchWaves = useCallback(async () => {
    if (!cloudActive || !orgId) return;
    setLoadingWaves(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const result = await adminListWaves({ data: { accessToken } });
      if (result.error) {
        setError(result.error);
        return;
      }
      setWaves(result.waves as WaveItem[]);
    } catch {
      // silently fail — cloud may not be wired yet
    } finally {
      setLoadingWaves(false);
    }
  }, [cloudActive, orgId]);

  useEffect(() => {
    fetchWaves();
  }, [fetchWaves]);

  async function handleCreate() {
    if (!cloudActive || creating || !orgId) return;
    setCreating(true);
    setError(null);
    setCreated(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await adminCreateWave({
        data: {
          accessToken,
          instrument,
          label: label.trim() || undefined,
          inviteCount,
          linkModel: instrument === "FIB_T" ? "SECTOR" : "INDIVIDUAL",
        },
      });

      if ("error" in result && result.error) {
        setError(String(result.error));
      } else if ("ok" in result && result.ok) {
        setCreated({
          waveId: result.waveId!,
          inviteLinks: result.inviteLinks!,
          instrument,
          createdAt: new Date().toISOString(),
          linkModel: instrument === "FIB_T" ? "SECTOR" : "INDIVIDUAL",
        });
        setLabel("");
        fetchWaves();
      }
    } catch {
      setError("Erro ao criar onda. Verifique a conexão com o Cloud.");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink(link: string, idx: number) {
    await navigator.clipboard.writeText(link);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  async function copyAll(links: string[]) {
    await navigator.clipboard.writeText(links.join("\n"));
    setCopiedIdx(-1);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  async function copyWhatsApp(links: string[], inst: string) {
    await navigator.clipboard.writeText(buildWhatsAppMessage(links, inst));
    setCopiedIdx(-2);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  async function handleCreateMemberInvite() {
    if (!cloudActive || creatingInvite || !orgId || !inviteEmail.trim() || !effectiveInviteRole) return;
    setCreatingInvite(true);
    setInviteError(null);
    setInviteLink(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setInviteError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await createMemberInviteLink({
        data: { accessToken, email: inviteEmail.trim(), role: effectiveInviteRole },
      });
      if (!result.ok) {
        setInviteError(result.error);
        return;
      }
      setInviteLink(result.link);
      setInviteEmail("");
    } catch {
      setInviteError("Erro ao gerar convite. Verifique a conexão com o Cloud.");
    } finally {
      setCreatingInvite(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Administração · SaaS Operacional
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Gestão de Ondas</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Crie ondas de medição, gere os links de convite e acompanhe a coleta.
            {realOrg && (
              <>
                {" "}Organização: <span className="font-medium text-foreground">{realOrg.orgName}</span>.
              </>
            )}
          </p>
        </motion.div>

        {/* Status do Cloud */}
        <CloudStatusBanner active={cloudActive} />

        {cloudActive && !orgLoading && !orgId && <NoOrgBanner />}

        {/* Convidar pessoa — segunda+ pessoa real da organização, com papel próprio */}
        {cloudActive && orgId && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.04 }}
            className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-5">
              <UserPlus className="h-4 w-4 text-primary" />
              <p className="font-medium text-card-foreground">Convidar pessoa</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  E-mail
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="pessoa@empresa.com"
                  className="w-full rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Papel
                </label>
                <div className="flex flex-wrap gap-2">
                  {invitablePersonRoles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setInviteRole(r.id)}
                      aria-pressed={effectiveInviteRole === r.id}
                      className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                        effectiveInviteRole === r.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {inviteError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{inviteError}</p>
                </div>
              )}

              {inviteLink ? (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate font-mono text-[11px] text-foreground">{inviteLink}</span>
                    <button
                      onClick={copyInviteLink}
                      className="shrink-0 rounded-lg p-1.5 hover:bg-muted transition-colors"
                      title="Copiar link"
                    >
                      {inviteCopied ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Link de uso único — envie por WhatsApp ou e-mail. Aparece só uma vez.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleCreateMemberInvite}
                  disabled={creatingInvite || !inviteEmail.trim() || !effectiveInviteRole}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  {creatingInvite ? "Gerando…" : "Gerar link de convite"}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Formulário de criação */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-5">
            <Waves className="h-4 w-4 text-primary" />
            <p className="font-medium text-card-foreground">Nova onda de medição</p>
          </div>

          <div className="space-y-5">
            {/* Instrumento */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Instrumento
              </label>
              <div className="flex flex-wrap gap-2">
                {(["COPSOQ", "PERMA", "VIA_T", "FIB_T"] as Instrument[]).map((inst) => (
                  <button
                    key={inst}
                    onClick={() => setInstrument(inst)}
                    aria-pressed={instrument === inst}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                      instrument === inst
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background text-foreground hover:border-primary/40"
                    }`}
                  >
                    {INSTRUMENT_LABEL[inst]}
                  </button>
                ))}
              </div>
              {instrument === "COPSOQ" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Recomendado para o piloto — cobre Domínio B (risco psicossocial, NR-1).
                </p>
              )}
              {instrument === "FIB_T" && fibtPilotEnabled && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Modelo setorial: a campanha nasce sem convites individuais. Cadastre os setores
                  na onda e emita um link compartilhado por setor.
                </p>
              )}
              {instrument === "FIB_T" && !fibtPilotEnabled && (
                <p className="mt-1.5 text-xs text-destructive">
                  O piloto FIB-T está indisponível neste ambiente.
                </p>
              )}
            </div>

            {/* Label */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Rótulo da onda (opcional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`${instrumentLabel(instrument)} · ${new Date().toLocaleDateString("pt-BR")} · T${Math.ceil(new Date().getMonth() / 3) || 1}/2026`}
                className="w-full rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Número de convites */}
            <div>
              <label className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                <span>{instrument === "FIB_T" ? "Meta de participantes" : "Número de convites"}</span>
                <span className="font-serif text-base font-semibold text-foreground tabular-nums">
                  {inviteCount}
                </span>
              </label>
              <input
                type="range"
                min={5}
                max={500}
                step={5}
                value={inviteCount}
                onChange={(e) => setInviteCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>mín. 5</span>
                <span>500</span>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Botão */}
            <button
              onClick={handleCreate}
              disabled={!cloudActive || !orgId || creating || (instrument === "FIB_T" && !fibtPilotEnabled)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-serif text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              {creating
                ? "Criando…"
                : instrument === "FIB_T"
                  ? "Criar campanha setorial"
                  : "Criar onda e gerar links"}
            </button>
          </div>
        </motion.div>

        {/* Links gerados */}
        {created && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-primary/25 bg-primary/5 p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="font-medium text-foreground">
                {created.linkModel === "SECTOR"
                  ? `Campanha setorial criada · ${instrumentLabel(created.instrument)}`
                  : `${created.inviteLinks.length} links gerados · ${instrumentLabel(created.instrument)}`}
              </p>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              {created.linkModel === "SECTOR"
                ? "Nenhum link individual foi gerado. Abra a onda abaixo, cadastre os setores e emita um link compartilhado por setor."
                : "Envie cada link para um colaborador diferente via WhatsApp ou e-mail. Cada link só pode ser usado uma vez. Os resultados aparecem quando 5+ pessoas responderem."}
            </p>

            {/* Lista de links */}
            {created.linkModel === "INDIVIDUAL" && (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border/50 bg-background p-3">
              {created.inviteLinks.slice(0, 10).map((link, idx) => (
                <div
                  key={link}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/30"
                >
                  <span className="w-6 shrink-0 text-center text-[10px] tabular-nums text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="flex-1 truncate font-mono text-[11px] text-foreground">
                    {link}
                  </span>
                  <button
                    onClick={() => copyLink(link, idx)}
                    className="shrink-0 rounded-lg p-1.5 hover:bg-muted transition-colors"
                    title="Copiar link"
                  >
                    {copiedIdx === idx ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              ))}
              {created.inviteLinks.length > 10 && (
                <p className="px-2 py-1 text-center text-xs text-muted-foreground">
                  +{created.inviteLinks.length - 10} links adicionais
                </p>
              )}
            </div>
            )}

            {/* Ações de cópia */}
            {created.linkModel === "INDIVIDUAL" && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => copyAll(created.inviteLinks)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedIdx === -1 ? "Copiado!" : `Copiar ${created.inviteLinks.length} links`}
              </button>
              <button
                onClick={() => copyWhatsApp(created.inviteLinks, instrumentLabel(created.instrument))}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {copiedIdx === -2 ? "Copiado!" : "Copiar mensagem WhatsApp"}
              </button>
            </div>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              ID da onda: <span className="font-mono">{created.waveId}</span>
            </p>
          </motion.div>
        )}

        {/* Lista de ondas ativas */}
        {cloudActive && orgId && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-primary" />
                <p className="font-medium text-card-foreground">Ondas desta organização</p>
              </div>
              <button
                onClick={fetchWaves}
                disabled={loadingWaves}
                className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${loadingWaves ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </div>

            {waves.length === 0 && !loadingWaves && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma onda criada ainda. Use o formulário acima para iniciar a primeira.
              </p>
            )}

            {loadingWaves && waves.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground animate-pulse">
                Carregando ondas…
              </p>
            )}

            <div className="space-y-3">
              {waves.map((wave) => (
                <WaveCard key={wave.id} wave={wave} onAggregated={fetchWaves} />
              ))}
            </div>

            <OpsTrailPanel />
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

// ─── Trilha de operações (P1-04) — falha visível sem precisar de SQL ─────────

const OPS_EVENT_LABELS: Record<string, string> = {
  response_submit_attempted: "Resposta iniciada",
  response_submit_accepted: "Resposta aceita",
  response_submit_rejected: "Resposta recusada",
  sector_response_accepted: "Resposta de setor aceita",
  sector_response_rejected: "Resposta de setor recusada",
  sector_link_created: "Link de setor emitido",
  sector_link_revoked: "Link de setor revogado",
  wave_cohort_created: "Setor cadastrado",
  wave_created: "Onda criada",
  wave_closed: "Onda fechada",
  capsule_published: "Leitura protegida publicada",
  authorization_denied: "Autorização negada",
};

function OpsTrailPanel() {
  const [events, setEvents] = useState<
    Array<{ event: string; waveId: string | null; reason: string | null; occurredAt: string }>
  >([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  async function load() {
    setOpen(true);
    if (loaded) return;
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const result = await adminListOpsEvents({ data: { accessToken } });
      setEvents(result.events);
    } finally {
      setLoaded(true);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Trilha de operações</p>
          <p className="text-[11px] text-muted-foreground">
            Últimos eventos da coleta — só metadados de operação, nunca conteúdo de resposta.
          </p>
        </div>
        {!open && (
          <button
            onClick={load}
            className="rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/40"
          >
            Ver trilha
          </button>
        )}
      </div>
      {open && !loaded && (
        <p className="mt-3 text-xs text-muted-foreground animate-pulse">Carregando…</p>
      )}
      {open && loaded && events.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhum evento registrado ainda (a trilha começa a contar após a migration de
          telemetria ser aplicada).
        </p>
      )}
      {open && events.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {events.map((e, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-muted-foreground tabular-nums">
                {new Date(e.occurredAt).toLocaleString("pt-BR")}
              </span>
              <span
                className={`font-medium ${
                  e.event.endsWith("rejected") || e.event === "authorization_denied"
                    ? "text-destructive"
                    : "text-foreground"
                }`}
              >
                {OPS_EVENT_LABELS[e.event] ?? e.event}
              </span>
              {e.reason && <span className="text-muted-foreground">({e.reason})</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── Card de onda com barra de progresso ────────────────────────────────────

function WaveCard({
  wave,
  onAggregated,
}: {
  wave: WaveItem;
  onAggregated: () => void;
}) {
  const [aggregating, setAggregating] = useState(false);
  const [aggMsg, setAggMsg] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeMsg, setCloseMsg] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const participation = protectSectorParticipation(wave.responseCount);
  const hasEnough = participation.reportable;
  const pct = hasEnough && wave.invitedCount > 0
    ? Math.min(100, Math.round((wave.responseCount / wave.invitedCount) * 100))
    : 0;
  const isSealed = wave.status === "sealed";
  // A leitura protegida pode ser regerada quantas vezes for preciso enquanto
  // a onda segue coletando (P0-08) — nunca mais "gera uma vez e recusa depois".
  const canAggregate = hasEnough && !isSealed;

  async function handleAggregate() {
    if (!canAggregate || aggregating) return;
    setAggregating(true);
    setAggMsg(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setAggMsg("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await checkAndAggregateCapsule({
        data: { accessToken, waveId: wave.id, instrument: wave.instrument },
      });
      if (result.triggered) {
        setAggMsg(`Leitura protegida atualizada — ${result.participantCount} participantes`);
        onAggregated();
      } else {
        setAggMsg(`Ainda não disponível: ${result.reason}`);
      }
    } catch {
      setAggMsg("Erro ao agregar — verifique o Cloud.");
    } finally {
      setAggregating(false);
    }
  }

  async function handleClose() {
    if (closing || isSealed) return;
    if (!confirmClose) {
      setConfirmClose(true);
      return;
    }
    setClosing(true);
    setCloseMsg(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCloseMsg("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await adminCloseWave({ data: { accessToken, waveId: wave.id } });
      if (result.closed) {
        setCloseMsg(
          result.capsulePublished
            ? `Onda fechada — relatório final com ${result.participantCount} participantes.`
            : result.reason === "withheld_for_privacy"
              ? "Onda fechada — a última leitura publicada permanece disponível; a atualização final foi retida por proteção de privacidade (poucas respostas novas desde a última publicação)."
              : result.reason === "below_k_anonymity"
                ? "Onda fechada sem relatório — participação abaixo do k-anonimato mínimo."
                : // Não atribuir a k-anonimato um motivo que o servidor não afirmou:
                  // motivos novos existem (lote protegido, cobertura por item), e
                  // chamá-los de "poucos participantes" seria falso.
                  `Onda fechada sem relatório novo (${result.reason}). Nenhum dado foi estimado; as leituras já publicadas permanecem disponíveis.`,
        );
        onAggregated();
      } else {
        setCloseMsg(result.error);
      }
    } catch {
      setCloseMsg("Erro ao fechar a onda — verifique o Cloud.");
    } finally {
      setClosing(false);
      setConfirmClose(false);
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${isSealed ? "border-primary/25 bg-primary/5" : "border-border/60 bg-background"}`}>
      <div className="flex items-start gap-3">
        {isSealed ? (
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        ) : (
          <Waves className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {wave.label ?? instrumentLabel(wave.instrument)}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isSealed
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            }`}>
              {isSealed ? "Selada · Relatório disponível" : wave.status}
            </span>
          </div>

          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {instrumentLabel(wave.instrument)} · criada em{" "}
            {new Date(wave.createdAt).toLocaleDateString("pt-BR")}
          </p>

          {/* Barra de progresso de respostas */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  <span className={`font-semibold tabular-nums ${hasEnough ? "text-primary" : "text-foreground"}`}>
                    {participation.countLabel}
                  </span>
                  <span className="text-muted-foreground">
                    /{wave.invitedCount} {wave.instrument === "FIB_T" ? "da meta" : "respostas"}
                  </span>
                </span>
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {hasEnough ? `${pct}%` : "Protegido"}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-700 ${hasEnough ? "bg-primary" : "bg-muted-foreground/40"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {!isSealed && wave.responseCount < 5 && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                A participação permanece protegida até o limiar mínimo (n≥5). A onda continua
                coletando até você decidir fechá-la.
              </p>
            )}
          </div>

          {/* Ações — nenhuma delas fecha a onda sozinha (P0-08) */}
          {!isSealed && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canAggregate && (
                <button
                  onClick={handleAggregate}
                  disabled={aggregating}
                  className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                >
                  <Zap className={`h-3 w-3 ${aggregating ? "animate-pulse" : ""}`} />
                  {aggregating ? "Gerando…" : "Ver leitura protegida (n≥5)"}
                </button>
              )}
              <button
                onClick={handleClose}
                disabled={closing}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  confirmClose
                    ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
                    : "border-border/60 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <Lock className={`h-3 w-3 ${closing ? "animate-pulse" : ""}`} />
                {closing ? "Fechando…" : confirmClose ? "Confirmar fechamento definitivo" : "Fechar onda"}
              </button>
              {confirmClose && !closing && (
                <button
                  onClick={() => setConfirmClose(false)}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Cancelar
                </button>
              )}
            </div>
          )}
          <SectorOperationsPanel
            waveId={wave.id}
            instrument={wave.instrument}
            status={wave.status}
          />

          {aggMsg && <p className="mt-2 text-[11px] font-medium text-primary">{aggMsg}</p>}
          {closeMsg && <p className="mt-2 text-[11px] font-medium text-foreground">{closeMsg}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Banner de organização ausente ─────────────────────────────────────────────

function NoOrgBanner() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-5 py-4"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <p className="text-sm font-semibold text-foreground">Nenhuma organização vinculada</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Esta conta não está associada a uma organização. Complete o cadastro através de
          um link de convite (/ativar) antes de criar ondas de medição.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Banner de status do Cloud ────────────────────────────────────────────────

function CloudStatusBanner({ active }: { active: boolean }) {
  if (active) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4"
      >
        <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground">Lovable Cloud ativo</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Dados reais. Respostas persistidas no Supabase com RLS e k-anonimato.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Modo demo — dados mocados</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Para criar ondas reais, ative o Lovable Cloud com o{" "}
            <strong className="text-foreground">Prompt 1 do ADR-003</strong>:
          </p>
          <div className="mt-3 rounded-xl bg-background/80 p-3 font-mono text-[11px] leading-relaxed text-foreground">
            "Ative o Lovable Cloud neste projeto e execute a migration SQL do ADR-003.
            <br />
            Confirme que as 6 tabelas foram criadas com RLS ativo."
          </div>
          <a
            href="/docs/ADR/ADR-003-fase2-saas-backend.md"
            target="_blank"
            rel="noopener"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver ADR-003 completo
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
