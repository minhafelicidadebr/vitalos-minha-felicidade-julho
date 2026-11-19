import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ClipboardCheck, FileDown, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { actionStyle, ControlCard, DeclareControlForm, NoticeForm } from "./Q1PreparationForms";
import {
  prepCommandSchema,
  preparationNextStep,
  preparationStage,
  preparationStages,
  prepMessages,
  type PrepCommand,
  type PrepResult,
  type PrepSave,
  type PrepView,
} from "@/domain/survey/q1-preparation";
import { readQ1Preparation, saveQ1Preparation } from "@/lib/api/q1-preparation.functions";
import { currentIvoAccessToken } from "./ivo-session";
import { Q1SyntheticFeedbackPreview } from "./Q1SyntheticFeedbackPreview";
import type { PreparationDocument } from "@/lib/pdf/q1-preparation-pdf";

const api = {
  read: async (cycle: string): Promise<PrepResult> =>
    readQ1Preparation({ data: { cycle, accessToken: await currentIvoAccessToken() } }),
  save: async (input: Omit<PrepSave, "accessToken">): Promise<PrepResult> =>
    saveQ1Preparation({ data: { ...input, accessToken: await currentIvoAccessToken() } }),
  download: async (view: PrepView, kind: PreparationDocument) => {
    const { renderPreparationPdf } = await import("@/lib/pdf/q1-preparation-pdf");
    renderPreparationPdf(view, kind).save(`VitalOS-Q1-${kind}-${view.cycle}-r${view.revision}.pdf`);
  },
};
type Request = Omit<PrepSave, "accessToken">;
const searchKey = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim();

