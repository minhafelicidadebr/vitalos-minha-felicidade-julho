// Baralho mock-first de cartões de revisão espaçada — vocabulário + ciência.
//
// Determinístico (sem aleatório, ordem estável) para demos consistentes. O conteúdo é
// de ciência da aprendizagem/florescimento, ancorado em drivers do Work-Wellbeing
// Playbook 2.0, reescrito na voz VitalOS e SEM marcas de terceiros. O flashcard-session
// engine recebe estes cartões como parâmetro e nunca os conhece de antemão.

import { initialSchedule, type CardSchedule } from "@/engine/learning/sm2-engine";
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
  {
    id: "fc-clareza-1",
    driverId: "clareza",
    driverLabel: "Clareza & Previsibilidade",
    front: "Por que ambiguidade de papel é um fator de risco independente?",
    back: "Quando responsabilidades são difusas, surge retrabalho, tensão interpessoal e conflito de demandas. Clareza de papel — saber o que se espera e o que não se espera — é preditor de bem-estar tão forte quanto a carga. Comunicar mudanças antes que aconteçam reduz a insegurança.",
    citation: "Kahn et al. (1964), Organizational Stress; ISO 45003:2021",
  },
  {
    id: "fc-lideranca-1",
    driverId: "lideranca",
    driverLabel: "Liderança Preventiva",
    front: "O que significa 'liderança preventiva' no trabalho saudável?",
    back: "A chefia organiza, apoia e protege — não só cobra. Baixa qualidade de liderança amplifica todos os demais riscos psicossociais. Treinar gestores em escuta, clareza e apoio ativo é a alavanca com maior retorno sobre o risco coletivo.",
    citation: "Hammer et al. (2011), JOOP; ISO 45003:2021",
  },
  {
    id: "fc-inclusao-1",
    driverId: "inclusao",
    driverLabel: "Inclusão & Proteção",
    front: "Por que inclusão e proteção contra violência são tratadas juntas?",
    back: "Sem dignidade e ambiente livre de violência, qualquer programa de bem-estar é incoerente. Comportamentos ofensivos e exclusão exigem resposta organizacional imediata e canal seguro — antes de intervenções educativas ou de resiliência.",
    citation: "OIT (2019), Convenção 190; CID-11 QD85 (burnout ocupacional)",
  },
  {
    id: "fc-realizacao-1",
    driverId: "realizacao",
    driverLabel: "Realização Coletiva",
    front: "Qual a diferença entre meta individual e realização coletiva?",
    back: "Realização coletiva combina clareza do que é factível, contribuição visível de cada um e celebração compartilhada. Metas percebidas como inalcançáveis ou injustas corroem o engajamento; metas factíveis e reconhecidas coletivamente o sustentam.",
    citation: "Locke & Latham (2002), American Psychologist; Grant (2008), AMJ",
  },
  {
    id: "fc-futuro-1",
    driverId: "futuro",
    driverLabel: "Segurança de Futuro",
    front: "Como a insegurança sobre o futuro do trabalho afeta a saúde?",
    back: "Insegurança laboral é fator de risco independente: aumenta em reestruturações e precariza a saúde mesmo quando o emprego não é perdido. Comunicação antecipada, transições planejadas e apoio ativo à recolocação reduzem o dano.",
    citation: "Sverke et al. (2002), JOHP; De Witte (2005), European Journal of Work",
  },
];

// Maturidades de demonstração — uma prática EM ANDAMENTO, não um baralho zerado. Cada cartão
// vencido hoje está num estágio do SM-2, então o preview "volta em X" varia de forma realista
// (amanhã → 6 → 15 → 38 dias) e o resumo mostra young/mature de verdade. Determinístico: estado
// fixo por id, sem aleatório. Estes são agendamentos VÁLIDOS do motor (o preview os usa puro).
function sched(repetition: number, intervalDays: number, easiness = 2.5, lapses = 0): CardSchedule {
  return { repetition, easiness, intervalDays, lapses };
}

const DEMO_SCHEDULES: Record<string, CardSchedule> = {
  "fc-seguranca-1": sched(2, 6), // → 15 dias
  "fc-seguranca-2": initialSchedule(), // novo → amanhã
  "fc-reconhecimento-1": sched(1, 1), // → 6 dias
  "fc-energia-1": sched(3, 15, 2.6), // → 38 dias
  "fc-energia-2": initialSchedule(), // novo → amanhã
  "fc-proposito-1": sched(1, 1), // → 6 dias
  "fc-autonomia-1": sched(2, 6), // → 15 dias
  "fc-pertencimento-1": initialSchedule(), // novo → amanhã
  "fc-crescimento-1": sched(3, 15, 2.6, 1), // → 38 dias (1 recaída no histórico)
  "fc-clareza-1": sched(1, 1), // → 6 dias
  "fc-lideranca-1": initialSchedule(), // novo → amanhã
  "fc-inclusao-1": sched(2, 6), // → 15 dias
  "fc-realizacao-1": initialSchedule(), // novo → amanhã
  "fc-futuro-1": sched(1, 1), // → 6 dias
};

/** Cartões vencidos hoje, em maturidades variadas (prática em andamento). */
export function getFlashcardSession(): SessionCard<Flashcard>[] {
  return FLASHCARDS.map((card) => ({
    id: card.id,
    card,
    schedule: DEMO_SCHEDULES[card.id] ?? initialSchedule(),
  }));
}
