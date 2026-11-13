/**
 * Pedido de inclusão da prova local do PI-13 (PP.6): o pedido repetido entre processos.
 *
 * Puro: sem banco, sem rede e sem relógio. Cobre o que impede uma deriva do SCRIPT de prova de parecer defeito
 * do produto: um construtor único do pedido, o conteúdo completo e sem credenciais no estado local, e a
 * conferência campo a campo ANTES do retry (cada um dos 13 campos de negócio, alterado sozinho, é detectado).
 * A semântica de replay do produto (comparação com a linha mutável, fingerprint, waveId) não é tocada aqui.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ADD_ACCOUNTABILITY,
  R1_TEXT,
  buildPlanAdditionRequest,
  checkPlanAdditionBeforeRetry,
  diffPlanAddition,
  flattenPlanAddition,
  planAdditionBase,
  planAdditionContent,
  type PlanAdditionContent,
} from "./ivo-local-plan-request";

const REFS = { planId: "plan-0001", waveId: "wave-0001", cohortId: "cohort-0001" };
const SECRET_SESSION = "synthetic-access-token-must-not-persist";
const KEY = "11111111-1111-4111-8111-111111111111";
const ATTEMPT = { accessToken: SECRET_SESSION, requestId: KEY };

/** Os 13 campos de negócio do pedido (caminho achatado). Um campo novo no pedido do produto tem de entrar aqui. */
const FIELDS = [
  "planId",
  "waveId",
  "cohortId",
  "factorId",
  "title",
  "description",
  "effort",
  "accountability.ownerRoleLabel",
  "accountability.dueOn",
  "accountability.executionMetric.label",
  "accountability.executionMetric.baseline",
  "accountability.executionMetric.target",
  "accountability.executionMetric.unit",
] as const;

/** O estado local vai a disco como JSON e volta na fase read. */
const throughDisk = (value: unknown): unknown => JSON.parse(JSON.stringify(value));
const contentOfR1 = (): PlanAdditionContent => planAdditionContent(buildPlanAdditionRequest(REFS, ATTEMPT));

/** Simula a deriva de UM campo: texto ganha um sufixo, número soma 1. */
function drifted(content: PlanAdditionContent, path: string): PlanAdditionContent {
  const copy = structuredClone(content) as unknown as Record<string, unknown>;
  const keys = path.split(".");
  let node = copy;
  for (const key of keys.slice(0, -1)) node = node[key] as Record<string, unknown>;
  const last = keys[keys.length - 1]!;
  const current = node[last];
  node[last] = typeof current === "number" ? current + 1 : `${String(current)}!`;
  return copy as unknown as PlanAdditionContent;
}