export function Q1PreparationWorkspace({
  cycle,
  scope,
  client = api,
}: {
  cycle: string;
  scope: string;
  client?: typeof api;
}) {
  const [view, setView] = useState<PrepView | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [reset, setReset] = useState(0);
  const [stageFilter, setStageFilter] = useState("all");
  const [query, setQuery] = useState("");
  const revision = useRef<number | null>(null);
  const pending = useRef<Request | null>(null);
  const epoch = useRef(0);
  const working = useRef(false);

  const accept = useCallback(
    (result: PrepResult, explicit: boolean) => {
      if (!result.ok || result.view.scope !== scope || result.view.cycle !== cycle) {
        const reason = result.ok ? "scope" : result.reason;
        setError(prepMessages[reason]);
        setMessage("");
        if (
          reason === "forbidden" ||
          reason === "scope" ||
          (explicit && reason === "unavailable")
        ) {
          setView(null);
          revision.current = null;
          pending.current = null;
        }
        if (reason === "conflict") setStale(true);
        return false;
      }
      if (!explicit && revision.current !== null && result.view.revision !== revision.current) {
        setError(prepMessages.conflict);
        setMessage("");
        setStale(true);
        return false;
      }
      setError("");
      setStale(false);
      setView(result.view);
      revision.current = result.view.revision;
      return true;
    },
    [scope, cycle],
  );
  const load = useCallback(
    async (explicit: boolean) => {
      if (working.current) return;
      const tick = ++epoch.current;
      try {
        const result = await client.read(cycle);
        if (tick !== epoch.current) return;
        if (accept(result, explicit) && explicit) {
          setReset((v) => v + 1);
          pending.current = null;
          setMessage("");
        }
      } catch {
        if (tick === epoch.current) accept({ ok: false, reason: "unavailable" }, explicit);
      }
    },
    [client, cycle, accept],
  );
  useEffect(() => {
    void load(true);
    const focus = () => void load(false);
    window.addEventListener("focus", focus);
    return () => {
      epoch.current = epoch.current + 1;
      window.removeEventListener("focus", focus);
    };
  }, [load]);
  async function perform(task: (tick: number) => Promise<boolean>) {
    if (working.current || !view || stale) return false;
    working.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    const tick = ++epoch.current;
    try {
      return await task(tick);
    } catch {
      if (tick === epoch.current) setError(prepMessages.unavailable);
      return false;
    } finally {
      if (tick === epoch.current) {
        working.current = false;
        setBusy(false);
      }
    }
  }
  function save(command: PrepCommand) {
    return perform(async (tick) => {
      const parsed = prepCommandSchema.safeParse(command);
      if (!parsed.success) {
        setError("Confira os campos obrigatórios, a data e o tamanho dos textos.");
        return false;
      }
      const prior = pending.current;
      const request =
        prior &&
        prior.base === view!.revision &&
        JSON.stringify(prior.command) === JSON.stringify(parsed.data)
          ? prior
          : {
              cycle,
              expectedScope: scope,
              base: view!.revision,
              requestId: crypto.randomUUID(),
              command: parsed.data,
            };
      pending.current = request;
      const result = await client.save(request);
      if (tick !== epoch.current) return false;
      if (!result.ok && result.reason === "unavailable") {
        setError(
          "Não foi possível confirmar a gravação. Você pode repetir o mesmo envio ou reler a preparação.",
        );
        return false;
      }
      if (!accept(result, true)) return false;
      pending.current = null;
      setMessage("Registro salvo no ciclo " + cycle + ".");
      return true;
    });
  }
  function download(kind: PreparationDocument) {
    return perform(async (tick) => {
      const result = await client.read(cycle);
      if (tick !== epoch.current || !accept(result, false) || !result.ok) return false;
      await client.download(result.view, kind);
      if (tick === epoch.current) setMessage("PDF preparado para download.");
      return true;
    });
  }
  const next = view && preparationNextStep(view.state);
  const controls = view?.state.controls ?? [];
  const queue = controls.map((control) => ({ control, stage: preparationStage(control) }));
  const needle = searchKey(query);
  const visible = queue.filter(
    ({ control, stage }) =>
      (stageFilter === "all" || stage === stageFilter) &&
      (searchKey(control.label).includes(needle) || searchKey(control.scope).includes(needle)),
  );
  const visibleIds = new Set(visible.map(({ control }) => control.id));
  function clearFilters() {
    setStageFilter("all");
    setQuery("");
  }
  return (
    <div className="min-w-0 space-y-4 text-sm leading-relaxed">
      {error && (
        <div role="alert" className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <p>{error}</p>
          <Button
            className={actionStyle}
            variant="outline"
            disabled={busy}
            onClick={() => void load(true)}
          >
            Reler preparação
          </Button>
        </div>
      )}
      {!view && !error && <p role="status">Consultando a preparação deste ciclo…</p>}
      <p role="status" aria-live="polite">
        {busy ? "Processando solicitação…" : message}
      </p>
      {view && (
        <fieldset key={reset} disabled={busy || stale} className="min-w-0 space-y-5">
          <legend className="mb-3 font-semibold">
            {view.organization} · {cycle} · revisão {view.revision}
          </legend>
          {import.meta.env.DEV && <Q1SyntheticFeedbackPreview />}
          <section
            aria-label="Situação da preparação"
            className="min-w-0 space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5"
          >
            <h2 className="font-serif text-xl">Situação da preparação</h2>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3 [&>div]:min-w-0 [&>div]:rounded-lg [&>div]:bg-card [&>div]:p-3 [&_dd]:font-serif [&_dd]:text-2xl [&_dd]:tabular-nums">
              <div>
                <dt>Controles declarados</dt>
                <dd>{view.state.controls.length}</dd>
              </div>
              <div>
                <dt>Com cobertura conferida</dt>
                <dd>{view.state.controls.filter((c) => c.verification).length}</dd>
              </div>
              <div>
                <dt>Medidas planejadas no ciclo</dt>
                <dd>{view.state.controls.filter((c) => c.measure).length}</dd>
              </div>
            </dl>
            {next && (
              <a
                className="inline-flex min-h-11 items-center rounded-md px-1 font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                href={"#" + next.target}
                onClick={() => {
                  if (next.target.startsWith("control-") && !visibleIds.has(next.target.slice(8))) {
                    // Reveal the card before the browser follows the fragment.
                    flushSync(clearFilters);
                  }
                }}
              >
                {next.label}
              </a>
            )}
          </section>
          <section
            id="q1-notice"
            tabIndex={-1}
            aria-label="Comunicado pré-coleta"
            className="min-w-0 space-y-3 rounded-xl border bg-card p-4 sm:p-5"
          >
            <h2 className="flex items-center gap-2 font-serif text-xl">
              <Megaphone aria-hidden className="size-5 shrink-0 text-primary" />
              Comunicado pré-coleta
            </h2>
            <p>
              {view.state.notice
                ? "Texto revisado pelo RH. A distribuição é uma decisão da empresa."
                : "Revise o texto que a equipe receberá e informe como ela poderá fazer perguntas."}
            </p>
            {view.state.notice ? (
              <>
                <p>
                  Canal de dúvidas · {view.state.notice.contact}
                  <br />
                  Devolutiva prevista · {view.state.notice.returnChannel}
                </p>
                <Button className={actionStyle} onClick={() => void download("comunicado")}>
                  <FileDown aria-hidden />
                  Baixar comunicado
                </Button>
                <details>
                  <summary className="min-h-11 cursor-pointer py-2 font-medium text-primary">
                    Ler e revisar o texto
                  </summary>
                  <NoticeForm notice={view.state.notice} save={save} />
                </details>
              </>
            ) : (
              <NoticeForm notice={undefined} save={save} />
            )}
          </section>
          <section
            id="q1-controls"
            tabIndex={-1}
            aria-label="Controles e medidas"
            className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5"
          >
            <h2 className="flex items-center gap-2 font-serif text-xl">
              <ClipboardCheck aria-hidden className="size-5 shrink-0 text-primary" />
              Controles e medidas
            </h2>
            <p>
              Registre uma condição que a empresa já oferece. Confira com a equipe onde ela chega e
              use a lacuna observada para orientar uma medida.
            </p>
            <p className="text-muted-foreground">
              Use referências coletivas. Omita nomes, informações de saúde e relatos individuais.
            </p>
            {!view.state.controls.length && (
              <p className="rounded-md bg-muted/40 p-3">
                O ciclo ainda não tem controles declarados. Comece por uma condição que a equipe
                consiga conferir no trabalho.
              </p>
            )}
            <DeclareControlForm save={save} />
            {controls.length > 0 && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid min-w-0 gap-1 font-medium">
                    Buscar controle ou recorte
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 font-normal focus-visible:outline-2 focus-visible:outline-ring"
                    />
                  </label>
                  <label className="grid min-w-0 gap-1 font-medium">
                    Etapa do controle
                    <select
                      value={stageFilter}
                      onChange={(event) => setStageFilter(event.target.value)}
                      className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 font-normal focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <option value="all">Todas as etapas ({controls.length})</option>
                      {Object.entries(preparationStages).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label} ({queue.filter(({ stage }) => stage === key).length})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p role="status" className="text-muted-foreground">
                    {visible.length
                      ? `${visible.length} de ${controls.length} controles exibidos.`
                      : "Nenhum controle corresponde aos filtros."}
                  </p>
                  {(query || stageFilter !== "all") && (
                    <Button variant="ghost" className={actionStyle} onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </div>
            )}
            {queue.map(({ control }) => (
              <div key={control.id} hidden={!visibleIds.has(control.id)}>
                <ControlCard c={control} save={save} />
              </div>
            ))}
            {view.state.controls.length > 0 && (
              <Button
                variant="outline"
                className={actionStyle}
                id="q1-memory"
                onClick={() => void download("memoria")}
              >
                <FileDown aria-hidden />
                Baixar memória de preparação
              </Button>
            )}
          </section>
        </fieldset>
      )}
    </div>
  );
}
