// Baralho mock-first de cartões de revisão espaçada — vocabulário + ciência.
//
// Determinístico (sem aleatório, ordem estável) para demos consistentes. O conteúdo é
// de ciência da aprendizagem/florescimento, ancorado em drivers do Work-Wellbeing
// Playbook 2.0, reescrito na voz VitalOS e SEM marcas de terceiros. O flashcard-session
// engine recebe estes cartões como parâmetro e nunca os conhece de antemão.

import { initialSchedule } from "@/engine/learning/sm2-engine";
import type { SessionCard } from "@/engine/learning/flashcard-session";

export interface Flashcard {
  id: string;
  /** Driver WWP de origem (slug). */
  driverId: string;
  /** Rótulo humano do driver. */
  driverLabel: string;
  /** Frente — a pergunta de recuperação ativa. */
  front: string;
  /** Verso — resposta curta e citável. */
  back: string;
  /** Fonte científica da carta. */
  citation: string;
}

export const FLASHCARDS: Flashcard[] = [
  {
    id: "fc-seguranca-1",
    driverId: "seguranca_psicologica",
    driverLabel: "Segurança Psicológica",
    front: "O que é segurança psicológica em uma equipe?",
    back: "A crença compartilhada de que é seguro assumir riscos interpessoais — perguntar, discordar, admitir erro — sem medo de humilhação ou punição. É propriedade do time, não traço individual.",
    citation: "Edmondson (1999), Administrative Science Quarterly",
  },
  {
    id: "fc-seguranca-2",
    driverId: "seguranca_psicologica",
    driverLabel: "Segurança Psicológica",
    front: "Segurança psicológica é o mesmo que “ser sempre simpático”?",
    back: "Não. Não é ausência de conflito nem baixa exigência. Combina alto cuidado com alto padrão: as pessoas se sentem seguras para divergir justamente porque o trabalho importa.",
    citation: "Edmondson (2018), The Fearless Organization",
  },
  {
    id: "fc-reconhecimento-1",
    driverId: "reconhecimento",
    driverLabel: "Reconhecimento",
    front: "Por que reconhecimento específico supera o elogio genérico?",
    back: "Nomear o comportamento concreto (“a forma como você reformulou aquele risco”) torna o feedback acionável e crível, reforçando a repetição — diferente de um “bom trabalho” vago.",
    citation: "Gallup (2022), State of the Global Workplace",
  },
  {
    id: "fc-energia-1",
    driverId: "energia",
    driverLabel: "Energia & Recuperação",
    front: "Qual é a função das microppausas reais ao longo do dia?",
    back: "Interromper a fadiga atencional antes do esgotamento. Pausas curtas e genuínas (sem tela de trabalho) restauram foco e reduzem erros — recuperação é parte da performance, não o oposto dela.",
    citation: "Sonnentag (2003), Journal of Applied Psychology",
  },
  {
    id: "fc-energia-2",
    driverId: "energia",
    driverLabel: "Energia & Recuperação",
    front: "O que significa “desligar psicológico” fora do expediente?",
    back: "Não pensar no trabalho durante o descanso. É o preditor mais forte de recuperação e protege contra exaustão — mais do que apenas o tempo de folga em si.",
    citation: "Sonnentag & Fritz (2015), Journal of Organizational Behavior",
  },
  {
    id: "fc-proposito-1",
    driverId: "proposito",
    driverLabel: "Propósito & Significado",
    front: "O que distingue um trabalho “com significado” de um trabalho “motivador”?",
    back: "Significado é a percepção de que o trabalho importa e conecta a algo maior; pode coexistir com tarefas difíceis. Motivação é o impulso para agir. Significado sustenta o engajamento quando a motivação oscila.",
    citation: "Steger et al. (2012), Journal of Career Assessment",
  },
  {
    id: "fc-autonomia-1",
    driverId: "autonomia",
    driverLabel: "Autonomia & Controle",
    front: "Segundo o modelo demanda-controle, o que torna a alta demanda menos nociva?",
    back: "Latitude de decisão (autonomia sobre como e quando fazer). Alta demanda com baixo controle gera tensão (strain); alta demanda com alto controle pode ser ativadora e saudável.",
    citation: "Karasek (1979), Administrative Science Quarterly",
  },
  {
    id: "fc-pertencimento-1",
    driverId: "pertencimento",
    driverLabel: "Pertencimento",
    front: "Por que o senso de pertencimento afeta o desempenho cognitivo?",
    back: "A necessidade de pertencer é fundamental; quando ameaçada, consome recursos atencionais. Sinais de inclusão liberam essa carga e melhoram foco, criatividade e cooperação.",
    citation: "Baumeister & Leary (1995), Psychological Bulletin",
  },
  {
    id: "fc-crescimento-1",
    driverId: "crescimento",
    driverLabel: "Crescimento & Maestria",
    front: "O que é uma “mentalidade de crescimento” aplicada ao trabalho?",
    back: "A crença de que habilidades se desenvolvem com esforço e estratégia. Favorece buscar feedback, persistir após falhas e ver o erro como informação — não como veredito sobre a pessoa.",
    citation: "Dweck (2006), Mindset",
  },
];

/** Cartões de revisão prontos para a sessão (todos começam vencidos/novos). */
export function getFlashcardSession(): SessionCard<Flashcard>[] {
  return FLASHCARDS.map((card) => ({
    id: card.id,
    card,
    schedule: initialSchedule(),
  }));
}
