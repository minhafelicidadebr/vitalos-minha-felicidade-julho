import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { ContextualHelp } from "@/features/help/ContextualHelp";
import { HELP_DEVOLUTIVA_COLETIVA } from "@/domain/help/pilot-help";
import { usePack } from "@/engine/pack";
import { useEffectiveRole } from "@/app/identity/useEffectiveRole";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { supabase } from "@/integrations/supabase/client";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import { isCapabilityEnabled } from "@/lib/capabilities/registry";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { buildTrend, type Momentum } from "@/engine/trend/trend-engine";
import { rankPriorities } from "@/engine/priority/priority-engine";
import {
  buildDevolutiva,
  buildStrengthsDevolutiva,
  type DevolutivaLens,
  type Devolutiva,
  type DevolutivaBlock,
} from "@/engine/educar/devolutiva-engine";
import type { CeremonyDriverCandidate } from "@/engine/educar/devolutiva-ceremony-engine";
import { getSectorData } from "@/mocks/sector-data";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { getActiveWave } from "@/mocks/campaign-mock";
import { ORG_VIAT_RESULT } from "@/mocks/viat-mock";
import { loadLatestOrgCapsule } from "@/lib/api/capsule-report.functions";
import {
  castCeremonyVote,
  closeCeremony,
  loadDevolutivaCeremony,
  openDevolutivaCeremony,
  setCeremonyAttendance,
  type LoadedCeremonySession,
} from "@/lib/api/devolutiva-ceremony.functions";

export const Route = createFileRoute("/devolutiva")({
  head: () => ({ meta: [{ title: "Devolutiva da Onda · Educar — 4 Lentes VitalOS™" }] }),
  component: DevolutivaPage,
});

const INDIVIDUAL_ROLES = new Set(["COLABORADOR", "EMBAIXADOR", "ESTUDANTE", "FAMILIA"]);
const MOMENTUM_LABEL: Record<Momentum, string> = {
  acelerando: "acelerando",
  subindo: "subindo",
  estavel: "estável",
  caindo: "em queda",
};

// A organização não vem mais do cliente (P0-04) — o servidor resolve quem é
// o admin de verdade a partir do access_token da própria sessão.
async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const CEREMONY_REASON_LABEL: Record<string, string> = {
  session_already_open: "Já existe uma cerimônia aberta para esta organização.",
  session_not_found: "Cerimônia não encontrada — atualize a página.",
  session_not_open: "Esta cerimônia já foi encerrada.",
  invalid_request: "Dados inválidos para este registro.",
  cloud_not_ready: "Lovable Cloud não está ativo.",
  db_error: "Erro ao salvar. Tente novamente.",
};

function describeCeremonyReason(reason: string | null | undefined): string {
  if (!reason) return "Erro desconhecido.";
  return CEREMONY_REASON_LABEL[reason] ?? reason;
}

interface LensFx {
  id: string;
  guidingQuestion?: string;
}

