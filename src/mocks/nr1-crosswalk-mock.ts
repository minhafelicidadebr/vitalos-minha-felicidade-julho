// Registro canônico do Crosswalk NR-1 (mock-first, versionado). Fonte-da-verdade da matriz
// `/matriz` e do grounding do Copiloto. Resolve o problema de integridade do app de referência
// (drivers-fantasma `autonomy`/`employee_voice` fora do catálogo): aqui cada driver é canônico e
// reconcilia, num só lugar, pilar IVO ↔ dimensão COPSOQ II ↔ domínio FIB-T.
//
// O engine (`crosswalk-engine`) só RECEBE este registro — não conhece setor. Determinístico,
// sem marca de terceiros. Desfechos (burnout, comportamentos ofensivos) entram como dimensões
// `isOutcome` SEM célula de driver: são efeito (Domínio B), nunca alvo pedagógico direto.

import type {
  CrosswalkCell,
  CrosswalkDimension,
  CrosswalkDriver,
  CrosswalkRegistry,
} from "@/engine/nr1/crosswalk-engine";

const DRIVERS: CrosswalkDriver[] = [
  { id: "carga", label: "Carga & Recuperação", macroLayer: "Condições", meteAxis: "transformar", pillarIds: ["condicoes_carga", "energia_vitalidade"], description: "O trabalho cabe na vida e na capacidade humana — picos, ritmo e recuperação." },
  { id: "autonomia", label: "Autonomia & Flexibilidade", macroLayer: "Condições", meteAxis: "transformar", pillarIds: ["equilibrio_autonomia"], description: "Influência legítima sobre como, quando e em que ritmo se trabalha." },
  { id: "clareza", label: "Clareza & Previsibilidade", macroLayer: "Condições", meteAxis: "educar", pillarIds: ["clareza_direcao"], description: "Papéis, prioridades e mudanças compreendidos sem ambiguidade." },
  { id: "lideranca", label: "Liderança Preventiva", macroLayer: "Relações", meteAxis: "transformar", pillarIds: ["cuidado_ativo", "clareza_direcao"], description: "A chefia organiza, apoia e protege o trabalho — não só cobra." },
  { id: "apoio", label: "Apoio & Comunidade", macroLayer: "Relações", meteAxis: "transformar", pillarIds: ["cooperacao_confianca", "comunicacao_pertencimento"], description: "Cooperação, escuta e pertencimento reais entre pares." },
  { id: "confianca", label: "Confiança & Voz", macroLayer: "Relações", meteAxis: "medir", pillarIds: ["seguranca_psicologica"], description: "Pessoas podem falar, participar e discordar com segurança." },
  { id: "justica", label: "Justiça & Reconhecimento", macroLayer: "Relações", meteAxis: "transformar", pillarIds: ["justica_coerencia", "reconhecimento_pares"], description: "Esforço reconhecido com equidade e respeito." },
  { id: "inclusao", label: "Inclusão & Proteção", macroLayer: "Relações", meteAxis: "transformar", pillarIds: ["inclusao_equidade"], description: "Dignidade e ambiente livre de violência para todas as pessoas." },
  { id: "proposito", label: "Propósito & Contribuição", macroLayer: "Desenvolvimento", meteAxis: "educar", pillarIds: ["proposito_significado"], description: "Percepção de por que o trabalho importa e a quem beneficia." },
  { id: "aprendizagem", label: "Aprendizagem & Desenvolvimento", macroLayer: "Desenvolvimento", meteAxis: "educar", pillarIds: ["crescimento_maestria", "desenvolvimento_pessoas"], description: "O trabalho permite aprender, crescer e usar capacidades." },
  { id: "realizacao", label: "Realização Coletiva", macroLayer: "Desenvolvimento", meteAxis: "evoluir", pillarIds: ["crescimento_maestria"], description: "Metas claras, factíveis e reconhecidas coletivamente." },
  { id: "futuro", label: "Segurança de Futuro", macroLayer: "Sustentabilidade", meteAxis: "transformar", pillarIds: ["sustentabilidade_bem_comum", "equilibrio_autonomia"], description: "Continuidade, estabilidade e equilíbrio trabalho-vida." },
];

