// Codesign Studio Engine — builder de intervenção por blocos validados
// (LD-009, LDX-4 pull-forward, Fatia A).
// ADR: docs/learning/PLANO_ESTUDIO_CODESIGN_LD009_2026-07-21.md.
//
// Doutrina (LD-009, risco R3_HIGH, aiMode NONE):
// - SEM IA de qualquer tipo — nenhuma geração, nenhuma inferência; o humano
//   COMPÕE a partir de blocos, o motor só VALIDA;
// - guardrail central (forbiddenUse do registro): "medida individualizante
//   quando a causa é organizacional" é RECUSA ESTRUTURAL no validateDraft, não
//   um aviso que se pode ignorar;
// - dono é sempre PAPEL, nunca pessoa (mesma disciplina do ActionLog);
// - SEM persistência: o export é um objeto entregue ao chamador, nunca gravado;
// - "export rastreável": carimba padrão + papel revisor + timestamp.
//
// Os blocos (padrões, campos obrigatórios) vêm do Intervention Pattern Registry
// (src/domain/evidence/intervention-patterns.json) via loader na Fatia B — este
// motor é agnóstico de domínio: recebe o id do padrão e a lista de campos
// obrigatórios como dados. Engine puro: sem React, sem I/O, sem IA, sem import
// de src/domain.

// ─── Escopo da intervenção (governa o guardrail) ─────────────────────────────

/** Escopo declarado. `organizacional` bloqueia medida individualizante — a
 * causa é do sistema, não da pessoa. */
export type InterventionScope = "equipe" | "lideranca" | "organizacional" | "cultural";

/** Alvo da medida. `individuo` sob escopo `organizacional` é a violação central
 * que o motor recusa por construção. */
export type MeasureTarget = "individuo" | "equipe" | "processo" | "politica" | "ambiente";

export interface CodesignIndicator {
  label: string;
  baseline: string;
  target: string;
  unit: string;
}

/** Dono é um PAPEL do pack (ex.: "LIDER_EQUIPE"), nunca um nome de pessoa. */
export interface CodesignDraft {
  patternId: string;
  scope: InterventionScope | null;
  measureTarget: MeasureTarget | null;
  /** Os 6 campos obrigatórios do intervention-patterns.json, por chave. */
  fields: Record<string, string>;
  indicator: CodesignIndicator | null;
  ownerRole: string | null;
  deadline: string | null;
  /** Efeitos adversos da watchlist que o autor reconheceu monitorar. */
  acknowledgedAdverseEffects: readonly string[];
}

// ─── Ciclo de vida do rascunho (imutável) ────────────────────────────────────

export function startDraft(patternId: string): CodesignDraft {
  return {
    patternId,
    scope: null,
    measureTarget: null,
    fields: {},
    indicator: null,
    ownerRole: null,
    deadline: null,
    acknowledgedAdverseEffects: [],
  };
}

export function setScope(draft: CodesignDraft, scope: InterventionScope): CodesignDraft {
  return { ...draft, scope };
}

export function setMeasureTarget(draft: CodesignDraft, target: MeasureTarget): CodesignDraft {
  return { ...draft, measureTarget: target };
}

export function setField(draft: CodesignDraft, key: string, value: string): CodesignDraft {
  return { ...draft, fields: { ...draft.fields, [key]: value } };
}

export function setIndicator(draft: CodesignDraft, indicator: CodesignIndicator): CodesignDraft {
  return { ...draft, indicator };
}

export function setOwnerRole(draft: CodesignDraft, ownerRole: string): CodesignDraft {
  return { ...draft, ownerRole };
}

export function setDeadline(draft: CodesignDraft, deadline: string): CodesignDraft {
  return { ...draft, deadline };
}

/** Alterna o reconhecimento de um efeito adverso da watchlist (idempotente). */
export function toggleAdverseEffect(draft: CodesignDraft, effect: string): CodesignDraft {
  const has = draft.acknowledgedAdverseEffects.includes(effect);
  return {
    ...draft,
    acknowledgedAdverseEffects: has
      ? draft.acknowledgedAdverseEffects.filter((e) => e !== effect)
      : [...draft.acknowledgedAdverseEffects, effect],
  };
}

// ─── Validação (o coração do motor) ──────────────────────────────────────────

export interface CodesignValidation {
  errors: string[];
  /** Erros que são do GUARDRAIL (não individualizar causa organizacional) —
   * separados para a UI destacá-los como bloqueio ético, não campo faltando. */
  guardrailErrors: string[];
  valid: boolean;
}

/** Valida o rascunho contra os campos obrigatórios do padrão + o guardrail
 * central. A lista de campos obrigatórios vem do registry (Fatia B) — o motor
 * a recebe como dado, nunca a hardcoda. */