function DevolutivaPage() {
  const { index, packId, t } = usePack();
  const { roleId } = useEffectiveRole();
  // Sessão pendente (roleId null) recebe a visão mais restrita: a individual.
  const audience = roleId === null || INDIVIDUAL_ROLES.has(roleId) ? "individual" : "coletivo";

  const devolutiva = useMemo(() => {
    if (!index) return null;
    const activeWave = getActiveWave(packId);
    const sector = getSectorData(packId);
    const current = calculateIVO(sector.currentCycle, index);

    const points = sector.trendCycles.map((c) => {
      const r = calculateIVO(c, index);
      return {
        cycleId: r.cycleId,
        label: r.cycleId,
        ivo: r.ivoScore,
        lenses: r.lenses.map((l) => ({ id: l.lensId, name: l.lensName, score: l.score })),
      };
    });
    const trend = buildTrend(points);

    const lensFx = (index.lenses as LensFx[]) ?? [];
    const questionFor = (id: string) => lensFx.find((l) => l.id === id)?.guidingQuestion;
    const sorted = [...current.lenses].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const low = sorted[sorted.length - 1];
    const shortName = (n: string) => n.split(" — ")[0] ?? n;

    const highlightLens: DevolutivaLens | null = top
      ? { name: shortName(top.lensName), score: top.score }
      : null;
    const focusLens: DevolutivaLens | null = low
      ? { name: shortName(low.lensName), score: low.score, question: questionFor(low.lensId) }
      : null;

    const pillars = pillarsFromIvo(current);
    const topItem =
      rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" }).items[0] ?? null;
    const topMove =
      topItem && topItem.expectedIvoLift > 0
        ? { label: topItem.label, lift: topItem.expectedIvoLift }
        : null;

    return buildDevolutiva(
      {
        instrumentLabel: activeWave.instrumentLabel,
        instrumentShort: activeWave.instrumentShort,
        season: activeWave.season,
        indexLabel: t("index", "IVO"),
        indexScore: current.ivoScore,
        maturityName: current.maturityLevel.name,
        momentumLabel: MOMENTUM_LABEL[trend.momentum],
        highlightLens,
        focusLens,
        topMove,
        learningRoute: "/academia",
      },
      audience,
    );
  }, [index, packId, t, audience]);

  // Devolutiva de FORÇAS (VIA-T) — só na empresa (ORG_VIAT_RESULT é da empresa).
  const forcas = useMemo<Devolutiva | null>(() => {
    if (packId !== "enterprise") return null;
    const top10 = ORG_VIAT_RESULT.top10 as Array<{ name: string; avgScore: number }>;
    const visibleAsc = [
      ...(ORG_VIAT_RESULT.strengths as Array<{ name: string; avgScore: number; visible: boolean }>),
    ]
      .filter((s) => s.visible)
      .sort((a, b) => a.avgScore - b.avgScore);
    const emerging = visibleAsc[0] ?? null;
    return buildStrengthsDevolutiva(
      {
        instrumentLabel: "VIA-T v1 · Forças de caráter",
        season: "Forças em Cultura",
        signatureStrength: top10[0] ? { name: top10[0].name, score: top10[0].avgScore } : null,
        topStrengths: top10.slice(0, 3).map((s) => ({ name: s.name, score: s.avgScore })),
        emergingStrength: emerging ? { name: emerging.name, score: emerging.avgScore } : null,
        developmentRoute: "/academia",
      },
      audience,
    );
  }, [packId, audience]);

  // ─── Candidatos da votação — mesma fila determinística usada em /plano-acao ─
  const candidates: CeremonyDriverCandidate[] = useMemo(() => {
    if (!index) return [];
    const sector = getSectorData(packId);
    const current = calculateIVO(sector.currentCycle, index);
    const pillars = pillarsFromIvo(current);
    const result = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });
    return result.items.slice(0, 8).map((item) => ({
      driverId: item.leverId,
      label: item.label,
      rank: item.rank,
    }));
  }, [index, packId]);

  // ─── Cerimônia da Devolutiva (I-T2) — só existe com sessão de org real ──────
  const cloudActive = isCloudReady();
  const { org: realOrg } = useRealOrgSession();
  const isRealMode = isCapabilityEnabled("DEVOLUTIVA") && cloudActive && !!realOrg;

  const [ceremonyLoading, setCeremonyLoading] = useState(false);
  const [ceremonySession, setCeremonySession] = useState<LoadedCeremonySession | null>(null);
  const [ceremonyError, setCeremonyError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [votingDriverId, setVotingDriverId] = useState<string | null>(null);
  const [attendanceInput, setAttendanceInput] = useState("0");

  const fetchCeremony = useCallback(async () => {
    if (!isRealMode) return;
    setCeremonyLoading(true);
    setCeremonyError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCeremonyError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await loadDevolutivaCeremony({ data: { accessToken } });
      if (!result.cloudReady) {
        setCeremonyError("Lovable Cloud não está ativo.");
        return;
      }
      if ("error" in result) {
        setCeremonyError(result.error);
        return;
      }
      setCeremonySession(result.session);
      setAttendanceInput(String(result.session?.attendanceCount ?? 0));
    } catch {
      setCeremonyError("Erro ao carregar a cerimônia. Verifique a conexão com o Cloud.");
    } finally {
      setCeremonyLoading(false);
    }
  }, [isRealMode]);

  useEffect(() => {
    fetchCeremony();
  }, [fetchCeremony]);

  async function handleOpenCeremony() {
    if (!isRealMode || opening) return;
    setOpening(true);
    setCeremonyError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCeremonyError("Sessão expirada. Faça login novamente.");
        return;
      }
      const capsuleResult = await loadLatestOrgCapsule({ data: { accessToken } });
      const capsuleId = capsuleResult.found ? capsuleResult.id : null;
      const result = await openDevolutivaCeremony({
        data: { accessToken, capsuleId, scriptVersion: "v1" },
      });
      if (!result.accepted) {
        setCeremonyError(describeCeremonyReason(result.reason));
        return;
      }
      await fetchCeremony();
    } catch {
      setCeremonyError("Erro ao abrir a cerimônia.");
    } finally {
      setOpening(false);
    }
  }

  async function handleVote(driverId: string) {
    if (!ceremonySession || votingDriverId) return;
    setVotingDriverId(driverId);
    setCeremonyError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCeremonyError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await castCeremonyVote({
        data: { accessToken, sessionId: ceremonySession.id, driverId },
      });
      if (!result.accepted) {
        setCeremonyError(describeCeremonyReason(result.reason));
        return;
      }
      await fetchCeremony();
    } catch {
      setCeremonyError("Erro ao registrar o voto.");
    } finally {
      setVotingDriverId(null);
    }
  }

  async function handleSetAttendance() {
    if (!ceremonySession) return;
    const count = Number(attendanceInput);
    if (!Number.isFinite(count) || count < 0) return;
    setCeremonyError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCeremonyError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await setCeremonyAttendance({
        data: { accessToken, sessionId: ceremonySession.id, attendanceCount: Math.floor(count) },
      });
      if (!result.accepted) {
        setCeremonyError(describeCeremonyReason(result.reason));
        return;
      }
      await fetchCeremony();
    } catch {
      setCeremonyError("Erro ao atualizar a presença.");
    }
  }

  async function handleCloseCeremony() {
    if (!ceremonySession || closing) return;
    setClosing(true);
    setCeremonyError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCeremonyError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await closeCeremony({
        data: {
          accessToken,
          sessionId: ceremonySession.id,
          candidateDriverIds: candidates.map((c) => c.driverId),
        },
      });
      if (!result.accepted) {
        setCeremonyError(describeCeremonyReason(result.reason));
        return;
      }
      await fetchCeremony();
    } catch {
      setCeremonyError("Erro ao encerrar a cerimônia.");
    } finally {
      setClosing(false);
    }
  }

  if (!devolutiva) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Preparando a devolutiva…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Educar · Devolutiva da Onda
          </p>
          <div className="mt-1 flex items-start gap-1">
            <h1 className="min-w-0 font-serif text-3xl text-foreground sm:text-4xl">
              {devolutiva.headline}
            </h1>
            <ContextualHelp entry={HELP_DEVOLUTIVA_COLETIVA} roleId={roleId} />
          </div>
        </motion.header>

        <BlockList blocks={devolutiva.blocks} />

        <HonestyNote text={devolutiva.honestyNote} />

        {/* Devolutiva de Forças (VIA-T) — Educar da Camada 3 */}
        {forcas && (
          <section className="space-y-3 border-t border-border/50 pt-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Educar · Devolutiva de Forças
              </p>
              <h2 className="mt-1 font-serif text-2xl text-foreground">{forcas.headline}</h2>
            </div>
            <BlockList blocks={forcas.blocks} />
            <HonestyNote text={forcas.honestyNote} />
          </section>
        )}

        {/* Cerimônia da Devolutiva (I-T2) — só existe com sessão de org real */}
        {isRealMode && (
          <CeremonySection
            loading={ceremonyLoading}
            session={ceremonySession}
            error={ceremonyError}
            candidates={candidates}
            opening={opening}
            closing={closing}
            votingDriverId={votingDriverId}
            attendanceInput={attendanceInput}
            onAttendanceInputChange={setAttendanceInput}
            onOpen={handleOpenCeremony}
            onVote={handleVote}
            onSetAttendance={handleSetAttendance}
            onClose={handleCloseCeremony}
          />
        )}

        <p className="text-center text-xs text-muted-foreground">
          A devolutiva fecha o eixo <span className="font-medium">Educar</span> e abre o{" "}
          <Link to="/onda" className="underline underline-offset-2 hover:text-foreground">
            ciclo da próxima onda
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

