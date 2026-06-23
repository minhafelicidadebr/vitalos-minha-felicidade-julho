// Vínculos driver WWP → pilares do índice (mock-first, por pack). É o conector que faz a
// Revisão Espaçada e a Academia priorizarem pelo que a organização mais precisa (Medir →
// Educar). Vocabulário/mapeamento vivem aqui; o driver-pillar-bridge engine só recebe.
//
// Os driverId espelham os cartões em flashcard-mock.ts. Os pillarId são os IDs reais do
// framework de cada pack (*-framework.json). Packs sem mapa caem em ordem de catálogo, sem
// prioridade presumida (fallback honesto).
//
// HONESTIDADE (Fable 5 §8): cada vínculo é uma leitura semântica defensável do driver no
// vocabulário daquele setor — nunca uma equivalência forçada. Onde um driver não tem pilar
// honesto no setor (ex.: "crescimento & maestria" num condomínio residencial), ele é OMITIDO:
// o engine o trata como órfão (sem prioridade) e seus cartões caem ao fim, em ordem de
// catálogo. Mapear de menos é mais honesto que inventar correspondência.

import type { DriverPillarLink } from "@/engine/learning/driver-pillar-bridge";

const WWP_DRIVER_PILLARS: Record<string, DriverPillarLink[]> = {
  // Empresa (IVO) — vocabulário-fonte do WWP; correspondência 1:1 direta.
  enterprise: [
    { driverId: "seguranca_psicologica", pillarIds: ["seguranca_psicologica"] },
    { driverId: "reconhecimento", pillarIds: ["reconhecimento_pares"] },
    { driverId: "energia", pillarIds: ["energia_vitalidade"] },
    { driverId: "proposito", pillarIds: ["proposito_significado"] },
    { driverId: "autonomia", pillarIds: ["equilibrio_autonomia"] },
    { driverId: "pertencimento", pillarIds: ["comunicacao_pertencimento"] },
    { driverId: "crescimento", pillarIds: ["crescimento_maestria"] },
    { driverId: "clareza", pillarIds: ["clareza_direcao"] },
    { driverId: "lideranca", pillarIds: ["cuidado_ativo"] },
    { driverId: "inclusao", pillarIds: ["inclusao_equidade"] },
    { driverId: "realizacao", pillarIds: ["crescimento_maestria"] },
    { driverId: "futuro", pillarIds: ["sustentabilidade_bem_comum"] },
  ],

  // Escola (IEV) — segurança lê como segurança emocional + ambiente livre de violência;
  // energia como carga sustentável do educador; crescimento abrange engajar (aluno) e
  // desenvolver (docente). "Clareza" e "futuro" NÃO têm pilar escolar honesto — omitidos.
  school: [
    { driverId: "seguranca_psicologica", pillarIds: ["seguranca_emocional", "ambiente_seguro"] },
    { driverId: "reconhecimento", pillarIds: ["realizacao_docente"] },
    { driverId: "energia", pillarIds: ["carga_sustentavel"] },
    { driverId: "proposito", pillarIds: ["proposito_aprender", "proposito_institucional"] },
    { driverId: "autonomia", pillarIds: ["voz_participacao"] },
    { driverId: "pertencimento", pillarIds: ["pertencimento_escolar"] },
    {
      driverId: "crescimento",
      pillarIds: ["engajamento_aprendizagem", "desenvolvimento_professor"],
    },
    { driverId: "lideranca", pillarIds: ["clima_escolar"] },
    { driverId: "inclusao", pillarIds: ["inclusao_equidade"] },
    { driverId: "realizacao", pillarIds: ["realizacao_docente"] },
  ],

  // Governo (IGV) — framework já nomeia segurança/reconhecimento/vigor/propósito; autonomia
  // lê como equilíbrio & autonomia funcional; crescimento abrange carreira + suporte da gestão.
  government: [
    { driverId: "seguranca_psicologica", pillarIds: ["seguranca_psicologica_gov"] },
    { driverId: "reconhecimento", pillarIds: ["reconhecimento_pares_gov"] },
    { driverId: "energia", pillarIds: ["vigor_funcional"] },
    { driverId: "proposito", pillarIds: ["proposito_publico"] },
    { driverId: "autonomia", pillarIds: ["equilibrio_srv"] },
    { driverId: "pertencimento", pillarIds: ["cooperacao_secao"] },
    { driverId: "crescimento", pillarIds: ["crescimento_carreira", "suporte_desenvolvimento"] },
    { driverId: "clareza", pillarIds: ["clareza_criterios"] },
    { driverId: "lideranca", pillarIds: ["cuidado_servidor"] },
    { driverId: "inclusao", pillarIds: ["inclusao_equidade_gov"] },
    { driverId: "realizacao", pillarIds: ["cultura_servico_publico"] },
    { driverId: "futuro", pillarIds: ["transparencia_bem_comum"] },
  ],

  // Condomínio (IVC) — contexto residencial, não de trabalho: segurança lê como convivência
  // respeitosa; energia como bem-estar no espaço de vida; propósito como compromisso com o
  // bem-comum. "Crescimento", "realização" e "futuro" (laboral) NÃO têm pilar residencial
  // honesto — omitidos de propósito (caem em ordem de catálogo, sem prioridade presumida).
  condominium: [
    { driverId: "seguranca_psicologica", pillarIds: ["convivencia_respeito_cond"] },
    { driverId: "reconhecimento", pillarIds: ["cooperacao_comunitaria"] },
    { driverId: "energia", pillarIds: ["bem_estar_habitacional"] },
    { driverId: "proposito", pillarIds: ["sustentabilidade_ambiental"] },
    { driverId: "autonomia", pillarIds: ["voz_participacao_cond"] },
    { driverId: "pertencimento", pillarIds: ["pertencimento_residencial"] },
    { driverId: "clareza", pillarIds: ["clareza_normas"] },
    { driverId: "lideranca", pillarIds: ["responsividade_lideranca"] },
    { driverId: "inclusao", pillarIds: ["inclusao_diversidade_cond"] },
  ],

  // Saúde (IVS) — framework de quem cuida: segurança/reconhecimento/propósito/crescimento
  // nomeados; energia abrange vigor clínico + recuperação entre plantões; autonomia lê como
  // clareza de protocolos (a latitude de decisão possível na assistência); pertencimento como
  // colaboração multiprofissional. "Futuro" (laboral) omitido — sem pilar clínico honesto.
  health: [
    { driverId: "seguranca_psicologica", pillarIds: ["seguranca_psicologica_clinica"] },
    { driverId: "reconhecimento", pillarIds: ["reconhecimento_equipe_saude"] },
    { driverId: "energia", pillarIds: ["vigor_clinico", "recuperacao_descanso"] },
    { driverId: "proposito", pillarIds: ["proposito_cuidar"] },
    { driverId: "autonomia", pillarIds: ["clareza_protocolos"] },
    { driverId: "pertencimento", pillarIds: ["colaboracao_assistencial"] },
    { driverId: "crescimento", pillarIds: ["crescimento_competencia"] },
    { driverId: "clareza", pillarIds: ["clareza_protocolos"] },
    { driverId: "lideranca", pillarIds: ["suporte_lideranca_clinica"] },
    { driverId: "inclusao", pillarIds: ["inclusao_equidade_saude"] },
    { driverId: "realizacao", pillarIds: ["crescimento_competencia"] },
  ],
};

/** Vínculos driver→pilar do pack ativo, ou [] quando o pack não declara mapa. */
export function getDriverPillarLinks(packId: string): DriverPillarLink[] {
  return WWP_DRIVER_PILLARS[packId] ?? [];
}
