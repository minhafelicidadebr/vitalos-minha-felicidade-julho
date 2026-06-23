// Mentor IA por driver — escopa o Copiloto à evidência de UM driver (os "12 mentores"). NÃO é
// um novo motor: monta uma CopilotKnowledgeBase a partir do crosswalk canônico (intersecções,
// hipóteses, intervenções, evidência) e a injeta no copilot-engine existente — mesmo grounding,
// mesma anti-alucinação (G1), mesmos gates G2/G3/G5. Compor, não acumular.
//
// HONESTIDADE: cada chunk carrega fonte; intersecção sem hipótese canônica é rotulada como
// leitura exploratória. Desfechos nunca viram chunk de ação (separação A/B já garantida no
// registro). O mentor herda os limites do copiloto (só agregados, sem diagnóstico).

import { tokenize, type CopilotKnowledgeBase, type KnowledgeChunk } from "@/engine/ai/copilot-engine";
import { driverProfile } from "@/engine/nr1/crosswalk-engine";
import { NR1_CROSSWALK as R } from "@/mocks/nr1-crosswalk-mock";

const PILLAR_LABEL: Record<string, string> = {
  energia_vitalidade: "Energia & Vitalidade",
  proposito_significado: "Propósito & Significado",
  crescimento_maestria: "Crescimento & Maestria",
  equilibrio_autonomia: "Equilíbrio & Autonomia",
  seguranca_psicologica: "Segurança Psicológica",
  cooperacao_confianca: "Cooperação & Confiança",
  reconhecimento_pares: "Reconhecimento entre Pares",
  comunicacao_pertencimento: "Comunicação & Pertencimento",
  clareza_direcao: "Clareza & Direção",
  justica_coerencia: "Justiça & Coerência",
  desenvolvimento_pessoas: "Desenvolvimento de Pessoas",
  cuidado_ativo: "Cuidado Ativo da Liderança",
  condicoes_carga: "Condições & Carga de Trabalho",
  cultura_bem_estar: "Cultura de Bem-Estar",
  inclusao_equidade: "Inclusão, Equidade & Diversidade",
  sustentabilidade_bem_comum: "Sustentabilidade & Bem-Comum",
};

/** Nome do driver (para o cabeçalho do mentor), ou null se inexistente. */
export function driverLabel(driverId: string): string | null {
  return R.drivers.find((d) => d.id === driverId)?.label ?? null;
}

/**
 * Chunks citáveis de um driver, montados do crosswalk. O motor de recuperação casa as perguntas
 * por tópicos (palavra, sem acento). Inclui visão geral, intersecções COPSOQ (risco) e FIB-T
 * (ecossistema), e um chunk de ação em camadas.
 */
export function buildDriverMentorChunks(driverId: string): KnowledgeChunk[] {
  const profile = driverProfile(R, driverId);
  if (!profile) return [];
  const { driver, copsoq, fibt } = profile;
  const driverTokens = tokenize(driver.label);
  const chunks: KnowledgeChunk[] = [];

  chunks.push({
    id: `driver_${driver.id}`,
    topics: [...driverTokens, "driver", "geral"],
    title: `Driver: ${driver.label}`,
    body: `${driver.description} Endereça os pilares ${driver.pillarIds.map((p) => PILLAR_LABEL[p] ?? p).join(", ")} (camada ${driver.macroLayer}).`,
    source: "Registro canônico de Drivers · VitalOS",
  });

  for (const { dimension, cell } of copsoq) {
    const rich = Boolean(cell.hypothesis);
    chunks.push({
      id: `int_${dimension.id}`,
      topics: [...tokenize(dimension.label), ...driverTokens].slice(0, 12),
      title: `${driver.label} × ${dimension.label}`,
      body:
        `${dimension.contextNote}` +
        (rich
          ? ` ${cell.hypothesis}${cell.interventionId ? ` Intervenção: ${cell.interventionId}.` : ""}`
          : " Relação de leitura exploratória entre o driver e a dimensão — sem vínculo causal canônico; orienta investigação, não diagnóstico."),
      source: cell.evidence ?? "Crosswalk NR-1 · COPSOQ II",
    });
  }

  for (const { dimension, cell } of fibt.slice(0, 3)) {
    chunks.push({
      id: `eco_${dimension.id}`,
      topics: [...tokenize(dimension.label), ...driverTokens, "ecossistema"].slice(0, 12),
      title: `${driver.label} × ${dimension.label} (ecossistema)`,
      body: `${dimension.contextNote} Força da relação com o driver: ${Math.round(cell.strength * 100)}%. FIB-T é lente de bem-comum, não diagnóstico individual.`,
      source: "FIB-T · Furtado (2020)",
    });
  }

  chunks.push({
    id: "acoes_camadas",
    topics: ["agir", "acao", "intervencao", "camadas", "como", "melhorar", "plano", "passo"],
    title: "Como agir em camadas",
    body: "Aja na ordem que funciona: primeiro a organização do trabalho (carga, processos, metas), depois a liderança (rituais, 1:1, clareza), depois a equipe (cooperação, escuta) e o desenvolvimento. Nunca ofereça 'workshop' como resposta a sobrecarga severa, assédio ou insegurança — primeiro muda a organização do trabalho.",
    source: "Blueprint NR-1 VitalOS · ISO 45003",
  });

  return chunks;
}

/**
 * Devolve uma KB escopada ao driver: os chunks do driver vêm PRIMEIRO (maior chance de match),
 * seguidos da base do pack (índice, privacidade, limites, drivers gerais). Se o driver não existe,
 * devolve a base intacta (fallback honesto).
 */
export function scopeKnowledgeToDriver(
  base: CopilotKnowledgeBase,
  driverId: string,
): CopilotKnowledgeBase {
  const label = driverLabel(driverId);
  if (!label) return base;
  const driverChunks = buildDriverMentorChunks(driverId);
  return {
    ...base,
    coveredTopics: [
      `o driver ${label} (sinais, intersecções e intervenções)`,
      "como agir em camadas",
      ...base.coveredTopics,
    ],
    chunks: [...driverChunks, ...base.chunks],
  };
}