const DIMENSIONS: CrosswalkDimension[] = [
  { id: "demands_quant", label: "Exig. quantitativas", instrument: "copsoq", group: "Exigências", contextNote: "Organização do trabalho e exigências da atividade (NR-17)." },
  { id: "work_pace", label: "Ritmo de trabalho", instrument: "copsoq", group: "Exigências", contextNote: "Dimensionamento e cadência das tarefas." },
  { id: "demands_emotional", label: "Exig. emocionais", instrument: "copsoq", group: "Exigências", contextNote: "Gestão ativa do risco mesmo quando inerente à atividade." },
  { id: "influence", label: "Influência", instrument: "copsoq", group: "Organização & Conteúdo", contextNote: "Participação e latitude de decisão (modelo demanda-controle)." },
  { id: "meaning", label: "Sentido do trabalho", instrument: "copsoq", group: "Organização & Conteúdo", contextNote: "Conexão tarefa → missão → beneficiário." },
  { id: "predictability", label: "Previsibilidade", instrument: "copsoq", group: "Organização & Conteúdo", contextNote: "Comunicação antecipada de mudanças." },
  { id: "role_clarity", label: "Clareza de papel", instrument: "copsoq", group: "Organização & Conteúdo", contextNote: "Responsabilidades e prioridades explícitas." },
  { id: "leadership_quality", label: "Qual. liderança", instrument: "copsoq", group: "Relações & Liderança", contextNote: "Medidas administrativas e acompanhamento." },
  { id: "social_support", label: "Apoio social", instrument: "copsoq", group: "Relações & Liderança", contextNote: "Suporte de pares e chefia; amplifica todos os demais." },
  { id: "recognition", label: "Reconhec. & justiça", instrument: "copsoq", group: "Relações & Liderança", contextNote: "Critérios transparentes e não discriminação." },
  { id: "community", label: "Comunidade", instrument: "copsoq", group: "Relações & Liderança", contextNote: "Prevenção coletiva e pertencimento." },
  { id: "insecurity", label: "Insegurança", instrument: "copsoq", group: "Interface trabalho-indivíduo", contextNote: "Mudanças organizacionais e transições." },
  { id: "burnout", label: "Burnout (desfecho)", instrument: "copsoq", group: "Desfecho · Domínio B", contextNote: "EFEITO, não exposição. CID-11 QD85; responsabilidade NR-1.", isOutcome: true },
  { id: "offensive_behaviors", label: "Comport. ofensivos (desfecho)", instrument: "copsoq", group: "Desfecho · Domínio B", contextNote: "EFEITO. Resposta imediata, canal seguro; OIT (2019).", isOutcome: true },
  { id: "padrao_vida", label: "Padrão de vida", instrument: "fibt", group: "Padrão de Vida", contextNote: "Ecossistema: dignidade material e realização." },
  { id: "educacao", label: "Educação", instrument: "fibt", group: "Padrão de Vida", contextNote: "Ecossistema: acesso a desenvolvimento e formação." },
  { id: "cultura", label: "Cultura", instrument: "fibt", group: "Padrão de Vida", contextNote: "Ecossistema: vida cultural e lazer." },
  { id: "bem_estar_emocional", label: "Bem-estar emocional", instrument: "fibt", group: "Bem-Estar", contextNote: "Ecossistema: afeto, sentido e felicidade percebida." },
  { id: "saude", label: "Saúde", instrument: "fibt", group: "Bem-Estar", contextNote: "Ecossistema: sono, atividade física, saúde geral." },
  { id: "uso_tempo", label: "Uso do tempo", instrument: "fibt", group: "Bem-Estar", contextNote: "Ecossistema: equilíbrio e ritmo de vida." },
  { id: "vitalidade_comunitaria", label: "Vit. comunitária", instrument: "fibt", group: "Bem-Estar", contextNote: "Ecossistema: rede de apoio e vínculos." },
  { id: "meio_ambiente", label: "Meio ambiente", instrument: "fibt", group: "Bem-Estar", contextNote: "Ecossistema: responsabilidade ambiental." },
  { id: "governanca", label: "Governança", instrument: "fibt", group: "Satisfação c/ Empresa", contextNote: "Ecossistema: confiança, ética e comunicação institucional." },
];

