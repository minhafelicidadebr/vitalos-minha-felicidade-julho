// Painel de administração SaaS — disponível apenas quando Cloud está ativo.
// O RH usa esta tela para: criar ondas, gerar links de convite, monitorar coleta.
// Em modo demo: mostra instrução para ativar Lovable Cloud.

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Copy, Plus, Waves, Database, CheckCircle2, AlertCircle,
  ExternalLink, MessageCircle, RefreshCw, Lock, Users, Zap,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import { adminCreateWave, adminListWaves } from "@/lib/api/wave-admin.functions";
import { checkAndAggregateCapsule } from "@/lib/api/capsule-aggregator.functions";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Gestão de Ondas — 4 Lentes VitalOS™" }] }),
  component: AdminPage,
});

type Instrument = "COPSOQ" | "PERMA" | "VIA_T";

interface CreatedWave {
  waveId: string;
  inviteLinks: string[];
  instrument: string;
  createdAt: string;
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

  const fetchWaves = useCallback(async () => {
    if (!cloudActive || !orgId) return;
    setLoadingWaves(true);
    try {
      const result = await adminListWaves({ data: { orgId } });
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
      const result = await adminCreateWave({
        data: { orgId, instrument, label: label.trim() || undefined, inviteCount },
      });

      if ("error" in result && result.error) {
        setError(String(result.error));
      } else if ("ok" in result && result.ok) {
        setCreated({
          waveId: result.waveId!,
          inviteLinks: result.inviteLinks!,
          instrument,
          createdAt: new Date().toISOString(),
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
                {(["COPSOQ", "PERMA", "VIA_T"] as Instrument[]).map((inst) => (
                  <button
                    key={inst}
                    onClick={() => setInstrument(inst)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                      instrument === inst
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background text-foreground hover:border-primary/40"
                    }`}
                  >
                    {inst === "COPSOQ" ? "COPSOQ II · NR-1" : inst}
                  </button>
                ))}
              </div>
              {instrument === "COPSOQ" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Recomendado para o piloto — cobre Domínio B (risco psicossocial, NR-1).
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
                placeholder={`${instrument} · ${new Date().toLocaleDateString("pt-BR")} · T${Math.ceil(new Date().getMonth() / 3) || 1}/2026`}
                className="w-full rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Número de convites */}
            <div>
              <label className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                <span>Número de convites</span>
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
              disabled={!cloudActive || !orgId || creating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-serif text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              {creating ? "Criando…" : "Criar onda e gerar links"}
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
                {created.inviteLinks.length} links gerados · {created.instrument}
              </p>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              Envie cada link para um colaborador diferente via WhatsApp ou e-mail.
              Cada link só pode ser usado uma vez. Os resultados aparecem quando 5+ pessoas responderem.
            </p>

            {/* Lista de links */}
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

            {/* Ações de cópia */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => copyAll(created.inviteLinks)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedIdx === -1 ? "Copiado!" : `Copiar ${created.inviteLinks.length} links`}
              </button>
              <button
                onClick={() => copyWhatsApp(created.inviteLinks, created.instrument)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {copiedIdx === -2 ? "Copiado!" : "Copiar mensagem WhatsApp"}
              </button>
            </div>

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
          </motion.div>
        )}
      </div>
    </AppShell>
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

  const pct = wave.invitedCount > 0
    ? Math.min(100, Math.round((wave.responseCount / wave.invitedCount) * 100))
    : 0;
  const isSealed = wave.status === "sealed";
  const hasEnough = wave.responseCount >= 5;
  const canAggregate = hasEnough && !isSealed;

  async function handleAggregate() {
    if (!canAggregate || aggregating) return;
    setAggregating(true);
    setAggMsg(null);
    try {
      const result = await checkAndAggregateCapsule({
        data: { waveId: wave.id, instrument: wave.instrument, packId: "enterprise" },
      });
      if (result.triggered) {
        setAggMsg(`Capsule gerada — ${result.participantCount} participantes`);
        onAggregated();
      } else {
        setAggMsg(result.reason === "already_aggregated" ? "Capsule já existe" : `Não agregado: ${result.reason}`);
      }
    } catch {
      setAggMsg("Erro ao agregar — verifique o Cloud.");
    } finally {
      setAggregating(false);
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
              {wave.label ?? wave.instrument}
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
            {wave.instrument} · criada em {new Date(wave.createdAt).toLocaleDateString("pt-BR")}
          </p>

          {/* Barra de progresso de respostas */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  <span className={`font-semibold tabular-nums ${hasEnough ? "text-primary" : "text-foreground"}`}>
                    {wave.responseCount}
                  </span>
                  <span className="text-muted-foreground">/{wave.invitedCount} respostas</span>
                </span>
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-700 ${hasEnough ? "bg-primary" : "bg-muted-foreground/40"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {!isSealed && wave.responseCount < 5 && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Faltam {5 - wave.responseCount} para o k-anonimato mínimo (n≥5)
              </p>
            )}
          </div>

          {/* Botão de agregação manual */}
          {canAggregate && (
            <button
              onClick={handleAggregate}
              disabled={aggregating}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              <Zap className={`h-3 w-3 ${aggregating ? "animate-pulse" : ""}`} />
              {aggregating ? "Gerando relatório…" : "Gerar Relatório (n≥5)"}
            </button>
          )}
          {aggMsg && (
            <p className="mt-2 text-[11px] font-medium text-primary">{aggMsg}</p>
          )}
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