export function validateDraft(
  draft: CodesignDraft,
  requiredFieldKeys: readonly string[],
  watchlist: readonly string[],
): CodesignValidation {
  const errors: string[] = [];
  const guardrailErrors: string[] = [];

  if (!draft.scope) errors.push("escopo da intervenção não definido");
  if (!draft.measureTarget) errors.push("alvo da medida não definido");

  // GUARDRAIL CENTRAL: escopo organizacional ⇒ nunca medida individualizante.
  if (draft.scope === "organizacional" && draft.measureTarget === "individuo") {
    guardrailErrors.push(
      "escopo organizacional não admite medida individualizante — a causa é do sistema, não da pessoa (trate processo, política ou ambiente)",
    );
  }

  for (const key of requiredFieldKeys) {
    if (!draft.fields[key]?.trim()) errors.push(`campo obrigatório ausente: ${key}`);
  }

  if (!draft.ownerRole?.trim()) {
    errors.push("dono não definido");
  } else if (looksLikePersonName(draft.ownerRole)) {
    guardrailErrors.push("dono deve ser um PAPEL (ex.: LIDER_EQUIPE), nunca o nome de uma pessoa");
  }

  if (!draft.deadline?.trim()) errors.push("prazo não definido");

  if (!draft.indicator) {
    errors.push("indicador não definido");
  } else {
    if (!draft.indicator.baseline.trim()) errors.push("indicador sem baseline");
    if (!draft.indicator.target.trim()) errors.push("indicador sem alvo");
  }

  // Ao menos um efeito adverso da watchlist precisa ter sido considerado.
  if (watchlist.length > 0 && draft.acknowledgedAdverseEffects.length === 0) {
    errors.push("nenhum efeito adverso reconhecido — reveja a watchlist antes de prosseguir");
  }

  return {
    errors,
    guardrailErrors,
    valid: errors.length === 0 && guardrailErrors.length === 0,
  };
}

/** Heurística conservadora: um papel do pack é MAIÚSCULO_COM_UNDERSCORE ou uma
 * função curta ("RH", "CHRO"). Dois nomes próprios capitalizados ("Ana Souza")
 * disparam a suspeita de nome de pessoa. Não pretende ser perfeita — é uma rede
 * de segurança que erra para o lado de pedir um papel. */
function looksLikePersonName(owner: string): boolean {
  const trimmed = owner.trim();
  // Papéis canônicos (screaming snake case) e siglas passam direto.
  if (/^[A-Z][A-Z0-9_]*$/.test(trimmed)) return false;
  // "Ana", "Ana Souza", "João da Silva" — 1+ palavras Capitalizadas comuns.
  return /^[A-ZÀ-Ý][a-zà-ÿ]+(\s+[a-zà-ÿ]+)*(\s+[A-ZÀ-Ý][a-zà-ÿ]+)+$/.test(trimmed) ||
    /^[A-ZÀ-Ý][a-zà-ÿ]{2,}$/.test(trimmed);
}

/** Pronto para o gate de revisão humana = validação limpa. */
export function readyForReview(
  draft: CodesignDraft,
  requiredFieldKeys: readonly string[],
  watchlist: readonly string[],
): boolean {
  return validateDraft(draft, requiredFieldKeys, watchlist).valid;
}

// ─── Export rastreável (não persiste) ────────────────────────────────────────

export interface TraceableExport {
  patternId: string;
  scope: InterventionScope;
  measureTarget: MeasureTarget;
  fields: Record<string, string>;
  indicator: CodesignIndicator;
  ownerRole: string;
  deadline: string;
  acknowledgedAdverseEffects: readonly string[];
  /** Rastro: papel de quem revisou + quando. Nunca nome. */
  reviewedByRole: string;
  reviewedAt: string;
}

/** Constrói o objeto de export APENAS de um rascunho válido e revisado. Recebe
 * `now` injetado (determinismo/testabilidade) — não chama Date() por dentro.
 * Retorna null se o rascunho não estiver pronto (nunca exporta rascunho meio). */
export function buildTraceableExport(
  draft: CodesignDraft,
  requiredFieldKeys: readonly string[],
  watchlist: readonly string[],
  reviewedByRole: string,
  now: string,
): TraceableExport | null {
  if (!readyForReview(draft, requiredFieldKeys, watchlist)) return null;
  if (!reviewedByRole.trim()) return null;
  // Campos não-nulos garantidos pela validação acima.
  return {
    patternId: draft.patternId,
    scope: draft.scope!,
    measureTarget: draft.measureTarget!,
    fields: { ...draft.fields },
    indicator: { ...draft.indicator! },
    ownerRole: draft.ownerRole!,
    deadline: draft.deadline!,
    acknowledgedAdverseEffects: [...draft.acknowledgedAdverseEffects],
    reviewedByRole,
    reviewedAt: now,
  };
}
