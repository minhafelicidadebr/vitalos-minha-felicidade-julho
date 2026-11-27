import { createFileRoute } from "@tanstack/react-router";
import { Q2JourneyOrientation } from "@/components/ivo/Q2JourneyOrientation";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/app/shell/AppShell";
import { ActionTimelinePanel, EducationPanel, PlanSummaryPanel } from "@/components/ivo/ActionFollowUp";
import { EfficacyPanel, type EfficacyCallbacks } from "@/components/ivo/EfficacyPanel";
import { IvoAccessNotice, IvoLoading } from "@/components/ivo/IvoAccessNotice";
import {
  FibtActionPlanSection,
  type ActionEnhancements,
  PriorityPlanner,
  type ActionCallbacks,
  type EvidenceSubmitResult,
  type PriorityDraft,
} from "@/components/ivo/FibtActionLoop";
import { AddActionToPlanForm, PlanClosure, type AddActionFormInput } from "@/components/ivo/PlanComposition";
import { currentIvoAccessToken } from "@/components/ivo/ivo-session";
import { loadIvoQ2Reading } from "@/lib/api/ivo-q2-reading.functions";
import {
  loadEfficacyFn,
  recordEfficacyObservationFn,
  recordEfficacyVerdictFn,
  registerEfficacyProtocolFn,
  saveEfficacyDraftFn,
  startEfficacyRevisionFn,
} from "@/lib/api/ivo-efficacy.functions";
import { loadEducationFn } from "@/lib/api/ivo-governance.functions";
import {
  activateFibtActionPlanFn,
  addFibtActionToPlanFn,
  closeFibtActionPlanFn,
  createFibtPriorityActionsFn,
  loadFibtActionLoopFn,
  recordFibtActionEvidenceFn,
  recordFibtActionStatusFn,
  setFibtActionAccountabilityFn,
} from "@/lib/api/ivo-action-loop.functions";
import { buildActionTimeline, summarizePlan } from "@/lib/ivo/action-follow-up";
import { parseContentRef } from "@/lib/ivo/content-ref";
import { createLearningApplicationFn } from "@/lib/api/ivo-learning-application.functions";
import { LearningApplicationJourney, LearningApplicationTrace } from "@/components/ivo/LearningApplicationJourney";
import { Q2PracticeReview } from "@/components/ivo/Q2PracticeReview";
import type {
  FibtActionPlanView,
  IvoQ2Outcome,
  LedgerWriteOutcome,
  LoadEducationOutcome,
  LoadEfficacyOutcome,
  LoadFibtActionLoopOutcome,
} from "@/lib/ivo/ivo-views";
import { todayInSaoPaulo } from "@/lib/ivo/local-date";
import { publishedActionSource } from "@/lib/ivo/published-action-source";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { ContextualHelp } from "@/features/help/ContextualHelp";
import { HELP_Q2_ACOES } from "@/domain/help/contextual-help";

// Prioridades e ações do ciclo a partir do resultado FIB-T publicado (R6).
// Toda escrita passa pelo servidor, que confere sessão, papel, organização,
// capability e posse do item. Recarregar a página relê tudo do banco.

const searchSchema = z.object({
  wave: z.string().uuid().optional(),
  setor: z.string().uuid().optional(),
  fator: z.string().regex(/^[a-z][a-z_]{0,39}$/).optional(),
});

export const Route = createFileRoute("/ivo-integral/acoes")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Ações do ciclo · FIB-T — IVO integral" }] }),
  component: IvoAcoesPage,
});

type Loaded = { q2: IvoQ2Outcome; loop: LoadFibtActionLoopOutcome; education: LoadEducationOutcome; efficacy: LoadEfficacyOutcome };
type PageState = { state: "loading" } | { state: "network_error" } | { state: "done"; data: Loaded };
type Feedback = { tone: "ok" | "error"; text: string } | null;

