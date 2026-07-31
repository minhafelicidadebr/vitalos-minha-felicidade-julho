// Loader fail-closed do contrato canônico da FIB-T.
//
// Mesmo padrão dos registries de claims/serviços: o JSON é validado em RUNTIME,
// não só por tipo. Tipo TypeScript some no build; o que protege um instrumento
// psicométrico de voltar a divergir da fonte é uma exceção no boot.
//
// Regra central desta onda: o que o documento de Furtado (2020) NÃO define,
// este loader RECUSA — normalização, faixas interpretativas e imputação de
// resposta ausente quebram o carregamento se alguém as ligar. A alternativa
// (aceitar e "só não usar") já produziu um índice 0–1000 e quatro faixas que
// chegaram até a tela.

import raw from "./fibt-instrument.v1.json";
import {
  FIBT_RAW_SCORE_MAX,
  FIBT_SCALE_MAX,
  FIBT_SCALE_MIN,
  FIBT_TOTAL_DOMAINS,
  FIBT_TOTAL_FACTORS,
  FIBT_TOTAL_ITEMS,
  type FibtInstrumentManifest,
  type FibtItemDef,
} from "./fibt-instrument-types";

export class FibtManifestError extends Error {
  constructor(message: string) {
    super(`[fibt-instrument] ${message}`);
    this.name = "FibtManifestError";
  }
}

