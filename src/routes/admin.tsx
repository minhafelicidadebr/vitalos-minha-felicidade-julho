// Painel de administração SaaS — disponível apenas quando Cloud está ativo.
// O RH usa esta tela para: criar ondas, gerar links de convite, monitorar coleta.
// Em modo demo: mostra instrução para ativar Lovable Cloud.

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Plus, Waves, Database, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import { adminCreateWave } from "@/lib/api/wave-admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Gestão de Ondas — 4 Lentes VitalOS™" }] }),
  component: AdminPage,
});

// UUID fixo de demo — em produção vem do perfil autenticado (Supabase Auth)
const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

type Instrument = "COPSOQ" | "PERMA" | "VIA_T";

interface CreatedWave {
  waveId: string;
  inviteLinks: string[];
  instrument: string;
  createdAt: string;
}

function AdminPage() {
  const cloudActive = isCloudReady();
  const [instrument, setInstrument] = useState<Instrument>("COPSOQ");
  const [inviteCount, setInviteCount] = useState(30);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedWave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function handleCreate() {
    if (!cloudActive || creating) return;
    setCreating(true);
    setError(null);
    setCreated(null);

    try {
      const result = await adminCreateWave({
        data: {
          orgId: DEMO_ORG_ID,
          instrument,
          label: label.trim() || undefined,
          inviteCount,
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
        });
      }
    } catch (e) {
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
          </p>
        </motion.div>

        {/* Status do Cloud */}
        <CloudStatusBanner active={cloudActive} />

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
              disabled={!cloudActive || creating}
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

            {/* Copiar todos */}
            <button
              onClick={() => copyAll(created.inviteLinks)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              <Copy className="h-3.5 w-3.5" />
              {copiedIdx === -1 ? "Copiado!" : `Copiar todos os ${created.inviteLinks.length} links`}
            </button>

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              ID da onda: <span className="font-mono">{created.waveId}</span>
            </p>
          </motion.div>
        )}
      </div>
    </AppShell>
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
