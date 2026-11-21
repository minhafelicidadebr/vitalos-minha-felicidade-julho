import { getCopsoqManifest } from "@/domain/survey/copsoq-instrument-manifest";
import { FileCheck2, Fingerprint, ShieldAlert, ArrowRight, BookOpen } from "lucide-react";
import { PrivatePracticeCase, type PracticeCase } from "./PrivatePracticeCase";

const PRESSURE_AT_WORK: PracticeCase = {
  recall:
    "Pense em uma condição do trabalho que aumenta a pressão sem depender do esforço individual.",
  situation:
    "Em uma equipe fictícia, duas áreas enviam pedidos urgentes ao mesmo tempo. Quem atende precisa decidir sozinho o que vem primeiro.",
  question: "Que condição a equipe e a gestão podem revisar juntas?",
  options: [
    {
      label: "Acordar uma regra de prioridade para os pedidos concorrentes.",
      feedback:
        "Combine quem pode decidir, como encaminhar exceções e quando verificar se a regra foi usada. Isso dá à equipe uma condição concreta para testar.",
    },
    {
      label: "Pedir que cada pessoa organize melhor o próprio tempo.",
      feedback:
        "A orientação individual ainda deixa a equipe com prioridades concorrentes. Identifique quem decide e quais pedidos podem esperar.",
    },
  ],
};

// Preparação operacional de Q1. A confirmação informada pelo operador ainda
// precisa ser vinculada à fonte exata; o manifesto demonstrativo não a substitui.
export function CopsoqPreparationNotice() {
  const manifest = getCopsoqManifest();
  return (
    <section
      aria-labelledby="copsoq-preparation-title"
      className="min-w-0 space-y-5 rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-6"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <FileCheck2 aria-hidden="true" className="size-5 shrink-0" />
        Identidade e preparação
      </div>
      <h2 id="copsoq-preparation-title" className="font-serif text-xl">
        Q1 · COPSOQ — preparação da aplicação
      </h2>
      <p className="text-sm">
        A versão brasileira para Q1 foi aprovada por João Paulo Brandão Barboza, responsável
        metodológico, em 18/11/2026.
      </p>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Fingerprint aria-hidden="true" className="size-4 shrink-0" />O que o sistema serve hoje
      </h3>
      <dl className="grid gap-3 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2 [&>div]:min-w-0 [&>div]:break-words [&>div]:rounded-lg [&>div]:border [&>div]:border-border [&>div]:bg-muted/20 [&>div]:p-3 [&_dt]:mb-1 [&_dt]:block [&_dd]:block">
        <div>
          <dt className="inline font-medium">Versão no sistema: </dt>
          <dd className="inline">{manifest.version}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Instrumento servido: </dt>
          <dd className="inline">{manifest.served_name}</dd>
        </div>
      </dl>
      <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert aria-hidden="true" className="size-4 shrink-0" />
          Correspondência com a fonte aprovada
        </h3>
        <p role="note" className="text-sm leading-relaxed text-muted-foreground">
          O próximo passo é vincular a edição exata e conferir itens, escalas, reversões, ausências,
          cálculo e atribuição. Coleta e publicação empresariais de Q1 permanecem indisponíveis até
          essa conferência. Você pode continuar a jornada Q2 independentemente de Q1.
        </p>
      </div>
      <details className="space-y-3 rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
        <summary className="min-h-11 cursor-pointer rounded-md py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">
          <BookOpen className="mr-2 inline size-4" aria-hidden="true" />
          Praticar antes da coleta: prioridades concorrentes
        </summary>
        <PrivatePracticeCase example={PRESSURE_AT_WORK} />
        <p className="text-sm text-muted-foreground">
          Na revisão, registre primeiro se a condição combinada mudou. Este exercício abre somente
          um caso didático.
        </p>
      </details>
      <a
        href="/ivo-integral/governanca"
        className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-md text-sm text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Consultar pendências metodológicas
        <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
      </a>
    </section>
  );
}