// Cerimônia da Devolutiva (I-T2) — rito ao vivo: o facilitador registra presença
// e votos de mão levantada; nenhum voto carrega identidade (ver migration
// devolutiva_sessions). A pauta só é publicada quando a presença atinge o
// quórum k-anônimo (≥5) — abaixo disso a UI mostra "quórum não atingido".
function CeremonySection({
  loading,
  session,
  error,
  candidates,
  opening,
  closing,
  votingDriverId,
  attendanceInput,
  onAttendanceInputChange,
  onOpen,
  onVote,
  onSetAttendance,
  onClose,
}: {
  loading: boolean;
  session: LoadedCeremonySession | null;
  error: string | null;
  candidates: CeremonyDriverCandidate[];
  opening: boolean;
  closing: boolean;
  votingDriverId: string | null;
  attendanceInput: string;
  onAttendanceInputChange: (v: string) => void;
  onOpen: () => void;
  onVote: (driverId: string) => void;
  onSetAttendance: () => void;
  onClose: () => void;
}) {
  const labelById = new Map(candidates.map((c) => [c.driverId, c.label] as const));

  return (
    <section className="space-y-3 border-t border-border/50 pt-6">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" aria-hidden />
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Educar · Cerimônia da Devolutiva
        </p>
      </div>

      {loading && !session && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando cerimônia…
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          {error}
        </p>
      )}

      {!loading && (!session || session.status === "closed") && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          {session?.status === "closed" && (
            <div className="mb-4">
              <p className="font-serif text-lg text-card-foreground">Última cerimônia — pauta de co-criação</p>
              {session.pautaDriverIds && session.pautaDriverIds.length > 0 ? (
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {session.pautaDriverIds.map((id, i) => (
                    <li key={id}>
                      {i + 1}. {labelById.get(id) ?? id}{" "}
                      <span className="tabular-nums">({session.votesByDriver[id] ?? 0} votos)</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Quórum não atingido ({session.attendanceCount} de 5 presentes) — a pauta desta rodada
                  não foi publicada.
                </p>
              )}
            </div>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            A devolutiva deixa de ser uma tela lida sozinho e vira um rito facilitado: a
            comunidade vota entre as intervenções candidatas, e o voto — não a planilha — decide
            a pauta que semeia o Plano Vivo.
          </p>
          <button
            type="button"
            disabled={opening}
            onClick={onOpen}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {opening ? "Abrindo…" : "Iniciar cerimônia"}
          </button>
        </div>
      )}

      {!loading && session && session.status === "open" && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <p className="font-serif text-lg text-card-foreground">Cerimônia em andamento</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Registre a presença da sala e conduza a votação de mão levantada — cada clique é um
            voto, sem identidade associada.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label htmlFor="ceremony-attendance" className="text-xs text-muted-foreground">
              Presentes na sala
            </label>
            <input
              id="ceremony-attendance"
              type="number"
              min={0}
              value={attendanceInput}
              onChange={(e) => onAttendanceInputChange(e.target.value)}
              className="w-20 rounded-lg border border-border/60 bg-background px-2 py-1 text-sm text-foreground focus:border-primary/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={onSetAttendance}
              className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
            >
              Atualizar presença
            </button>
            <span className="text-xs text-muted-foreground">
              {session.attendanceCount >= 5
                ? "Quórum atingido — a pauta será publicada ao encerrar."
                : `Faltam ${5 - session.attendanceCount} presentes para o quórum.`}
            </span>
          </div>

          <ul className="mt-4 space-y-2">
            {candidates.map((c) => (
              <li
                key={c.driverId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2"
              >
                <span className="text-sm text-foreground">{c.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {session.votesByDriver[c.driverId] ?? 0} votos
                  </span>
                  <button
                    type="button"
                    disabled={votingDriverId !== null}
                    onClick={() => onVote(c.driverId)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
                  >
                    {votingDriverId === c.driverId ? "Votando…" : "Votar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={closing}
            onClick={onClose}
            className="mt-4 rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 disabled:opacity-40"
          >
            {closing ? "Encerrando…" : "Encerrar cerimônia"}
          </button>
        </div>
      )}
    </section>
  );
}

function BlockList({ blocks }: { blocks: DevolutivaBlock[] }) {
  return (
    <ol className="space-y-3">
      {blocks.map((b, i) => (
        <motion.li
          key={b.kicker}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 + i * 0.05 }}
          className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
              {i + 1}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {b.kicker}
            </span>
          </div>
          <p className="mt-2 font-serif text-lg text-foreground">{b.title}</p>
          <p className="mt-1 text-base leading-relaxed text-muted-foreground">{b.body}</p>
          {b.cta && (
            <Link
              to={b.cta.route}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {b.cta.label} →
            </Link>
          )}
        </motion.li>
      ))}
    </ol>
  );
}

function HonestyNote({ text }: { text: string }) {
  return (
    <div
      className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
      role="note"
    >
      <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">{text}</p>
    </div>
  );
}