function fail(message: string): never {
  throw new FibtManifestError(message);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

export function validateFibtManifest(m: FibtInstrumentManifest): void {
  // ─── Identidade e proveniência ──────────────────────────────────────────
  if (m.instrument_id !== "fib_t") fail(`instrument_id inesperado: ${m.instrument_id}`);
  if (!m.source_document_sha256 || m.source_document_sha256.length !== 64) {
    fail("source_document_sha256 ausente ou malformado — a proveniência da fonte é obrigatória");
  }
  if (!m.author.includes("FURTADO")) fail("autoria da fonte não declarada");

  // ─── Escala ─────────────────────────────────────────────────────────────
  const scale = m.response_scale;
  if (scale.min !== FIBT_SCALE_MIN || scale.max !== FIBT_SCALE_MAX) {
    fail(`escala deve ser ${FIBT_SCALE_MIN}–${FIBT_SCALE_MAX}, recebida ${scale.min}–${scale.max}`);
  }
  const expectedAnchors = FIBT_SCALE_MAX - FIBT_SCALE_MIN + 1;
  if (scale.anchors.length !== expectedAnchors) {
    fail(`escala deve ter ${expectedAnchors} âncoras, tem ${scale.anchors.length}`);
  }
  scale.anchors.forEach((a, i) => {
    if (a.value !== i) fail(`âncora na posição ${i} tem valor ${a.value}`);
    if (!a.label.trim()) fail(`âncora ${a.value} sem rótulo — o texto da âncora é normativo`);
  });

  // ─── Estrutura: 3 Fatores, 9 Domínios, 32 itens ─────────────────────────
  if (m.factors.length !== FIBT_TOTAL_FACTORS) fail(`esperados ${FIBT_TOTAL_FACTORS} Fatores`);
  if (m.domains.length !== FIBT_TOTAL_DOMAINS) fail(`esperados ${FIBT_TOTAL_DOMAINS} Domínios`);
  if (m.items.length !== FIBT_TOTAL_ITEMS) fail(`esperados ${FIBT_TOTAL_ITEMS} itens`);

  const factorIds = new Set(m.factors.map((f) => f.id));
  const domainIds = new Set(m.domains.map((d) => d.id));
  if (factorIds.size !== m.factors.length) fail("id de Fator duplicado");
  if (domainIds.size !== m.domains.length) fail("id de Domínio duplicado");

  for (const d of m.domains) {
    if (!factorIds.has(d.factor_id)) fail(`domínio ${d.id} aponta para Fator inexistente`);
  }
  for (const f of m.factors) {
    for (const dId of f.domain_ids) {
      if (!domainIds.has(dId)) fail(`Fator ${f.id} aponta para domínio inexistente: ${dId}`);
      const d = m.domains.find((x) => x.id === dId)!;
      if (d.factor_id !== f.id) fail(`domínio ${dId} declarado em dois Fatores`);
    }
  }
  // Nenhum domínio órfão: os 9 têm que estar cobertos pelos 3 Fatores.
  const claimed = new Set(m.factors.flatMap((f) => f.domain_ids));
  for (const d of m.domains) {
    if (!claimed.has(d.id)) fail(`domínio ${d.id} não pertence a nenhum Fator`);
  }

  // ─── Itens: numeração 1..32 completa, sem buraco nem repetição ──────────
  const numbers = new Set<number>();
  const ids = new Set<string>();
  for (const item of m.items) {
    if (ids.has(item.id)) fail(`item duplicado: ${item.id}`);
    if (numbers.has(item.number)) fail(`número de item duplicado: ${item.number}`);
    if (item.number < 1 || item.number > FIBT_TOTAL_ITEMS) {
      fail(`item ${item.id} fora da faixa 1..${FIBT_TOTAL_ITEMS}`);
    }
    if (item.id !== `q${item.number}`) fail(`id ${item.id} não corresponde ao número ${item.number}`);
    if (!item.text.trim()) fail(`item ${item.id} sem enunciado`);
    if (!factorIds.has(item.factor_id)) fail(`item ${item.id} em Fator inexistente`);
    if (!domainIds.has(item.domain_id)) fail(`item ${item.id} em Domínio inexistente`);
    // O domínio do item tem que pertencer ao Fator do item — é o erro que
    // produziu o item 5 no Fator errado antes desta onda.
    const domain = m.domains.find((d) => d.id === item.domain_id)!;
    if (domain.factor_id !== item.factor_id) {
      fail(`item ${item.id}: domínio ${item.domain_id} não pertence ao Fator ${item.factor_id}`);
    }
    ids.add(item.id);
    numbers.add(item.number);
  }
  for (let n = 1; n <= FIBT_TOTAL_ITEMS; n += 1) {
    if (!numbers.has(n)) fail(`item ${n} ausente`);
  }

  // ─── Contagem por Fator tem que bater com o declarado (12/12/8) ─────────
  for (const f of m.factors) {
    const actual = m.items.filter((i) => i.factor_id === f.id).length;
    if (actual !== f.item_count) {
      fail(`Fator ${f.id} declara ${f.item_count} itens mas tem ${actual}`);
    }
  }
  const declaredTotal = m.factors.reduce((s, f) => s + f.item_count, 0);
  if (declaredTotal !== FIBT_TOTAL_ITEMS) {
    fail(`soma dos itens por Fator = ${declaredTotal}, esperado ${FIBT_TOTAL_ITEMS}`);
  }

  // ─── Faixa do escore bruto = nº de Fatores × máximo da escala ───────────
  if (m.scoring.raw_score_range.max !== FIBT_RAW_SCORE_MAX) {
    fail(`escore bruto máximo deve ser ${FIBT_RAW_SCORE_MAX}`);
  }
  if (m.scoring.factor_range.max !== FIBT_SCALE_MAX) fail("subíndice de Fator deve ir até 4");

  // ─── O que o documento NÃO define fica recusado, não default ───────────
  if (m.scoring.reverse_scored_items.length > 0) {
    fail("itens reversos não são documentados na fonte — não podem ser declarados");
  }
  if (m.scoring.weights !== null) fail("pesos não são documentados na fonte");
  if (m.scoring.domain_formula !== null) {
    fail("fórmula de subíndice por domínio não é documentada na fonte");
  }
  if (m.missing_data_rules.imputation_allowed !== false) {
    fail("imputação de resposta ausente não é documentada — imputar inventa a resposta da pessoa");
  }
  if (m.missing_data_rules.policy !== "FAIL_CLOSED") fail("missing data deve ser FAIL_CLOSED");
  if (m.normalization.authorized !== false) {
    fail("normalização (ex.: índice 0–1000) não é documentada na fonte");
  }
  if (m.interpretation_rules.authorized !== false || m.interpretation_rules.bands.length > 0) {
    fail("faixas interpretativas não são documentadas na fonte");
  }

  // ─── Privacidade ────────────────────────────────────────────────────────
  if (m.privacy.k_anonymity_min < 5) fail("k-anonimato mínimo do VitalOS é 5");
  if (m.privacy.individual_score_allowed !== false) fail("escore individual é proibido");

  // ─── Autorizacao de uso vive em outro registro, por desenho ────────────
  if (!m.usage_authorization_ref.includes("instrument-usage-authorization")) {
    fail("usage_authorization_ref deve apontar para o registro de autorizacao de uso");
  }

  // ─── Claims ─────────────────────────────────────────────────────────────
  if (m.allowed_claims.length === 0) fail("allowed_claims vazio");
  if (m.forbidden_claims.length === 0) fail("forbidden_claims vazio");
}

const manifest = raw as unknown as FibtInstrumentManifest;
validateFibtManifest(manifest);
deepFreeze(manifest);

export function getFibtManifest(): FibtInstrumentManifest {
  return manifest;
}

export function findFibtItem(id: string): FibtItemDef | undefined {
  return manifest.items.find((i) => i.id === id);
}

/** Itens de um Fator, em ordem de numeração do documento. */
export function itemsOfFactor(factorId: string): FibtItemDef[] {
  return manifest.items
    .filter((i) => i.factor_id === factorId)
    .slice()
    .sort((a, b) => a.number - b.number);
}

/** Itens de um Domínio, em ordem de numeração do documento. */
export function itemsOfDomain(domainId: string): FibtItemDef[] {
  return manifest.items
    .filter((i) => i.domain_id === domainId)
    .slice()
    .sort((a, b) => a.number - b.number);
}

/**
 * Um claim só passa se estiver textualmente na lista autorizada. Não há
 * "parecido o bastante" — é a mesma regra do Commercial Claims Registry.
 */
export function isFibtClaimAllowed(claim: string): boolean {
  return manifest.allowed_claims.includes(claim);
}

/** Onde consultar o direito de uso — nunca respondido por este manifesto. */
export function fibtUsageAuthorizationRef(): string {
  return manifest.usage_authorization_ref;
}
