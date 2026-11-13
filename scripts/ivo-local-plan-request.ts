// ═══════════════════════════════════════════════════════════════════════════
// PEDIDO DE INCLUSÃO DA PROVA LOCAL DO PI-13 (PP.6) — fonte única, módulo PURO
// ═══════════════════════════════════════════════════════════════════════════
//
// A prova de idempotência roda em dois processos: a fase `write` inclui a ação e a fase `read` repete o
// MESMO pedido, com a mesma chave. O replay do produto compara o pedido com a linha gravada (título,
// descrição, esforço, coorte, fator e o bloco §13), então qualquer diferença entre o pedido gravado e o
// repetido vira `request_conflict`, a mesma resposta que o produto dá a "pedido diferente com a mesma
// chave". Sem trava, uma deriva do SCRIPT pareceria defeito do produto.
//
// Duas travas:
//   1. um único construtor do pedido (`buildPlanAdditionRequest`), usado pelas duas fases: nenhum campo é
//      digitado à mão duas vezes;
//   2. o conteúdo do pedido (`planAdditionContent`) vai para o estado local da prova e é conferido CAMPO A
//      CAMPO contra o que a fase `read` reconstrói (`checkPlanAdditionBeforeRetry`) ANTES do retry. Se algo
//      diferir, a prova falha como "deriva do script de prova", com o nome do campo, e nada é reenviado.
//
// O que NUNCA entra no estado: sessão (`accessToken`), chaves de API, e-mail. A chave de idempotência
// (`requestId`, UUID aleatório sem privilégio) fica fora do conteúdo: o runner a guarda à parte (`requestD`),
// como antes. O módulo não lê arquivo, não abre rede e não importa código de servidor (só tipos).
//
// Não muda a semântica de replay do produto: a comparação com a linha mutável, o fingerprint e o `waveId`
// seguem decisões abertas (ivo-roadmap.md §8, itens 16, 17 e 20). Um PP.6 verde não as resolve.
import type { AddActionToPlanRequest } from "../src/lib/ivo/fibt-plan-composition.server";

/** Destino do pedido: ids da demonstração (vêm do manifesto e do estado); não são segredo. */
export interface PlanAdditionRefs {
  planId: string;
  waveId: string;
  cohortId: string;
}

/** Sessão e chave de UMA tentativa de envio. Nunca entram no estado da prova. */
export interface PlanAdditionAttempt {
  accessToken: string;
  requestId: string;
}

/** Tudo o que compõe o pedido de inclusão, menos a sessão e a chave de idempotência. */
export type PlanAdditionContent = Omit<AddActionToPlanRequest, "accessToken" | "requestId">;

/** Campos que todo pedido da prova compartilha: tudo, menos título, descrição, sessão e chave. */
export type PlanAdditionBase = Omit<PlanAdditionContent, "title" | "description" | "accountability"> & {
  accountability: NonNullable<PlanAdditionContent["accountability"]>;
};

/** Bloco §13 do pedido R1 (responsável, prazo e indicador de execução). A identidade do replay o inclui. */
export const ADD_ACCOUNTABILITY: PlanAdditionBase["accountability"] = {
  ownerRoleLabel: "Gestão de pessoas",
  dueOn: "2026-12-15",
  executionMetric: { label: "Oficinas realizadas", baseline: 0, target: 2, unit: "oficinas" },
};

/** Texto do pedido R1: o que PP.6 grava na fase `write` e repete na fase `read`. */
export const R1_TEXT = { title: "Oficina de pausas ativas", description: "Duas oficinas curtas por mês." } as const;

/** Campos comuns a todos os pedidos de inclusão da prova (cópia nova a cada chamada). */
export function planAdditionBase(refs: PlanAdditionRefs): PlanAdditionBase {
  return { ...refs, factorId: "bem_estar", effort: "baixo", accountability: structuredClone(ADD_ACCOUNTABILITY) };
}

/** Pedido completo de inclusão. Sem `overrides` é o pedido R1; os demais pedidos da prova trocam só o que difere. */
export function buildPlanAdditionRequest(
  refs: PlanAdditionRefs,
  attempt: PlanAdditionAttempt,
  overrides: Partial<PlanAdditionContent> = {},
): AddActionToPlanRequest {
  return { ...planAdditionBase(refs), ...R1_TEXT, ...overrides, accessToken: attempt.accessToken, requestId: attempt.requestId };
}

/** Nome de campo que indica credencial. Barra, na escrita do estado, qualquer campo futuro desse tipo. */
const CREDENTIAL_NAME = /token|secret|passw|session|cookie|authoriz|api[-_]?key|service[-_]?role|e-?mail|credential|jwt|bearer/i;

type Leaf = string | number | boolean | null;

/** Achata o pedido em `caminho.do.campo` → valor. Só objetos simples; `undefined` conta como ausente. */
export function flattenPlanAddition(value: unknown, prefix = "", into: Record<string, Leaf> = {}): Record<string, Leaf> {
  if (value === undefined) return into;
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value)) flattenPlanAddition(inner, prefix ? `${prefix}.${key}` : key, into);
    return into;
  }
  into[prefix] = Array.isArray(value) ? JSON.stringify(value) : (value as Leaf);
  return into;
}

/**
 * Conteúdo de negócio do pedido (sem sessão e sem chave): é o que vai para o estado local da prova.
 * Recusa, ao gravar, qualquer campo com nome de credencial, inclusive um que o pedido venha a ganhar.
 */
export function planAdditionContent(request: AddActionToPlanRequest): PlanAdditionContent {
  const { accessToken: _session, requestId: _key, ...content } = request;
  const suspicious = Object.keys(flattenPlanAddition(content)).filter((path) => CREDENTIAL_NAME.test(path));
  if (suspicious.length > 0) throw new Error(`campo com nome de credencial no pedido da prova: ${suspicious.join(", ")}`);
  return structuredClone(content);
}

/** Caminhos cujo valor difere entre dois conteúdos. Igualdade estrita (tipo incluído); ausente de um lado é diferença. */
export function diffPlanAddition(persisted: unknown, rebuilt: unknown): string[] {
  const a = flattenPlanAddition(persisted);
  const b = flattenPlanAddition(rebuilt);
  const paths = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  return paths.filter((path) => !(path in a) || !(path in b) || a[path] !== b[path]);
}

export type PlanAdditionGate = { ok: true; fields: number } | { ok: false; diverged: string[]; message: string };

/**
 * Conferência ANTES do retry de PP.6: o conteúdo gravado no estado tem de ser igual ao que a fase `read`
 * reconstrói do módulo. Se não for, é deriva do script de prova, não `request_conflict` do produto.
 */
export function checkPlanAdditionBeforeRetry(persisted: unknown, rebuilt: PlanAdditionContent): PlanAdditionGate {
  if (persisted === null || typeof persisted !== "object" || Array.isArray(persisted)) {
    return {
      ok: false,
      diverged: [],
      message: "deriva do script de prova: o estado local não traz o pedido gravado pela fase write (estado antigo?). Rode a fase write antes do retry; nada foi reenviado",
    };
  }
  const diverged = diffPlanAddition(persisted, rebuilt);
  if (diverged.length > 0) {
    return {
      ok: false,
      diverged,
      message: `deriva do script de prova (não é request_conflict do produto): o pedido do retry difere do gravado em ${diverged.join(", ")}; nada foi reenviado`,
    };
  }
  return { ok: true, fields: Object.keys(flattenPlanAddition(rebuilt)).length };
}