describe("pedido de PP.6 — fonte única", () => {
  test("o pedido R1 traz todos os campos do pedido de inclusão e o conteúdo de negócio tem os 13 campos", () => {
    const request = buildPlanAdditionRequest(REFS, ATTEMPT);
    expect(Object.keys(request).sort()).toEqual(
      ["accessToken", "accountability", "cohortId", "description", "effort", "factorId", "planId", "requestId", "title", "waveId"].sort(),
    );
    expect(request).toMatchObject({ ...REFS, title: R1_TEXT.title, description: R1_TEXT.description, factorId: "bem_estar", effort: "baixo", accountability: ADD_ACCOUNTABILITY });
    expect(Object.keys(flattenPlanAddition(contentOfR1())).sort()).toEqual([...FIELDS].sort());
  });

  test("outra chave não muda o conteúdo (mesmo conteúdo com pedido distinto); trocar o texto muda só título e descrição", () => {
    const r1 = contentOfR1();
    const r2 = planAdditionContent(buildPlanAdditionRequest(REFS, { ...ATTEMPT, requestId: "22222222-2222-4222-8222-222222222222" }));
    expect(diffPlanAddition(r1, r2)).toEqual([]);
    const other = planAdditionContent(buildPlanAdditionRequest(REFS, ATTEMPT, { title: "Mural de reconhecimento", description: "Painel mensal." }));
    expect(diffPlanAddition(r1, other)).toEqual(["description", "title"]);
  });

  test("cada pedido recebe cópia própria do bloco §13: mexer num não vaza para o seguinte", () => {
    const first = planAdditionBase(REFS);
    first.accountability.executionMetric.target = 99;
    first.accountability.ownerRoleLabel = "Outra função";
    expect(planAdditionBase(REFS).accountability).toEqual(ADD_ACCOUNTABILITY);
    expect(ADD_ACCOUNTABILITY.executionMetric.target).toBe(2);
  });

  test("o prazo do §13 é uma data civil AAAA-MM-DD válida (o contrato que o servidor exige)", () => {
    expect(ADD_ACCOUNTABILITY.dueOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${ADD_ACCOUNTABILITY.dueOn}T00:00:00Z`).toISOString().slice(0, 10)).toBe(ADD_ACCOUNTABILITY.dueOn);
  });
});

describe("estado local da prova — sem credenciais", () => {
  test("o conteúdo gravado não leva sessão, chave de idempotência nem nome de credencial", () => {
    const content = contentOfR1();
    const text = JSON.stringify(content);
    expect(text).not.toContain(SECRET_SESSION);
    expect(text).not.toContain(KEY);
    expect(text).not.toMatch(/accessToken|requestId/);
    for (const path of Object.keys(flattenPlanAddition(content))) {
      expect(path).not.toMatch(/token|secret|passw|session|cookie|authoriz|api[-_]?key|service[-_]?role|e-?mail|credential|jwt|bearer/i);
    }
  });

  test("um campo com nome de credencial que o pedido venha a ganhar é recusado na hora de gravar o estado", () => {
    const request = buildPlanAdditionRequest(REFS, ATTEMPT);
    for (const field of ["serviceRoleKey", "apiKey", "userEmail", "sessionId", "authorization", "refreshToken", "password"]) {
      expect(() => planAdditionContent({ ...request, [field]: "valor" } as never)).toThrow(/credencial/);
    }
    expect(() => planAdditionContent(request)).not.toThrow();
  });
});

describe("conferência campo a campo antes do retry", () => {
  test("sem deriva a conferência passa, depois de ir a disco e voltar (13 campos)", () => {
    const gate = checkPlanAdditionBeforeRetry(throughDisk(contentOfR1()), contentOfR1());
    expect(gate).toEqual({ ok: true, fields: 13 });
  });

  for (const path of FIELDS) {
    test(`deriva só em ${path} (gravação × repetição): detectada, nomeia o campo e nada é reenviado`, () => {
      const gate = checkPlanAdditionBeforeRetry(throughDisk(contentOfR1()), drifted(contentOfR1(), path));
      expect(gate.ok).toBe(false);
      if (gate.ok) return;
      expect(gate.diverged).toEqual([path]);
      expect(gate.message).toContain(path);
      expect(gate.message).toContain("deriva do script de prova");
      expect(gate.message).toContain("não é request_conflict do produto");
      expect(gate.message).toContain("nada foi reenviado");
    });
  }

  test("deriva no estado em disco (o lado gravado) também é detectada", () => {
    const onDisk = throughDisk(drifted(contentOfR1(), "accountability.dueOn"));
    const gate = checkPlanAdditionBeforeRetry(onDisk, contentOfR1());
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.diverged).toEqual(["accountability.dueOn"]);
  });

  test("várias derivas são todas nomeadas, em ordem alfabética", () => {
    const rebuilt = drifted(drifted(contentOfR1(), "title"), "accountability.executionMetric.target");
    const gate = checkPlanAdditionBeforeRetry(throughDisk(contentOfR1()), rebuilt);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.diverged).toEqual(["accountability.executionMetric.target", "title"]);
  });

  test("a igualdade é estrita: espaço no fim do texto e número gravado como texto são deriva (o produto os normalizaria)", () => {
    const spaced = { ...contentOfR1(), title: `${R1_TEXT.title} ` };
    const spacedGate = checkPlanAdditionBeforeRetry(throughDisk(contentOfR1()), spaced);
    expect(spacedGate.ok === false && spacedGate.diverged).toEqual(["title"]);

    const asText = structuredClone(contentOfR1()) as unknown as { accountability: { executionMetric: { baseline: unknown } } };
    asText.accountability.executionMetric.baseline = "0";
    const typeGate = checkPlanAdditionBeforeRetry(throughDisk(contentOfR1()), asText as unknown as PlanAdditionContent);
    expect(typeGate.ok === false && typeGate.diverged).toEqual(["accountability.executionMetric.baseline"]);
  });

  test("campo que existe só de um lado é deriva (campo novo no pedido ou campo perdido no estado)", () => {
    const missing = throughDisk(contentOfR1()) as { accountability: { executionMetric: Record<string, unknown> } };
    delete missing.accountability.executionMetric.unit;
    const missingGate = checkPlanAdditionBeforeRetry(missing, contentOfR1());
    expect(missingGate.ok === false && missingGate.diverged).toEqual(["accountability.executionMetric.unit"]);

    const extra = { ...(throughDisk(contentOfR1()) as object), prioridade: "alta" };
    const extraGate = checkPlanAdditionBeforeRetry(extra, contentOfR1());
    expect(extraGate.ok === false && extraGate.diverged).toEqual(["prioridade"]);
  });

  test("estado sem o pedido gravado (estado antigo, nulo ou de outro tipo) não deixa reenviar e explica o motivo", () => {
    for (const persisted of [undefined, null, "texto", 42, []]) {
      const gate = checkPlanAdditionBeforeRetry(persisted, contentOfR1());
      expect(gate.ok).toBe(false);
      if (gate.ok) continue;
      expect(gate.message).toContain("deriva do script de prova");
      expect(gate.message).toContain("estado local");
      expect(gate.message).toContain("nada foi reenviado");
    }
  });
});

describe("o runner usa o módulo (nada de pedido digitado à mão entre as fases)", () => {
  const runner = readFileSync(join(import.meta.dir, "ivo-local-plan-proof.ts"), "utf8");

  test("título, descrição e indicador do pedido R1 só existem no módulo compartilhado", () => {
    for (const literal of [R1_TEXT.title, R1_TEXT.description, ADD_ACCOUNTABILITY.executionMetric.label]) {
      expect(runner).not.toContain(literal);
    }
    expect(runner).toContain('from "./ivo-local-plan-request"');
  });

  test("as duas fases constroem o pedido do módulo, a fase write grava o conteúdo e o retry só vem depois da conferência", () => {
    expect(runner.match(/buildPlanAdditionRequest\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(runner).toContain("addRequest: planAdditionContent(requestD)");
    expect(runner).toContain("checkPlanAdditionBeforeRetry(state.addRequest");
    expect(runner).toMatch(/gate\.ok\s*\?\s*await comp\.addFibtActionToPlan\(replayRequest\)\s*:\s*null/);
  });
});
