// Trilha Voz Segura — corte vertical completo do sistema de evidência:
// estudo → mecanismo → trilha → atividade → intervenção → execução → indicador → ESG.
//
// Fontes autorizadas (TASK.md): TRU-006 + LDR-007 via registro congelado.
// O registro é validado no carregamento — se o arquivo violar qualquer
// invariante (V0, C3 sem caveat…), esta página mostra erro em vez de conteúdo:
// nenhuma superfície exibe mais certeza do que o registro autoriza.
// Execução (ActionLog) é local à sessão nesta demonstração — o conteúdo é real.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Layers } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { EvidencePassport } from "@/app/evidence/EvidencePassport";
import { FlashcardDeck } from "@/app/academia/FlashcardDeck";
import { getFlashcardSession } from "@/mocks/flashcard-mock";
import { FlorenciaSafeConversationEntryPoint } from "@/features/florencia/components/FlorenciaSafeConversationEntryPoint";
import type { FlorenciaResponseTemplateResult } from "@/engine/florencia/response-templates";
import { StatusBadge } from "@/components/StatusBadge";
import {
  buildPassport,
  checkActivityBudget,
  findClaimForStudy,
  resolveStudy,
  trustGate,
  validateEvidenceRegistry,
  type IntendedUse,
} from "@/engine/evidence/passport-engine";
import {
  computeEvolveIndicators,
  computeTrailProgress,
  gradeQuiz,
  resolveScenarioChoice,
  suggestCycleDecision,
  type CycleDecision,
  type MissionCheckin,
} from "@/engine/learning/trail-engine";
import {
  foldActionStatus,
  recordActionEvent,
  type ActionLogEvent,
} from "@/engine/action-plan/action-log-engine";
import { CLAIM_REGISTRY, EVIDENCE_REGISTRY } from "@/domain/evidence/registries";
import {
  VOZ_SEGURA_CHECKLIST,
  VOZ_SEGURA_ESG_TRACE,
  VOZ_SEGURA_MICROLEARNING,
  VOZ_SEGURA_MISSION,
  VOZ_SEGURA_PROJECT_30D,
  VOZ_SEGURA_QUIZ,
  VOZ_SEGURA_SCENARIO,
  VOZ_SEGURA_TRAIL,
} from "@/mocks/voz-segura-mock";
// ─── LDX-1: Learning Dynamics Registry (governança/descoberta contextual) ──
import { getLearningDynamicsRegistry, type CanonicalLearningDynamic } from "@/domain/learning/learning-dynamics-registry";
import {
  deriveProductStatus,
  getAvailableDynamics,
  getRoadmapDynamics,
  type SurfaceTruthOptions,
} from "@/engine/learning/learning-dynamics-resolution";
import { LearningDynamicsRail } from "@/features/learning/components/LearningDynamicsRail";
import { IntroVideoCard, type IntroVideoSource } from "@/features/learning/components/IntroVideoCard";
import { LearningMethodDialog } from "@/features/learning/components/LearningMethodDialog";
import { ComplementaryResources, type ComplementaryResource } from "@/features/learning/components/ComplementaryResources";
// ─── LD-011 Mapa Mental Governado: reuso puro do driver "confianca" (Confiança & Voz) ──
import { DriverMindMapSvg } from "@/app/nr1/DriverMindMapSvg";
import { buildDriverMindMap } from "@/engine/nr1/mindmap-engine";
import { DEMO_COPSOQ_EXPOSURE, NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";
import { PILLAR_LABEL } from "@/routes/driver.$driverId";

const VOZ_SEGURA_DRIVER_ID = "confianca";

export const Route = createFileRoute("/voz-segura")({
  head: () => ({ meta: [{ title: "Trilha Voz Segura — 4 Lentes VitalOS™" }] }),
  component: VozSeguraPage,
});

const REGISTRY = EVIDENCE_REGISTRY;
const ACTOR_ROLE = "LIDER_EQUIPE";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function VozSeguraPage() {
  // ─── Gate de honestidade: registro inválido = página em estado de erro ─────
  const foundation = useMemo(() => {
    const registryCheck = validateEvidenceRegistry(REGISTRY);
    const budgetCheck = checkActivityBudget(VOZ_SEGURA_TRAIL.budget);
    const primary = resolveStudy(REGISTRY, VOZ_SEGURA_TRAIL.budget.primaryStudyId);
    const complementary = VOZ_SEGURA_TRAIL.budget.complementaryStudyIds
      .map((id) => resolveStudy(REGISTRY, id))
      .filter((s): s is NonNullable<typeof s> => s !== null);
    const errors = [
      ...registryCheck.errors,
      ...budgetCheck.errors,
      ...(primary ? [] : ["estudo principal não encontrado no registro congelado"]),
      ...(complementary.length === VOZ_SEGURA_TRAIL.budget.complementaryStudyIds.length
        ? []
        : ["estudo complementar não encontrado no registro congelado"]),
    ];
    return { errors, primary, complementary };
  }, []);

  if (foundation.errors.length > 0 || !foundation.primary) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
              Evidência indisponível
            </p>
            <h1 className="mt-3 font-serif text-2xl text-foreground">
              O registro canônico não autoriza esta trilha.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Nenhum conteúdo é exibido sem lastro validado. Motivo técnico:{" "}
              {foundation.errors[0] ?? "estudo-âncora ausente"}.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return <VozSeguraTrail primary={foundation.primary} complementary={foundation.complementary} />;
}

function VozSeguraTrail({
  primary,
  complementary,
}: {
  primary: NonNullable<ReturnType<typeof resolveStudy>>;
  complementary: NonNullable<ReturnType<typeof resolveStudy>>[];
}) {
  // ─── Praticar ───────────────────────────────────────────────────────────────
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [scenarioChoiceId, setScenarioChoiceId] = useState<string | null>(null);

  // ─── Aplicar / Registrar (ActionLog + rodadas) ──────────────────────────────
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [logEvents, setLogEvents] = useState<ActionLogEvent[]>([]);
  const [checkins, setCheckins] = useState<MissionCheckin[]>([]);
  const [form, setForm] = useState({ participants: "", risks: "", decisions: "", difficulty: "" });
  const [decision, setDecision] = useState<CycleDecision | null>(null);

  // ─── LDX-1: Learning Dynamics — resolução contextual desta rota ────────────
  const [methodOpen, setMethodOpen] = useState(false);
  const navigate = useNavigate();
  const learningCatalog = useMemo(() => getLearningDynamicsRegistry(), []);
  // Truth Layer (Onda 5): status dos badges derivado do registro canônico —
  // nunca digitado. Dinâmica ausente = piso DEMO (falha fechado).
  function dynamicStatus(id: string, opts?: SurfaceTruthOptions) {
    const dynamic = learningCatalog.find((d) => d.id === id);
    return dynamic ? deriveProductStatus(dynamic, opts) : "DEMO";
  }
  const resolutionContext = useMemo(() => ({ route: "/voz-segura", role: ACTOR_ROLE }), []);
  const availableDynamics = useMemo(
    () => getAvailableDynamics(learningCatalog, resolutionContext),
    [learningCatalog, resolutionContext],
  );
  const roadmapDynamics = useMemo(
    () => getRoadmapDynamics(learningCatalog, resolutionContext),
    [learningCatalog, resolutionContext],
  );
  function dynamicsById(ids: string[]): CanonicalLearningDynamic[] {
    return availableDynamics.filter((d) => ids.includes(d.id));
  }
  function activateDynamic(dynamic: CanonicalLearningDynamic) {
    const target = dynamic.enrichesRoutes.find((r) => r !== "/voz-segura") ?? dynamic.enrichesRoutes[0];
    if (target) navigate({ to: target });
  }
  const driverMindMap = useMemo(
    () => buildDriverMindMap(NR1_CROSSWALK, VOZ_SEGURA_DRIVER_ID, DEMO_COPSOQ_EXPOSURE),
    [],
  );
  // LD-003 embutido de verdade (não cross-link): só os cartões já catalogados
  // para "seguranca_psicologica" — mesmo catálogo de /revisar, filtrado.
  // Efêmero por design, igual ao resto desta trilha (onGrade omitido).
  const vozSeguraFlashcards = useMemo(
    () => getFlashcardSession().filter((sc) => sc.card.driverId === "seguranca_psicologica"),
    [],
  );
  const introVideo: IntroVideoSource = {
    title: "Em 90 segundos: por que a Voz Segura importa",
    durationLabel: "~90 segundos · em preparação",
    sourceType: "NOT_AVAILABLE",
    contentStatus: "DRAFT",
  };

  // Claim oficial do Claim Registry (Onda 3.5) para o contexto do passaporte
  // (explain_mechanism). Onde o registro não cobrir a combinação, fica o
  // caminho legacy do registro congelado — a lacuna nunca é preenchida com
  // claim de outro contexto.
  const primaryClaim =
    findClaimForStudy(REGISTRY, CLAIM_REGISTRY, primary, "explain_mechanism") ?? undefined;
  const complementaryClaims = complementary.map(
    (s) => findClaimForStudy(REGISTRY, CLAIM_REGISTRY, s, "explain_mechanism") ?? undefined,
  );

  // Demais usos registrados da trilha — cada superfície consome só o SEU claim
  // (uso pretendido próprio), derivado do registry e validado no trustGate.
  // Sem claim autorizado e confiável, a superfície simplesmente não mostra a linha.
  function trustedClaimForUse(use: IntendedUse) {
    for (const study of [primary, ...complementary]) {
      const claim = findClaimForStudy(REGISTRY, CLAIM_REGISTRY, study, use);
      if (claim && trustGate(study, claim).trusted) return claim;
    }
    return null;
  }
  const missionClaim = trustedClaimForUse("create_team_mission");
  const observationClaim = trustedClaimForUse("suggest_observation");
  const esgClaim = trustedClaimForUse("organize_evidence");

  // Status de confiança sempre lido de buildPassport() — nunca digitado (CLAUDE.md §6).
  const primaryConfidence = buildPassport(primary, "humano", primaryClaim).lines.find((l) => l.label === "Confiança")?.value;
  const complementaryConfidence = complementary[0]
    ? buildPassport(complementary[0], "humano", complementaryClaims[0]).lines.find((l) => l.label === "Confiança")?.value
    : undefined;
  const complementaryResources: ComplementaryResource[] = [
    {
      title: primary.canonical_citation,
      type: "VERIFIED_EVIDENCE",
      origin: "Registro de Evidência VitalOS",
      year: "1999",
      whyItMatters: "A origem do mecanismo desta trilha inteira — segurança psicológica e comportamento de aprendizagem.",
      evidenceStatus: primaryConfidence,
    },
    ...(complementary[0]
      ? [
          {
            title: complementary[0].canonical_citation,
            type: "VERIFIED_EVIDENCE" as const,
            origin: "Registro de Evidência VitalOS",
            year: "2021",
            whyItMatters: "Como o apoio do supervisor se conecta à segurança psicológica na prática.",
            evidenceStatus: complementaryConfidence,
          },
        ]
      : []),
    {
      title: "Mundo do Driver: Confiança & Voz",
      type: "APPLIED_INTERPRETATION",
      origin: "VitalOS — Plataforma de Drivers NR-1",
      whyItMatters: "Conecta esta trilha aos indicadores COPSOQ/FIB-T que ela busca melhorar.",
      internalHref: "/driver/confianca",
      onOpen: () => navigate({ to: "/driver/$driverId", params: { driverId: VOZ_SEGURA_DRIVER_ID } }),
    },
    {
      title: "Academia do Florescimento",
      type: "PRACTICE_TOOL",
      origin: "VitalOS",
      whyItMatters: "Continue com outras trilhas de aprendizagem curadas por papel.",
      internalHref: "/academia",
      onOpen: () => navigate({ to: "/academia" }),
    },
  ];

  const missionStatus = foldActionStatus(logEvents, VOZ_SEGURA_MISSION.id);
  const quizGrade = gradeQuiz(VOZ_SEGURA_QUIZ, quizAnswers);
  const scenarioResult = scenarioChoiceId
    ? resolveScenarioChoice(VOZ_SEGURA_SCENARIO, scenarioChoiceId)
    : null;
  const indicators = computeEvolveIndicators(checkins);
  const cycleSuggestion = suggestCycleDecision(indicators);

  const progress = computeTrailProgress([
    { id: "quiz", done: quizRevealed && quizGrade.allAnswered },
    { id: "cenario", done: scenarioResult !== null },
    { id: "missao", done: missionStatus !== "planejada" },
    { id: "rodada", done: indicators.roundsHeld > 0 },
    { id: "decisao", done: decision !== null },
  ]);

  function appendEvent(event: Omit<ActionLogEvent, "id" | "occurredOn">) {
    setLogEvents((prev) => {
      const result = recordActionEvent(prev, {
        ...event,
        id: crypto.randomUUID(),
        occurredOn: todayIso(),
      });
      return result.reason === "recorded" ? result.events : prev;
    });
  }

  // Fecha o gap confirmado no handoff LDX-1 §14: a orientação da FlorêncIA
  // era mostrada mas nunca deixava rastro no ActionLog. Só o desfecho
  // "allowed" gera evento — um bloqueio não produziu orientação real, não
  // há o que atestar. evidenceRef é o templateId e evidenceClaimIds são os
  // claim_ids que o Policy Gate autorizou (referências, nunca o conteúdo —
  // mesma disciplina de evidence_recorded). requiresHumanReview vira nota
  // operacional no evento: o rastro diz que a orientação não é aprovação.
  function handleFlorenciaInteraction(result: FlorenciaResponseTemplateResult) {
    if (result.status !== "allowed") return;
    appendEvent({
      actionKey: VOZ_SEGURA_MISSION.id,
      kind: "evidence_recorded",
      actorRole: ACTOR_ROLE,
      evidenceKind: "florencia_orientation",
      evidenceRef: result.templateId,
      evidenceClaimIds: result.usedClaimIds,
      ...(result.requiresHumanReview ? { note: "requer revisão humana antes de uso real" } : {}),
    });
  }

  function startMission() {
    appendEvent({
      actionKey: VOZ_SEGURA_MISSION.id,
      kind: "status_change",
      actorRole: ACTOR_ROLE,
      toStatus: "em_execucao",
    });
  }

  function registerRound() {
    const participants = Number(form.participants);
    const risks = Number(form.risks);
    const decisions = Number(form.decisions);
    if (!Number.isFinite(participants) || participants < 0) return;
    setCheckins((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        occurredOn: todayIso(),
        participants,
        risksRaised: Number.isFinite(risks) ? Math.max(0, risks) : 0,
        decisionsMade: Number.isFinite(decisions) ? Math.max(0, decisions) : 0,
        difficulty: form.difficulty.trim() || undefined,
      },
    ]);
    appendEvent({
      actionKey: VOZ_SEGURA_MISSION.id,
      kind: "checkin",
      actorRole: ACTOR_ROLE,
      note: `rodada registrada: ${participants} participantes, ${risks || 0} riscos, ${decisions || 0} decisões`,
    });
    setForm({ participants: "", risks: "", decisions: "", difficulty: "" });
  }

  function decideCycle(next: CycleDecision) {
    setDecision(next);
    appendEvent({
      actionKey: VOZ_SEGURA_MISSION.id,
      kind: "note",
      actorRole: ACTOR_ROLE,
      note: `decisão do ciclo: ${next}`,
    });
    if (next === "continuar") {
      appendEvent({
        actionKey: VOZ_SEGURA_MISSION.id,
        kind: "status_change",
        actorRole: ACTOR_ROLE,
        toStatus: "concluida",
      });
    }
    if (next === "interromper") {
      appendEvent({
        actionKey: VOZ_SEGURA_MISSION.id,
        kind: "status_change",
        actorRole: ACTOR_ROLE,
        toStatus: "interrompida",
      });
    }
  }

  const esgTrace = {
    ...VOZ_SEGURA_ESG_TRACE,
    execution_evidence: logEvents.filter((e) => e.kind === "checkin").map((e) => e.id),
    adverse_effects_observed: checkins
      .filter((c) => c.difficulty)
      .map((c) => `${c.occurredOn}: ${c.difficulty}`),
  };

  // Rastro do copiloto — derivado do ActionLog, nunca contado à parte.
  const florenciaOrientations = logEvents.filter(
    (e) => e.kind === "evidence_recorded" && e.evidenceKind === "florencia_orientation",
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        {/* ─── Cabeçalho ─── */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Trilha piloto · {VOZ_SEGURA_TRAIL.nascente}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">
            {VOZ_SEGURA_TRAIL.title}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {VOZ_SEGURA_TRAIL.subtitle}. Da ciência verificada à prática registrada — em uma
            jornada: aprender, praticar, aplicar, registrar, evoluir.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div
              className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progress.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso na trilha"
            >
              <div className="h-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">
              {progress.done} de {progress.total} marcos práticos concluídos · {progress.pct}%
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Os 5 marcos: responder o quiz, decidir o cenário, assumir a missão, registrar uma
            rodada e tomar a decisão do ciclo.
          </p>
          <p className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Conteúdo derivado do registro de evidência congelado (v1). O registro de execução
            desta demonstração permanece apenas na sessão atual.
          </p>
        </motion.header>

        <IntroVideoCard source={introVideo} onOpenMethod={() => setMethodOpen(true)} />
        <LearningMethodDialog open={methodOpen} onOpenChange={setMethodOpen} />

        {/* ─── 1 · A ciência (Evidence Passport) ─── */}
        <Section step="1" title="A ciência por trás" lead="Um mecanismo, duas fontes verificadas — e o limite dito com todas as letras.">
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Mecanismo · Redução do medo interpessoal
            </p>
            <p className="mt-2 text-sm leading-relaxed text-card-foreground">
              Ambientes em que perguntar, discordar e admitir erro recebem resposta não punitiva
              favorecem comportamentos de aprendizagem — e problemas aparecem cedo, enquanto ainda
              são baratos de corrigir.
            </p>
          </div>
          <div className="mt-3 space-y-3">
            <EvidencePassport study={primary} claim={primaryClaim} role="principal" />
            {complementary.map((study, i) => (
              <EvidencePassport
                key={study.study_id}
                study={study}
                claim={complementaryClaims[i]}
                role="complementar"
              />
            ))}
          </div>
        </Section>

        {/* ─── 2 · Aprender ─── */}
        <Section
          step="2"
          title={VOZ_SEGURA_MICROLEARNING.title}
          lead={`Microlearning · ~${VOZ_SEGURA_MICROLEARNING.minutes} minutos`}
        >
          <div className="space-y-4">
            {VOZ_SEGURA_MICROLEARNING.sections.map((section) => (
              <div key={section.heading}>
                <h3 className="text-sm font-semibold text-foreground">{section.heading}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
              </div>
            ))}
          </div>

          {driverMindMap && (
            <div className="mt-4 rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Brain className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Mapa Mental Governado · driver Confiança &amp; Voz
                </p>
                <StatusBadge status={dynamicStatus("LD-011")} title="Derivado do registro canônico LD-011 (motor real, conteúdo verificado, integração parcial)" />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Como o driver se conecta a COPSOQ II, FIB-T e aos pilares IVO — nunca gerado por
                modelo generativo; toque numa dimensão para ver detalhes.
              </p>
              <div className="mt-3">
                <DriverMindMapSvg
                  registry={NR1_CROSSWALK}
                  driverId={VOZ_SEGURA_DRIVER_ID}
                  exposures={DEMO_COPSOQ_EXPOSURE}
                  pillarLabels={PILLAR_LABEL}
                />
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Alternativa em texto (mesmas relações do mapa)
                </summary>
                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-card-foreground">
                  {driverMindMap.nodes
                    .filter((n) => n.type === "dimension")
                    .map((n) => (
                      <li key={n.id}>
                        {n.label} — {n.instrument === "copsoq" ? "COPSOQ II" : "FIB-T"}, força{" "}
                        {Math.round((n.strength ?? 0) * 100)}%
                        {n.exposure !== undefined ? `, exposição ${n.exposure}/100` : ""}
                      </li>
                    ))}
                </ul>
              </details>
            </div>
          )}
        </Section>

        {/* ─── 3 · Praticar: quiz ─── */}
        <Section step="3" title="Quiz de recuperação" lead="Errar aqui ensina — a explicação aparece sempre.">
          <div className="space-y-4">
            {VOZ_SEGURA_QUIZ.map((item, index) => {
              const answer = quizAnswers[item.id];
              const showFeedback = quizRevealed && answer;
              const correct = answer === item.correctOptionId;
              return (
                <div key={item.id} className="rounded-2xl border border-border/70 bg-card p-4">
                  <p className="text-sm font-medium text-card-foreground">
                    {index + 1}. {item.question}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {item.options.map((option) => {
                      const selected = answer === option.id;
                      const isCorrectOption = quizRevealed && option.id === item.correctOptionId;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setQuizAnswers((prev) => ({ ...prev, [item.id]: option.id }));
                            setQuizRevealed(false);
                          }}
                          aria-pressed={selected}
                          className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                            isCorrectOption
                              ? "border-primary/50 bg-primary/10 text-foreground"
                              : selected
                                ? "border-primary/40 bg-primary/5 text-foreground"
                                : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  {showFeedback && (
                    <div
                      className={`mt-3 rounded-r-lg border-l-4 px-3 py-2 ${
                        correct
                          ? "border-primary bg-primary/5"
                          : "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
                      }`}
                      role="note"
                    >
                      <p className="text-xs leading-relaxed text-card-foreground">
                        <span className="font-semibold">{correct ? "Isso. " : "Ainda não. "}</span>
                        {item.explanation}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Fonte:{" "}
                        {resolveStudy(REGISTRY, item.sourceStudyId)?.canonical_citation ??
                          item.sourceStudyId}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setQuizRevealed(true)}
                disabled={quizGrade.answeredCount === 0}
                className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
              >
                Ver explicações
              </button>
              {quizRevealed && (
                <span className="text-sm text-muted-foreground" aria-live="polite">
                  {quizGrade.correctCount} de {quizGrade.total} — e as explicações valem mais que o
                  placar.
                </span>
              )}
            </div>
          </div>
        </Section>

        {/* ─── 4 · Praticar: cenário ramificado ─── */}
        <Section step="4" title={VOZ_SEGURA_SCENARIO.title} lead="Nenhuma escolha é ridícula — a errada é a tentadora do dia a dia.">
          <p className="text-sm leading-relaxed text-muted-foreground">{VOZ_SEGURA_SCENARIO.setup}</p>
          <div className="mt-4 flex flex-col gap-2">
            {VOZ_SEGURA_SCENARIO.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => setScenarioChoiceId(choice.id)}
                aria-pressed={scenarioChoiceId === choice.id}
                className={`min-h-11 rounded-xl border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  scenarioChoiceId === choice.id
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {choice.label}
              </button>
            ))}
          </div>
          {scenarioResult && (
            <div className="mt-4 space-y-2 rounded-2xl border border-border/70 bg-card p-4" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {scenarioResult.isBest
                  ? "Escolha mais alinhada ao mecanismo"
                  : "Escolha tentadora — veja o custo provável"}
              </p>
              <FeedbackLine label="Consequência provável" value={scenarioResult.choice.likelyConsequence} />
              <FeedbackLine label="Mecanismo" value={scenarioResult.choice.mechanismNote} />
              <FeedbackLine label="Erro comum" value={scenarioResult.choice.commonMistake} />
              {scenarioResult.choice.betterAlternative && (
                <FeedbackLine label="Alternativa melhor" value={scenarioResult.choice.betterAlternative} />
              )}
              <p className="pt-1 text-[11px] text-muted-foreground">
                Fonte:{" "}
                {resolveStudy(REGISTRY, scenarioResult.choice.sourceStudyId)?.canonical_citation}
              </p>
            </div>
          )}

          {vozSeguraFlashcards.length > 0 && (
            <div className="mt-4 rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Praticar em outro formato · Flashcards
                </p>
                <StatusBadge status={dynamicStatus("LD-003", { ephemeral: true })} title="Derivado do registro canônico LD-003 — motor SM-2 real, mas este embed é efêmero (nunca se apresenta acima de parcial)" />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Os mesmos 2 cartões de Segurança Psicológica do catálogo de revisão espaçada — sem
                sair desta trilha.
              </p>
              <div className="mt-3">
                <FlashcardDeck cards={vozSeguraFlashcards} />
              </div>
              <Link
                to="/revisar"
                className="mt-3 inline-block text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Ver todos os temas em Revisão Espaçada
              </Link>
            </div>
          )}
        </Section>

        {/* ─── 5 · Aplicar ─── */}
        <Section step="5" title="Aplicar de verdade" lead="Checklist para a próxima reunião + a missão real desta trilha.">
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="text-sm font-medium text-card-foreground">{VOZ_SEGURA_CHECKLIST.title}</p>
            <ul className="mt-3 space-y-2">
              {VOZ_SEGURA_CHECKLIST.items.map((item) => (
                <li key={item.id}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={checked.has(item.id)}
                      onChange={() =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        })
                      }
                      className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                    />
                    <span className={checked.has(item.id) ? "text-foreground" : undefined}>
                      {item.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {VOZ_SEGURA_MISSION.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-card-foreground">
              {VOZ_SEGURA_MISSION.description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Critério de feita: {VOZ_SEGURA_MISSION.doneCriteria}
            </p>
            {missionClaim && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Base de evidência: {missionClaim.safe_claim}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <FlorenciaSafeConversationEntryPoint onInteraction={handleFlorenciaInteraction} />
              <FlorenciaSafeConversationEntryPoint
                ctaId="CTA-CREATE-TEAM-MISSION"
                section="missao-equipe"
                entityRefs={["mechanism:MECH-VOICE-001", "study:LDR-007"]}
                onInteraction={handleFlorenciaInteraction}
              />
            </div>
            {missionStatus === "planejada" ? (
              <button
                type="button"
                onClick={startMission}
                className="mt-3 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Assumir a missão
              </button>
            ) : (
              <p className="mt-3 inline-flex rounded-full border border-primary/40 px-3 py-1 text-xs font-medium text-primary">
                Status no ActionLog: {missionStatus.replace("_", " ")}
              </p>
            )}
          </div>
        </Section>

        {/* ─── 6 · Registrar (ActionLog) ─── */}
        <Section step="6" title="Registrar a rodada" lead="Só números e fatos operacionais — nunca nomes, nunca conteúdo pessoal.">
          <div className="mb-3 flex items-center gap-2">
            <StatusBadge status="DEMO" title="Sem persistência — os dados desta seção existem só nesta sessão do navegador" />
            <span className="text-xs text-muted-foreground">
              sem persistência — dados desta sessão
            </span>
          </div>
          {missionStatus === "planejada" ? (
            <p className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground">
              Assuma a missão (etapa 5) para começar a registrar rodadas.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField
                  id="vs-participants"
                  label="Participantes"
                  value={form.participants}
                  onChange={(v) => setForm((f) => ({ ...f, participants: v }))}
                />
                <NumberField
                  id="vs-risks"
                  label="Riscos/dúvidas levantados"
                  value={form.risks}
                  onChange={(v) => setForm((f) => ({ ...f, risks: v }))}
                />
                <NumberField
                  id="vs-decisions"
                  label="Decisões/ações"
                  value={form.decisions}
                  onChange={(v) => setForm((f) => ({ ...f, decisions: v }))}
                />
              </div>
              <div className="mt-3">
                <label htmlFor="vs-difficulty" className="text-xs font-medium text-muted-foreground">
                  Dificuldade operacional (opcional — vigia de efeitos adversos)
                </label>
                <input
                  id="vs-difficulty"
                  type="text"
                  value={form.difficulty}
                  onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                  placeholder="ex.: pouco tempo, silêncio inicial"
                  className="mt-1 min-h-11 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <button
                type="button"
                onClick={registerRound}
                disabled={form.participants === ""}
                className="mt-3 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
              >
                Registrar rodada no ActionLog
              </button>

              {checkins.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-border/70 bg-card">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Rodadas registradas</caption>
                    <thead>
                      <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                        <th scope="col" className="px-4 py-2.5 font-medium">Data</th>
                        <th scope="col" className="px-4 py-2.5 font-medium">Pessoas</th>
                        <th scope="col" className="px-4 py-2.5 font-medium">Riscos</th>
                        <th scope="col" className="px-4 py-2.5 font-medium">Decisões</th>
                        <th scope="col" className="px-4 py-2.5 font-medium">Dificuldade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkins.map((c) => (
                        <tr key={c.id} className="border-b border-border/40 last:border-0">
                          <td className="px-4 py-2.5 text-muted-foreground">{c.occurredOn}</td>
                          <td className="px-4 py-2.5 text-foreground">{c.participants}</td>
                          <td className="px-4 py-2.5 text-foreground">{c.risksRaised}</td>
                          <td className="px-4 py-2.5 text-foreground">{c.decisionsMade}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{c.difficulty ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Section>

        {/* ─── 7 · Evoluir ─── */}
        <Section step="7" title="Evoluir" lead="Indicadores agregados do piloto — e a decisão é humana, nunca automática.">
          {indicators.roundsHeld === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground">
              Sem rodadas registradas ainda. Os indicadores aparecem aqui assim que a primeira
              rodada existir — nada é estimado nem fabricado.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Indicator label="Rodadas realizadas" value={String(indicators.roundsHeld)} />
                <Indicator label="Participação média" value={String(indicators.avgParticipants)} />
                <Indicator label="Riscos levantados" value={String(indicators.risksRaisedTotal)} />
                <Indicator label="Decisões/ações" value={String(indicators.decisionsTotal)} />
              </div>
              <div className="mt-3 rounded-2xl border border-border/70 bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Sugestão derivada dos indicadores
                </p>
                <p className="mt-1 text-sm text-card-foreground">
                  <span className="font-medium capitalize">{cycleSuggestion.suggestion}</span> —{" "}
                  {cycleSuggestion.rationale}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["continuar", "ajustar", "interromper"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => decideCycle(option)}
                      disabled={decision !== null}
                      aria-pressed={decision === option}
                      className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-medium capitalize transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                        decision === option
                          ? "border-primary bg-primary text-primary-foreground disabled:opacity-100"
                          : "border-border/70 bg-background text-foreground hover:bg-muted/40"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {decision && (
                  <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                    Decisão registrada no ActionLog. Stop rule do projeto:{" "}
                    {VOZ_SEGURA_PROJECT_30D.stopRule}
                  </p>
                )}
              </div>
            </>
          )}

          {observationClaim && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              O que observar: {observationClaim.safe_claim}
            </p>
          )}

          <FlorenciaSafeConversationEntryPoint
            ctaId="CTA-SUGGEST-OBSERVATION"
            section="observar-evoluir"
            entityRefs={["mechanism:MECH-VOICE-001", "study:LDR-007"]}
            onInteraction={handleFlorenciaInteraction}
          />

          <LearningDynamicsRail
            title="Sintetizar em plano"
            available={dynamicsById(["LD-006"])}
            onActivate={activateDynamic}
          />
        </Section>

        {/* ─── 8 · Projeto 30 dias + ESG ─── */}
        <Section step="8" title="Do piloto ao relatório" lead="O projeto de 30 dias e o rastro ESG — prática implementada, nunca impacto garantido.">
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="text-sm font-medium text-card-foreground">{VOZ_SEGURA_PROJECT_30D.name}</p>
            <FeedbackLine label="Hipótese" value={VOZ_SEGURA_PROJECT_30D.hypothesis} />
            <FeedbackLine label="Contexto elegível" value={VOZ_SEGURA_PROJECT_30D.eligibleContext} />
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {VOZ_SEGURA_PROJECT_30D.phases.map((phase) => (
                <div key={phase.days} className="rounded-xl border border-border/60 bg-background p-3">
                  <p className="text-xs font-semibold text-primary">Dias {phase.days}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{phase.focus}</p>
                </div>
              ))}
            </div>
            <FeedbackLine label="Stop rule" value={VOZ_SEGURA_PROJECT_30D.stopRule} />
            <FeedbackLine label="Fronteira clínica" value={VOZ_SEGURA_PROJECT_30D.clinicalBoundary} />
          </div>

          <div className="mt-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Prévia de rastreabilidade ESG · {esgTrace.trace_id}
              </p>
              <StatusBadge status="DEMO" title="Sem persistência — nenhum relatório ESG real é gerado a partir desta prévia" />
            </div>
            <dl className="mt-2 space-y-1.5 text-xs leading-relaxed">
              <TraceLine label="Projeto" value={esgTrace.project_ref} />
              <TraceLine label="Mecanismo" value={esgTrace.mechanism_ref} />
              <TraceLine label="Evidência" value={`${esgTrace.study_ids.join(", ")} (via Evidence Passport — a bibliografia não se repete aqui)`} />
              {esgClaim && (
                <TraceLine
                  label="Claim autorizado"
                  value={`${esgClaim.claim_id} — ${esgClaim.safe_claim}`}
                />
              )}
              <TraceLine label="Linguagem" value="mudança observada — nunca impacto garantido" />
              <TraceLine
                label="Execução"
                value={
                  esgTrace.execution_evidence.length > 0
                    ? `${esgTrace.execution_evidence.length} evento(s) de rodada no ActionLog`
                    : "nenhum evento ainda — o relatório só nasce de execução real"
                }
              />
              <TraceLine
                label="Copiloto"
                value={
                  florenciaOrientations.length > 0
                    ? `${florenciaOrientations.length} orientação(ões) no ActionLog: ${[...new Set(florenciaOrientations.map((e) => e.evidenceRef))].join(", ")}`
                    : "nenhuma orientação consultada ainda — só consultas efetivamente abertas entram no rastro"
                }
              />
              {esgTrace.adverse_effects_observed.length > 0 && (
                <TraceLine
                  label="Efeitos adversos observados"
                  value={esgTrace.adverse_effects_observed.join(" · ")}
                />
              )}
            </dl>
            <div className="mt-3 border-t border-border/50 pt-3">
              <p className="text-xs font-medium text-muted-foreground">Limitações declaradas:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                {esgTrace.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
            <FlorenciaSafeConversationEntryPoint
              ctaId="CTA-ORGANIZE-EVIDENCE"
              section="organizar-esg"
              entityRefs={["mechanism:MECH-VOICE-001", "study:EDMONDSON-1999"]}
              onInteraction={handleFlorenciaInteraction}
            />
          </div>
        </Section>

        <ComplementaryResources resources={complementaryResources} />

        {roadmapDynamics.length > 0 && (
          <LearningDynamicsRail title="Nesta trilha, em evolução" available={[]} roadmap={roadmapDynamics} />
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Esta trilha desenvolve prática de gestão — não substitui PGR, avaliação profissional de
          riscos psicossociais nem acompanhamento clínico. Participação em missões é voluntária e
          nunca alimenta avaliação de desempenho, promoção ou remuneração.
        </p>
      </div>
    </AppShell>
  );
}

// ─── Blocos de apresentação ───────────────────────────────────────────────────

function Section({
  step,
  title,
  lead,
  children,
}: {
  step: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      aria-label={`Etapa ${step}: ${title}`}
    >
      <div className="flex items-baseline gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {step}
        </span>
        <div>
          <h2 className="font-serif text-xl text-foreground sm:text-2xl">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{lead}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </motion.section>
  );
}

function Indicator({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <p className="font-serif text-2xl text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function FeedbackLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
      <span className="font-semibold text-card-foreground">{label}: </span>
      {value}
    </p>
  );
}

function TraceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="shrink-0 font-medium text-muted-foreground sm:w-40">{label}</dt>
      <dd className="text-card-foreground">{value}</dd>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-11 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
