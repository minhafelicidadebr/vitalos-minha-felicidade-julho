import { TIMELINE_NOTE, type PlanFollowUp, type TimelineEntry } from "@/lib/ivo/action-follow-up";
import type { EducationCatalogView, EducationContentView } from "@/lib/ivo/ivo-views";
import { EFFICACY_STATE_LABEL } from "@/engine/ivo/efficacy-protocol";
import type { ReactNode } from "react";
import { ClipboardList, CheckCheck, BookOpen, ScanSearch, Info, ShieldCheck, type LucideIcon } from "lucide-react";

// Acompanhamento das ações FIB-T: resumo do plano, linha do tempo e educação.
// Apresentação apenas — tudo vem de visões já autorizadas no servidor. Nada aqui
// calcula índice, sugere melhora do IVO por conclusão de tarefa nem usa conteúdo
// mock como recomendação.

function formatInstant(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

const Stat = ({ label, value, icon: Icon }: { label: string; value: number | string; icon: LucideIcon }) => (
  <div className="rounded-xl border border-border bg-background/60 p-4">
    <dt className="flex items-center gap-2 text-sm text-muted-foreground"><Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />{label}</dt>
    <dd className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{value}</dd>
  </div>
);

export function PlanSummaryPanel({ summary, cycle }: { summary: PlanFollowUp; cycle: string }) {
  const states = (Object.keys(EFFICACY_STATE_LABEL) as Array<keyof typeof EFFICACY_STATE_LABEL>).filter((k) => summary.evaluations[k] > 0);
  return (
    <section aria-label={`Resumo de acompanhamento do plano ${cycle}`} className="space-y-5 rounded-xl border border-border bg-muted/20 p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-foreground">Acompanhamento do plano {cycle}</h3>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={ClipboardList} label="Ações" value={summary.actions} />
        <Stat icon={CheckCheck} label="Execuções registradas" value={summary.executionRecords} />
        <Stat icon={BookOpen} label="Aprendizagens registradas" value={summary.learningRecords} />
        <Stat icon={ScanSearch} label="Avaliações pendentes" value={summary.evaluationsPending} />
      </dl>
      <h4 className="text-sm font-semibold">Situação e próximos registros</h4>
      <ul className="grid gap-3 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2 [&>li]:rounded-lg [&>li]:border [&>li]:border-border [&>li]:bg-background/40 [&>li]:p-3">
        <li>
          Estados: {summary.byStatus.planejada} planejada(s) · {summary.byStatus.em_execucao} em execução · {summary.byStatus.concluida} concluída(s) ·{" "}
          {summary.byStatus.em_vigilancia} em vigilância · {summary.byStatus.interrompida} interrompida(s).
        </li>
        <li>
          Protocolos de avaliação: {summary.protocols.registered} registrado(s) · {summary.protocols.draft} em rascunho · {summary.protocols.none} sem protocolo.
        </li>
        <li>
          Avaliações: {states.length > 0 ? states.map((k) => `${summary.evaluations[k]} ${EFFICACY_STATE_LABEL[k].toLowerCase()}`).join(" · ") : "nenhuma"}.
        </li>
        {summary.actionsWithoutExecution > 0 ? <li>{summary.actionsWithoutExecution} ação(ões) sem execução registrada.</li> : null}
        {summary.actionsWithoutLearning > 0 ? <li>{summary.actionsWithoutLearning} ação(ões) sem aprendizagem registrada.</li> : null}
      </ul>
      <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Info aria-hidden="true" className="size-4 shrink-0 text-primary" />Como interpretar este acompanhamento</h4>
      <p className="text-sm leading-relaxed text-foreground">
        {summary.operationallyFinished
          ? "Todas as ações estão em estado operacional de saída (concluída, em vigilância ou interrompida)."
          : "Há ações ainda em andamento."}{" "}
        <span className="text-muted-foreground">{summary.closingNote}</span>
      </p>
      </div>
      <div className="space-y-2 border-t border-border pt-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />Origem e transparência metodológica</h4>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Origem: leitura publicada FIB-T. Cobertura dimensional: mapeamento pendente — nenhuma dimensão recebe valor.{" "}
        <a href="/ivo-integral" className="underline underline-offset-2">
          Ver cobertura
        </a>{" "}
        ·{" "}
        <a href="/ivo-integral/governanca" className="underline underline-offset-2">
          Ver governança metodológica
        </a>
      </p>
      </div>
    </section>
  );
}

export function ActionTimelinePanel({ entries, contentTitle }: { entries: TimelineEntry[]; contentTitle: (contentId: string) => string | null }) {
  return (
    <details className="rounded-md border border-border">
      <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm font-medium text-foreground">Linha do tempo da ação ({entries.length})</summary>
      <div className="space-y-2 px-3 pb-3">
        <p className="text-xs text-muted-foreground">{TIMELINE_NOTE}</p>
        <ol className="space-y-2 text-sm">
          {entries.map((e) => (
            <li key={e.id} className="rounded border border-border/60 px-3 py-2">
              <p className="font-medium text-foreground">
                {e.label}
                {e.test ? <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-foreground">teste sintético</span> : null}
              </p>
              {e.detail ? <p className="text-muted-foreground">{e.detail}</p> : null}
              {e.content ? (
                <p className="text-xs text-muted-foreground">
                  Conteúdo estudado: {contentTitle(e.content.contentId) ?? e.content.contentId} ({e.content.version})
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Registrado em <time dateTime={e.at}>{formatInstant(e.at)}</time>
                {e.factualDate ? ` · fato em ${e.factualDate.split("-").reverse().join("/")}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}

const FORMAT_LABEL: Record<string, string> = {
  microlearning: "Microaprendizagem",
  quiz_recuperacao: "Quiz de recuperação",
  cenario_ramificado: "Cenário ramificado",
  checklist: "Checklist",
  missao_real: "Missão real",
};

export function EducationPanel({ factorName, content, catalog, renderActivity }: { factorName: string; content: EducationContentView[]; catalog: EducationCatalogView; renderActivity?: (content: EducationContentView) => ReactNode }) {
  return (
    <section aria-label={`Aprendizagem sobre o fator ${factorName}`} className="space-y-2 rounded-md border border-border p-3">
      <h4 className="text-sm font-semibold text-foreground">Para aprender sobre este fator</h4>
      {content.some((c) => c.status === "APROVADO") ? null : (
        <p className="text-sm text-muted-foreground" role="note">
          Curadoria pendente: nenhum conteúdo educativo aprovado para o fator {factorName} ({catalog.curationDecision}). Conteúdo não curado não é exibido como recomendação.
        </p>
      )}
      {content.length > 0 ? (
        <ul className="space-y-2">
          {content.map((c) => (
            <li key={c.contentId}>
              <details className="rounded border border-border/60">
                <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm text-foreground">
                  {c.title}{" "}
                  <span className={`ml-1 rounded px-1.5 py-0.5 text-xs font-medium ${c.status === "TESTE" ? "bg-amber-500/20" : "bg-emerald-500/20"} text-foreground`}>
                    {c.status === "TESTE" ? "conteúdo de TESTE — não é recomendação aprovada" : "conteúdo aprovado"}
                  </span>
                </summary>
                <div className="space-y-1 px-3 pb-3 text-sm">
                  <p className="text-muted-foreground">
                    {FORMAT_LABEL[c.format] ?? c.format} · {c.estimatedMinutes} min · para {c.audience} · versão {c.version}
                  </p>
                  <p className="text-foreground">{c.objective}</p>
                  {c.usageNotice && <p role="note" className="text-sm text-muted-foreground">{c.usageNotice}</p>}
                  {c.body.map((paragraph) => (
                    <p key={paragraph} className="text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                  {c.status === "APROVADO" ? (
                    <p className="text-xs text-muted-foreground">
                      Fontes: {c.evidenceCodes.join(", ")} · afirmações permitidas: {c.safeClaimIds.join(", ")}
                    </p>
                  ) : null}
                    {renderActivity?.(c)}
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">O vínculo educativo não define a dimensão IVO nem altera escores.</p>
    </section>
  );
}
