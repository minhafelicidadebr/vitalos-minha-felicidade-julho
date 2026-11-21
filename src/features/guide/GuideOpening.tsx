// Guia da Jornada · abertura para quem avalia contratar (V2.1 §8 A) e "Meu percurso" (§8 B).
import { ArrowRight } from "lucide-react";
import type { GuideContent, GuideLens } from "@/domain/guide/guide-types";
import { effectiveLevel, operationalCta, statusLabel, type GuideEntry, type GuideServerContext } from "@/lib/guide/guide-entry";

function Chip({ text }: { text: string }) {
  const solid = text === "Disponível";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${solid ? "border-primary bg-primary/10 text-primary" : "border-dashed border-muted-foreground/60 text-muted-foreground"}`}>
      {text}
    </span>
  );
}

export function GuideOpening({ content, environment, onStart }: { content: GuideContent; environment: string; onStart: () => void }) {
  const o = content.opening;
  return (
    <section aria-labelledby="guide-opening" className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Guia da jornada empresarial</p>
        <h1 id="guide-opening" className="max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">{o.title}</h1>
        <p className="max-w-2xl text-base text-muted-foreground">{o.text}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {o.primaryCta} <ArrowRight aria-hidden className="h-4 w-4" />
          </button>
          <a href={o.secondaryCta.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-2 hover:underline">
            {o.secondaryCta.label}
          </a>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-medium text-foreground">{o.receives.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{o.receives.text}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-medium text-foreground">{o.mobilizes.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{o.mobilizes.text}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 md:col-span-2 lg:col-span-1">
          <h2 className="font-medium text-foreground">{o.consult.title}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {o.consult.items.map((i) => {
              const chip = i.fixed ?? statusLabel(i.capability ? effectiveLevel(i.capability, environment) : null);
              return (
                <li key={i.label} className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 text-foreground">{i.label}{i.note ? <span className="block text-xs text-muted-foreground">{i.note}</span> : null}</span>
                  <Chip text={chip} />
                </li>
              );
            })}
          </ul>
        </article>
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-foreground">{o.billing}</p>
        <p className="text-xs text-muted-foreground">{o.disclaimer}</p>
        <p className="text-xs text-muted-foreground">{content.caseLabel}</p>
      </div>
    </section>
  );
}

const LENS_PHASE: Record<GuideLens, string> = { Q1: "Mensurar", Q2: "Transformar", Q3: "Educar", Q4: "Educar", Q5: "Evoluir" };

function month(due: string | null) {
  if (!due) return null;
  const [y, m] = due.split("-");
  return y && m ? `${m}/${y}` : null;
}

export function MyJourneyCard({ entry, context, onOpen }: { entry: GuideEntry; context: GuideServerContext; onOpen: (lens: GuideLens) => void }) {
  if (entry.kind === "task") {
    const t = entry.task;
    const cta = operationalCta(t.capability, context);
    const due = month(t.dueOn);
    return (
      <section aria-labelledby="my-journey" className="space-y-3 rounded-xl border-2 border-primary/40 bg-card p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Meu percurso</p>
        <h1 id="my-journey" className="font-serif text-2xl text-foreground">Seu trabalho agora</h1>
        <p className="text-sm text-foreground">
          Você está no <strong>{t.lens} · {LENS_PHASE[t.lens]}</strong> como <strong>{context.roleLabel}</strong>.
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="font-medium text-foreground">Próxima entrega</dt><dd className="text-muted-foreground">{t.title}{due ? ` · até ${due}` : ""}</dd></div>
          <div><dt className="font-medium text-foreground">O que registrar</dt><dd className="text-muted-foreground">O que de fato aconteceu, inclusive os dias em que a prática não coube na rotina.</dd></div>
          <div><dt className="font-medium text-foreground">Quem usa o registro</dt><dd className="text-muted-foreground">O {t.recipient}, na revisão, para decidir manter, adaptar ou encerrar.</dd></div>
        </dl>
        <div className="flex flex-wrap gap-3">
          {cta ? (
            <a href={cta.href} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {cta.label} <ArrowRight aria-hidden className="h-4 w-4" />
            </a>
          ) : null}
          <button type="button" onClick={() => onOpen(t.lens)} className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Ver como funciona nesta etapa
          </button>
        </div>
      </section>
    );
  }
  if (entry.kind === "stage") {
    return (
      <section aria-labelledby="my-journey" className="space-y-3 rounded-xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Meu percurso</p>
        <h1 id="my-journey" className="font-serif text-2xl text-foreground">Seu momento no ciclo</h1>
        <p className="text-sm text-foreground">O ciclo ativo é <strong>{entry.lens} · {LENS_PHASE[entry.lens]}</strong>. Você participa como <strong>{context.roleLabel}</strong>. Veja abaixo quem atua nesta etapa e o que você pode acompanhar.</p>
        <button type="button" onClick={() => onOpen(entry.lens)} className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Ver como funciona nesta etapa
        </button>
      </section>
    );
  }
  return (
    <section aria-labelledby="my-journey" className="space-y-3 rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Meu percurso</p>
      <h1 id="my-journey" className="font-serif text-2xl text-foreground">Escolha por onde seguir</h1>
      <p className="text-sm text-muted-foreground">
        {entry.reason === "several_tasks" ? "Há mais de uma ação atribuída a você, sem prioridade definida." : "Ainda não sabemos o seu momento no ciclo."} Escolha abaixo ou veja um exemplo de Q2.
      </p>
      <ul className="flex flex-wrap gap-2">
        {entry.options.map((op) => (
          <li key={`${op.kind}-${op.taskId ?? op.lens}`}>
            <button type="button" onClick={() => onOpen(op.lens)} className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {op.label}
            </button>
          </li>
        ))}
        <li>
          <button type="button" onClick={() => onOpen("Q2")} className="inline-flex min-h-11 items-center rounded-md border border-dashed border-border px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Ver um exemplo de Q2
          </button>
        </li>
      </ul>
    </section>
  );
}