const COPSOQ_STRENGTH: Record<string, Record<string, number>> = {
  carga: { demands_quant: 1, work_pace: 0.9, demands_emotional: 0.6, influence: 0.3 },
  autonomia: { influence: 1, work_pace: 0.4, predictability: 0.3, demands_quant: 0.3 },
  clareza: { predictability: 1, role_clarity: 1, leadership_quality: 0.4 },
  lideranca: { leadership_quality: 1, social_support: 0.6, predictability: 0.5, recognition: 0.4 },
  apoio: { social_support: 1, community: 0.9, demands_emotional: 0.6, leadership_quality: 0.4 },
  confianca: { leadership_quality: 0.6, recognition: 0.5, community: 0.5, predictability: 0.4 },
  justica: { recognition: 1, insecurity: 0.4, leadership_quality: 0.4 },
  inclusao: { community: 0.8, social_support: 0.5, demands_emotional: 0.3 },
  proposito: { meaning: 1, influence: 0.4, recognition: 0.3 },
  aprendizagem: { meaning: 0.6, influence: 0.4, role_clarity: 0.3 },
  realizacao: { role_clarity: 0.6, recognition: 0.6, meaning: 0.5, influence: 0.4 },
  futuro: { insecurity: 1, predictability: 0.5, recognition: 0.3 },
};

const FIBT_STRENGTH: Record<string, Record<string, number>> = {
  carga: { saude: 0.9, uso_tempo: 1, bem_estar_emocional: 0.7 },
  autonomia: { uso_tempo: 0.8, bem_estar_emocional: 0.5, governanca: 0.4 },
  clareza: { governanca: 0.7, bem_estar_emocional: 0.4 },
  lideranca: { governanca: 1, bem_estar_emocional: 0.4 },
  apoio: { vitalidade_comunitaria: 1, bem_estar_emocional: 0.5 },
  confianca: { governanca: 0.9, vitalidade_comunitaria: 0.5 },
  justica: { padrao_vida: 0.7, governanca: 0.6 },
  inclusao: { vitalidade_comunitaria: 0.8, bem_estar_emocional: 0.5 },
  proposito: { bem_estar_emocional: 0.8, cultura: 0.4 },
  aprendizagem: { educacao: 1, cultura: 0.6 },
  realizacao: { bem_estar_emocional: 0.6, padrao_vida: 0.4 },
  futuro: { padrao_vida: 1, saude: 0.4, meio_ambiente: 0.3 },
};

type KeyDetail = Pick<CrosswalkCell, "priority" | "critical" | "hypothesis" | "interventionId" | "evidence">;

