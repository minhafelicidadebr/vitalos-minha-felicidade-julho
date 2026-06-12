// Academia do Florescimento — learning paths per role, deterministic mock

export interface AcademyModule {
  id: string;
  title: string;
  minutes: number;
  format: "vídeo" | "leitura" | "prática" | "quiz";
  done: boolean;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  roles: string[];
  pillarName: string;
  modules: AcademyModule[];
  learnPoints: number;
}

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "lp-fundamentos",
    title: "Fundamentos do Florescimento",
    description:
      "O que a ciência diz sobre florescer no trabalho — e o que depende de você vs do sistema.",
    roles: [
      "COLABORADOR",
      "EMBAIXADOR",
      "LIDER_EQUIPE",
      "RH_ADMIN",
      "CHRO",
      "C_LEVEL",
      "SST_PROFISSIONAL",
      "HOLDING_ADMIN",
    ],
    pillarName: "Propósito & Significado",
    learnPoints: 60,
    modules: [
      { id: "m1", title: "PERMA+V em 7 minutos", minutes: 7, format: "vídeo", done: true },
      {
        id: "m2",
        title: "As 4 Lentes: por que o nível importa",
        minutes: 6,
        format: "leitura",
        done: true,
      },
      {
        id: "m3",
        title: "Quiz: mitos do bem-estar corporativo",
        minutes: 5,
        format: "quiz",
        done: false,
      },
    ],
  },
  {
    id: "lp-energia",
    title: "Energia que se Renova",
    description: "Microdescansos, sono e os limites saudáveis que protegem sua vitalidade.",
    roles: ["COLABORADOR", "EMBAIXADOR"],
    pillarName: "Energia & Vitalidade",
    learnPoints: 45,
    modules: [
      { id: "m1", title: "A ciência das pausas reais", minutes: 6, format: "vídeo", done: true },
      {
        id: "m2",
        title: "Prática: desenhe seu dia de energia",
        minutes: 8,
        format: "prática",
        done: false,
      },
      { id: "m3", title: "Quiz de consolidação", minutes: 4, format: "quiz", done: false },
    ],
  },
  {
    id: "lp-seguranca-lider",
    title: "Liderando com Segurança Psicológica",
    description: "Como criar o clima onde as pessoas avisam antes de quebrar — base: Edmondson.",
    roles: ["LIDER_EQUIPE", "RH_ADMIN", "CHRO"],
    pillarName: "Segurança Psicológica",
    learnPoints: 80,
    modules: [
      {
        id: "m1",
        title: "O que segurança psicológica NÃO é",
        minutes: 7,
        format: "vídeo",
        done: false,
      },
      {
        id: "m2",
        title: "As 3 perguntas que abrem conversas",
        minutes: 5,
        format: "leitura",
        done: false,
      },
      {
        id: "m3",
        title: "Prática: rode o Ritual da Pergunta Segura",
        minutes: 8,
        format: "prática",
        done: false,
      },
      { id: "m4", title: "Quiz final", minutes: 5, format: "quiz", done: false },
    ],
  },
  {
    id: "lp-nr1",
    title: "NR-1 Psicossocial sem Pânico",
    description: "O essencial da gestão de riscos psicossociais — educativo, preparatório ao PGR.",
    roles: ["SST_PROFISSIONAL", "CIPA_MEMBRO", "RH_ADMIN", "CHRO", "LIDER_EQUIPE"],
    pillarName: "Condições & Carga de Trabalho",
    learnPoints: 70,
    modules: [
      {
        id: "m1",
        title: "O que a NR-1 realmente exige",
        minutes: 8,
        format: "leitura",
        done: false,
      },
      {
        id: "m2",
        title: "Inventário de riscos na prática",
        minutes: 7,
        format: "vídeo",
        done: false,
      },
      {
        id: "m3",
        title: "Evidências que sustentam o GRO",
        minutes: 6,
        format: "leitura",
        done: false,
      },
    ],
  },
  {
    id: "lp-reconhecimento",
    title: "A Arte do Reconhecimento",
    description: "Kudos que fortalecem cultura — específicos, sinceros e frequentes.",
    roles: ["COLABORADOR", "EMBAIXADOR", "LIDER_EQUIPE"],
    pillarName: "Reconhecimento entre Pares",
    learnPoints: 40,
    modules: [
      {
        id: "m1",
        title: "Por que elogio genérico não funciona",
        minutes: 5,
        format: "vídeo",
        done: false,
      },
      {
        id: "m2",
        title: "Prática: escreva 1 kudo específico",
        minutes: 5,
        format: "prática",
        done: false,
      },
    ],
  },
];

export function pathProgress(path: LearningPath): number {
  if (path.modules.length === 0) return 0;
  return Math.round((path.modules.filter((m) => m.done).length / path.modules.length) * 100);
}