function IvoAcoesPage() {
  const search = Route.useSearch();
  const session = useRealOrgSession();
  const [page, setPage] = useState<PageState>({ state: "loading" });
  const [token, setToken] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const today = todayInSaoPaulo();

  const load = useCallback(async () => {
    try {
      const accessToken = await currentIvoAccessToken();
      setToken(accessToken);
      const [q2, loop, education, efficacy] = await Promise.all([
        loadIvoQ2Reading({ data: { accessToken, waveId: search.wave } }),
        loadFibtActionLoopFn({ data: { accessToken } }),
        loadEducationFn({ data: { accessToken } }),
        loadEfficacyFn({ data: { accessToken } }),
      ]);
      setPage({ state: "done", data: { q2, loop, education, efficacy } });
    } catch {
      setPage({ state: "network_error" });
    }
  }, [search.wave]);

  useEffect(() => {
    // Contexto novo (onda escolhida na URL): o aviso de uma operação do contexto anterior não vale mais.
    setFeedback(null);
    void load();
  }, [load]);

  // `inline`: o desfecho volta ao formulário que enviou (sucesso/erro junto dele, com
  // anúncio próprio) em vez de ir para a faixa global no topo da página.
  async function write(
    run: () => Promise<LedgerWriteOutcome>,
    okText: string,
    options?: { inline?: boolean; replayedText?: string },
  ): Promise<EvidenceSubmitResult> {
    setBusy(true);
    // O aviso da faixa pertence ao pedido que o gerou: qualquer operação nova (inline ou não) o descarta ao começar, e um
    // sucesso antigo (ex.: "Estado atualizado.") não fica na tela enquanto outra operação roda ou depois que ela falha.
    setFeedback(null);
    let outcome: EvidenceSubmitResult;
    try {
      const r = await run();
      if (!r.ok) outcome = { ok: false, message: r.error };
      else if (!r.accepted) outcome = { ok: false, message: r.message };
      // `replayed`: o mesmo pedido já tinha sido aplicado; nada foi gravado de novo.
      else outcome = { ok: true, message: r.replayed && options?.replayedText ? options.replayedText : okText };
      await load();
    } catch {
      outcome = { ok: false, message: "Falha de comunicação com o servidor. Nada foi confirmado." };
    } finally {
      setBusy(false);
    }
    if (!options?.inline) setFeedback({ tone: outcome.ok ? "ok" : "error", text: outcome.message });
    return outcome;
  }

  const loopData = page.state === "done" && page.data.loop.ok ? page.data.loop : null;
  const callbacks: ActionCallbacks = {
    assignableLeaders: loopData?.assignableLeaders ?? [],
    learningWritable: loopData?.viewerScope !== "own_actions",
    onAccountability: (itemId, input) =>
      void write(() => setFibtActionAccountabilityFn({ data: { accessToken: token, itemId, ...input } }), "Responsável, prazo e indicador salvos."),
    onStatus: (itemId, toStatus) =>
      void write(() => recordFibtActionStatusFn({ data: { accessToken: token, itemId, toStatus } }), "Estado atualizado."),
    onEvidence: (itemId, input) =>
      write(
        () => recordFibtActionEvidenceFn({ data: { accessToken: token, itemId, ...input } }),
        input.scope === "aprendizagem" ? "Aprendizagem registrada." : "Evidência de execução registrada.",
        { inline: true },
      ),
  };

  // PI-13: incluir ação em plano existente (desfecho junto do formulário) e encerrar plano
  // (o painel some quando o plano encerra: o sucesso também é anunciado na faixa do topo).
  const addAction = (planId: string, input: AddActionFormInput) =>
    write(
      () => addFibtActionToPlanFn({ data: { accessToken: token, planId, ...input } }),
      "Ação incluída no plano.",
      { inline: true, replayedText: "Este pedido já havia sido aplicado: a ação já está no plano e nada foi duplicado." },
    );
  const closePlan = async (planId: string) => {
    const result = await write(
      () => closeFibtActionPlanFn({ data: { accessToken: token, planId, confirm: true } }),
      "Plano encerrado. Ele não aceita mais ações nem registros; o histórico continua legível.",
      { inline: true, replayedText: "Este plano já estava encerrado; nada foi alterado." },
    );
    if (result.ok) setFeedback({ tone: "ok", text: result.message });
    return result;
  };

  // Protocolo de eficácia: toda escrita volta ao formulário que a enviou (erro/sucesso junto dele).
  const efficacyCallbacks: EfficacyCallbacks = {
    saveDraft: (itemId, fields, useSourceAsBaseline) =>
      write(
        () => saveEfficacyDraftFn({ data: { accessToken: token, itemId, fields: fields as never, useSourceAsBaseline } }),
        "Rascunho do protocolo salvo.",
        { inline: true },
      ),
    startRevision: (itemId) =>
      write(() => startEfficacyRevisionFn({ data: { accessToken: token, itemId } }), "Nova revisão aberta em rascunho.", { inline: true }),
    register: (itemId) =>
      write(() => registerEfficacyProtocolFn({ data: { accessToken: token, itemId } }), "Protocolo registrado. Ele não pode mais ser alterado; use uma nova revisão.", { inline: true }),
    observe: (itemId, input) =>
      write(() => recordEfficacyObservationFn({ data: { accessToken: token, itemId, ...input } }), "Observação registrada.", { inline: true }),
    verdict: (itemId, input) =>
      write(() => recordEfficacyVerdictFn({ data: { accessToken: token, itemId, ...input } }), "Parecer registrado.", { inline: true }),
  };

  const data = page.state === "done" ? page.data : null;
  const view = data?.q2.ok && data.q2.state === "ready" ? data.q2.view : null;
  const plans = data?.loop.ok ? data.loop.plans : [];
  const ownActionsOnly = data?.loop.ok === true && data.loop.viewerScope === "own_actions";
  const hasPlanForCycle = !!view && plans.some((p) => p.cycleKeyCanonical === view.cycleKey);
  const education = data?.education.ok ? data.education : null;
  const efficacy = data?.efficacy.ok ? data.efficacy : null;

  function enhancementsFor(plan: FibtActionPlanView): ActionEnhancements {
    const preferredSource = publishedActionSource(view, { cohortId: search.setor, factorId: search.fator });
    const contentTitle = (contentId: string): string | null => {
      for (const list of Object.values(education?.byFactor ?? {})) {
        const found = list.find((c) => c.contentId === contentId);
        if (found) return found.title;
      }
      return null;
    };
    const itemOf = (actionId: string) => efficacy?.items.find((i) => i.itemId === actionId) ?? null;
    // Liderança: só a própria ação (estado + execução); encerrar, incluir, aprendizagem e eficácia ficam com o RH.
    if (ownActionsOnly) return {};
    return {
      planClosure: <PlanClosure plan={plan} busy={busy} onClose={closePlan} />,
      planAddAction:
        plan.status === "closed" ? undefined : <AddActionToPlanForm key={`${plan.id}:${preferredSource?.cohortId ?? ""}:${preferredSource?.factorId ?? ""}`} plan={plan} view={view} busy={busy} onSubmit={addAction} initialSource={preferredSource} leaders={loopData?.assignableLeaders ?? []} />,
      summary: (
        <PlanSummaryPanel
          cycle={plan.cycleKeyCanonical ?? plan.cycleKey}
          summary={summarizePlan(plan, efficacy ? efficacy.items.filter((i) => plan.actions.some((a) => a.id === i.itemId)) : [])}
        />
      ),
      educationOptions: (action) =>
        (education?.byFactor[action.source.factorId] ?? []).map((c) => ({ contentId: c.contentId, title: c.title, status: c.status, version: c.version })),
      extras: (action) => (
        <>
          {education ? (
            <EducationPanel factorName={action.source.factorName} content={education.byFactor[action.source.factorId] ?? []} catalog={education.catalog}
              renderActivity={content => <LearningApplicationJourney key={`${action.id}:${content.contentId}:${content.version}`} content={content} action={action} plan={plan} view={view} busy={busy}
                onSubmit={(planId, application, binding) => write(() => createLearningApplicationFn({ data: { accessToken: token, planId, ...application, ...binding } }), "Aplicação planejada registrada. Aprendizagem e eficácia não foram inferidas.", { inline: true, replayedText: "Esta aplicação já estava registrada; nenhum efeito duplicado." })} />} />
          ) : null}
          <LearningApplicationTrace action={action} />
          {education?.byFactor[action.source.factorId]?.map((content) => (
            <Q2PracticeReview
              key={`${action.id}:${content.contentId}@${content.version}:${content.activity?.version}`}
              plan={plan}
              action={action}
              content={content}
              view={view}
              busy={busy}
              onConfirm={(application, binding) => write(
                () => createLearningApplicationFn({
                  data: { accessToken: token, planId: plan.id, ...application, ...binding, reviewOfItemId: action.id },
                }),
                "Síntese registrada. O ajuste está planejado no mesmo ciclo.",
                { inline: true, replayedText: "Este ajuste já está no plano; nenhuma ação foi duplicada." },
              )}
            />
          ))}
          <ActionTimelinePanel entries={buildActionTimeline(action, plan, itemOf(action.id), parseContentRef)} contentTitle={contentTitle} />
        </>
      ),
      efficacy: efficacy
        ? (action) => (
          <EfficacyPanel action={action} item={itemOf(action.id)} governance={efficacy.governance} busy={busy} today={today} callbacks={efficacyCallbacks} />
        )
        : undefined,
    };
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <nav aria-label="Navegação da experiência IVO" className="flex flex-wrap gap-4 text-sm">
          <a href="/ivo-integral" className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline">
            ← Visão IVO
          </a>
          <a href="/ivo-integral/q2" className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline">
            Leitura Q2 · FIB-T
          </a>
          <a href="/ivo-integral/governanca" className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline">
            Governança metodológica
          </a>
        </nav>
        <header>
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">Resultado → prioridade → ação → evidência → aprendizagem</p>
          <div className="mt-2 flex items-start gap-1">
            <h1 className="font-serif text-3xl text-foreground">Ações do ciclo a partir da FIB-T</h1>
            <ContextualHelp entry={HELP_Q2_ACOES} roleId={session.org?.role ?? null} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Evidência de execução mostra que a ação aconteceu. Ela não comprova melhora do indicador nem causalidade.
          </p>
        </header>

        <Q2JourneyOrientation roleId={session.org?.role ?? null} />

        <div role="status" aria-live="polite" className="min-h-6 text-sm">
          {feedback ? (
            <p className={feedback.tone === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>{feedback.text}</p>
          ) : null}
        </div>

        {page.state === "loading" ? <IvoLoading label="Carregando leitura publicada e ações do ciclo…" /> : null}
        {page.state === "network_error" ? (
          <IvoAccessNotice
            category="backend"
            message="Falha de comunicação com o servidor. Nenhum dado foi exibido no lugar."
            redirectTo="/ivo-integral/acoes"
            onRetry={() => void load()}
          />
        ) : null}

        {data && !data.loop.ok ? (
          <IvoAccessNotice category={data.loop.category} message={data.loop.error} redirectTo="/ivo-integral/acoes" onRetry={() => void load()} />
        ) : null}
        {ownActionsOnly ? (
          <div role="note" className="rounded-md border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">Ações sob sua responsabilidade</p>
            <p className="mt-1 text-muted-foreground">
              Você acompanha e registra a execução das ações atribuídas a você. A leitura por setor, o plano e a aprendizagem ficam com o RH.
            </p>
          </div>
        ) : null}
        {data && data.loop.ok && !data.q2.ok && !ownActionsOnly ? (
          <IvoAccessNotice category={data.q2.category} message={data.q2.error} redirectTo="/ivo-integral/acoes" onRetry={() => void load()} />
        ) : null}

        {data?.loop.ok && view && !hasPlanForCycle ? (
          <PriorityPlanner
            view={view}
            preselect={{ cohortId: search.setor, factorId: search.fator }}
            busy={busy}
            onCreate={(priorities: PriorityDraft[]) =>
              void write(
                () => createFibtPriorityActionsFn({ data: { accessToken: token, waveId: view.wave.id, priorities } }),
                "Plano do ciclo criado em rascunho.",
              )
            }
          />
        ) : null}

        {data?.loop.ok && !ownActionsOnly && (!data.education.ok || !data.efficacy.ok) ? (
          <p role="note" className="text-sm text-muted-foreground">
            {!data.efficacy.ok ? "Os protocolos de avaliação não puderam ser carregados agora; o estado de eficácia aparece como não avaliado." : null}{" "}
            {!data.education.ok ? "O catálogo de aprendizagem não pôde ser carregado agora." : null}
          </p>
        ) : null}

        {data?.loop.ok && plans.length === 0 && !view ? (
          <p className="text-sm text-muted-foreground">
            {ownActionsOnly ? "Nenhuma ação atribuída a você neste ciclo." : "Nenhuma ação de origem FIB-T registrada."}
          </p>
        ) : null}

        {plans.map((plan) => (
          <FibtActionPlanSection
            key={plan.id}
            plan={plan}
            busy={busy}
            today={today}
            onActivate={(planId) => void write(() => activateFibtActionPlanFn({ data: { accessToken: token, planId } }), "Plano ativado.")}
            callbacks={callbacks}
            enhancements={enhancementsFor(plan)}
          />
        ))}
      </div>
    </AppShell>
  );
}