const KEY: Record<string, KeyDetail> = {
  "carga|demands_quant": { priority: "P0", hypothesis: "Sobrecarga e má distribuição de carga elevam exaustão antes de qualquer treino de gestão do tempo.", interventionId: "workload_redesign", evidence: "Bakker & Demerouti (2017); ISO 45003" },
  "carga|work_pace": { priority: "P0", hypothesis: "Ritmo imposto sem controle gera tensão (strain) e erros.", interventionId: "pace_review", evidence: "Karasek & Theorell (1990)" },
  "carga|demands_emotional": { priority: "P0", hypothesis: "Exigência emocional intensa (saúde, atendimento, educação) precisa de gestão ativa.", interventionId: "emotional_support", evidence: "Hochschild (1983); COPSOQ II" },
  "autonomia|influence": { priority: "P0", hypothesis: "Alta demanda com baixo controle é o par mais nocivo; latitude de decisão protege.", interventionId: "job_redesign", evidence: "Karasek (1979); Parker et al. (2019)" },
  "lideranca|leadership_quality": { priority: "P0", hypothesis: "Baixa qualidade de liderança amplifica todos os demais riscos.", interventionId: "manager_training", evidence: "Hammer et al. (2011)" },
  "apoio|social_support": { priority: "P0", hypothesis: "Baixo apoio social potencia exaustão e isolamento.", interventionId: "peer_support", evidence: "Eurofound (2021)" },
  "inclusao|community": { priority: "P0", critical: true, hypothesis: "Falta de pertencimento e comportamentos ofensivos exigem resposta imediata e canal seguro.", interventionId: "anti_harassment_policy", evidence: "OIT (2019); CID-11" },
  "justica|recognition": { priority: "P1", hypothesis: "Injustiça percebida correlaciona com burnout e turnover.", interventionId: "recognition_program", evidence: "Stansfeld & Candy (2006)" },
  "clareza|predictability": { priority: "P1", hypothesis: "Ambiguidade e mudanças não comunicadas são fator de risco independente para burnout.", interventionId: "change_communication", evidence: "Kahn et al. (1964); ISO 45003" },
  "clareza|role_clarity": { priority: "P1", hypothesis: "Responsabilidades difusas geram retrabalho e tensão.", interventionId: "role_clarity", evidence: "Kahn et al. (1964)" },
  "futuro|insecurity": { priority: "P1", hypothesis: "Insegurança laboral cresce em reestruturações e precariza a saúde.", interventionId: "change_communication", evidence: "Sverke et al. (2002)" },
  "proposito|meaning": { priority: "P2", hypothesis: "Baixo sentido desengaja — sobretudo em funções repetitivas ou distantes do impacto.", interventionId: "purpose_framing", evidence: "Grant (2008); Wrzesniewski et al. (2010)" },
};

function buildCells(): CrosswalkCell[] {
  const cells: CrosswalkCell[] = [];
  for (const [driverId, dims] of Object.entries(COPSOQ_STRENGTH)) {
    for (const [dimensionId, strength] of Object.entries(dims)) {
      cells.push({ driverId, dimensionId, strength, ...KEY[`${driverId}|${dimensionId}`] });
    }
  }
  for (const [driverId, dims] of Object.entries(FIBT_STRENGTH)) {
    for (const [dimensionId, strength] of Object.entries(dims)) {
      cells.push({ driverId, dimensionId, strength });
    }
  }
  return cells;
}

export const NR1_CROSSWALK: CrosswalkRegistry = {
  version: "2026.1",
  updatedAt: "2026-06-22",
  drivers: DRIVERS,
  dimensions: DIMENSIONS,
  cells: buildCells(),
  sources: [
    "Work-Wellbeing Playbook 2.0 — Oxford Wellbeing Research Centre (2024)",
    "COPSOQ II — Kristensen et al. (NRCWE, 2005); Manual PT (Silva et al., 2013)",
    "Guia MTE/SIT — Fatores de Risco Psicossocial (2026); NR-1 e NR-17",
    "ISO 45003:2021 — Gestão de riscos psicossociais",
    "FIB-T — Furtado (2020), Felicidade Interna Bruta do Trabalhador",
    "Job Demands-Resources — Bakker & Demerouti (2017)",
  ],
};

/** Exposição COPSOQ agregada fictícia (0..100; alto = pior) — perfil demo com 2 dimensões em risco. */
export const DEMO_COPSOQ_EXPOSURE = [
  { dimensionId: "demands_quant", load: 72, visible: true },
  { dimensionId: "work_pace", load: 68, visible: true },
  { dimensionId: "demands_emotional", load: 54, visible: true },
  { dimensionId: "influence", load: 61, visible: true },
  { dimensionId: "meaning", load: 28, visible: true },
  { dimensionId: "predictability", load: 44, visible: true },
  { dimensionId: "role_clarity", load: 33, visible: true },
  { dimensionId: "leadership_quality", load: 47, visible: true },
  { dimensionId: "social_support", load: 39, visible: true },
  { dimensionId: "recognition", load: 58, visible: true },
  { dimensionId: "community", load: 22, visible: false },
  { dimensionId: "insecurity", load: 51, visible: true },
];
