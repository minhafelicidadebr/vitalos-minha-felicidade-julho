// Modal "Como funciona" (Onda LDX-1, doc §7.4) — usa o Dialog existente
// (Radix: trap de foco, Escape fecha, retorno de foco ao acionador já vêm de
// fábrica). Conteúdo descreve os 5 marcos reais da trilha (Aprender,
// Praticar, Aplicar, Registrar, Evoluir) e deixa explícito o que a trilha
// não é — nunca diagnóstico, canal de denúncia, investigação, terapia,
// certificação profissional ou prova isolada de conformidade NR-1.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MethodStep {
  step: string;
  whatYouDo: string;
  whatYouLearn: string;
  duration: string;
  whatIsRegistered: string;
  whatIsNotShared: string;
}

const METHOD_STEPS: MethodStep[] = [
  {
    step: "Aprender",
    whatYouDo: "Lê um microlearning curto sobre por que respostas punitivas escondem problemas.",
    whatYouLearn: "O mecanismo científico por trás da segurança psicológica no trabalho.",
    duration: "~5 minutos",
    whatIsRegistered: "Nada — leitura não gera evento.",
    whatIsNotShared: "Nada é compartilhado; é leitura individual.",
  },
  {
    step: "Praticar",
    whatYouDo: "Responde um quiz com feedback e decide um cenário ramificado.",
    whatYouLearn: "Como reconhecer a primeira resposta certa a um erro reportado.",
    duration: "Poucos minutos, no seu ritmo",
    whatIsRegistered: "Nada — respostas ficam só na sua sessão.",
    whatIsNotShared: "Suas respostas nunca aparecem para ninguém.",
  },
  {
    step: "Aplicar",
    whatYouDo: "Abre a FlorêncIA para preparar uma conversa real e assume a missão.",
    whatYouLearn: "Um roteiro para a primeira resposta a um risco reportado.",
    duration: "Conforme a conversa real",
    whatIsRegistered: "O início da missão, como nota operacional.",
    whatIsNotShared: "O conteúdo da conversa nunca é registrado — só o fato de ter começado.",
  },
  {
    step: "Registrar",
    whatYouDo: "Anota números da rodada (participantes, riscos levantados, decisões).",
    whatYouLearn: "A prática de medir sem julgar indivíduos.",
    duration: "Menos de 1 minuto por rodada",
    whatIsRegistered: "Só números agregados e um comentário operacional opcional, nunca nomes.",
    whatIsNotShared: "Nenhum dado individual cruza para fora desta sessão de demonstração.",
  },
  {
    step: "Evoluir",
    whatYouDo: "Vê os indicadores do ciclo e decide continuar, ajustar ou interromper.",
    whatYouLearn: "Que a decisão de continuar uma prática é sempre humana, nunca automática.",
    duration: "Poucos minutos",
    whatIsRegistered: "A decisão do ciclo, como nota operacional.",
    whatIsNotShared: "Nenhum dado sai desta sessão de demonstração.",
  },
];

const IS_LIST = [
  "Aprendizado aplicado sobre segurança psicológica no trabalho.",
  "Prática registrada localmente, só nesta sessão de demonstração.",
  "Apoiada por evidência científica verificada (Evidence Passport de cada afirmação).",
];

const IS_NOT_LIST = [
  "Diagnóstico psicológico.",
  "Canal de denúncia.",
  "Investigação.",
  "Terapia.",
  "Certificação profissional.",
  "Prova isolada de conformidade NR-1.",
];

export function LearningMethodDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Como funciona a trilha Voz Segura</DialogTitle>
          <DialogDescription>
            Aprender → Praticar → Aplicar → Registrar → Evoluir — cinco marcos práticos, nesta ordem.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {METHOD_STEPS.map((s, i) => (
            <div key={s.step} className="rounded-xl border border-border/70 bg-card p-3.5">
              <p className="text-sm font-semibold text-foreground">
                {i + 1}. {s.step}
              </p>
              <dl className="mt-2 space-y-1 text-xs leading-relaxed">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-medium text-muted-foreground sm:w-32">O que você faz</dt>
                  <dd className="text-card-foreground">{s.whatYouDo}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-medium text-muted-foreground sm:w-32">O que aprende</dt>
                  <dd className="text-card-foreground">{s.whatYouLearn}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-medium text-muted-foreground sm:w-32">Duração</dt>
                  <dd className="text-card-foreground">{s.duration}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-medium text-muted-foreground sm:w-32">O que é registrado</dt>
                  <dd className="text-card-foreground">{s.whatIsRegistered}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-medium text-muted-foreground sm:w-32">
                    O que não é compartilhado
                  </dt>
                  <dd className="text-card-foreground">{s.whatIsNotShared}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              O que esta trilha é
            </p>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-card-foreground">
              {IS_LIST.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-400/50 bg-amber-50/60 p-3.5 dark:bg-amber-950/20">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-900 dark:text-amber-300">
              O que esta trilha não é
            </p>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-amber-900 dark:text-amber-300">
              {IS_NOT_LIST.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
