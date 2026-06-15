// Contrato do Domain Pack — valida os packs REAIS contra o schema JSON, do mesmo
// jeito que o PackProvider faz no boot. Protege a fronteira Engine↔Domínio: se um
// pack (ou um framework de setor novo) drifta do contrato, este teste pega antes
// de chegar ao runtime. Também prova que `navGroups`/`group` e o iev-framework
// (2º setor) conformam ao mesmo schema.

import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import packSchema from "../../domain/packs/enterprise/domain-pack.schema.json";
import enterprisePack from "../../domain/packs/enterprise/enterprise.pack.json";
import ivoFramework from "../../domain/packs/enterprise/ivo-framework.json";
import ievFramework from "../../domain/packs/school/iev-framework.json";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(packSchema as object);

const schemaId = (packSchema as { $id: string }).$id;
const validatePack = ajv.getSchema(schemaId);
const validateIndex = ajv.getSchema(`${schemaId}#/definitions/proprietaryIndex`);

function check(validator: ReturnType<typeof ajv.getSchema>, data: unknown): boolean {
  const ok = Boolean(validator?.(data));
  if (!ok) console.log("Ajv errors:", JSON.stringify(validator?.errors, null, 2));
  return ok;
}

// ─── Compilação do schema ─────────────────────────────────────────────────────

describe("contrato — schema compila", () => {
  test("validadores do pack e do índice existem", () => {
    expect(typeof validatePack).toBe("function");
    expect(typeof validateIndex).toBe("function");
  });
});

// ─── Pack enterprise (com navGroups + group) ──────────────────────────────────

describe("contrato — enterprise.pack.json", () => {
  test("o pack oficial é válido contra o schema", () => {
    expect(check(validatePack, enterprisePack)).toBe(true);
  });

  test("a navegação agrupada (navGroups + group) não quebra o contrato", () => {
    // navGroups é propriedade extra (permitida); group é enum validado no schema.
    expect((enterprisePack as { navGroups?: unknown }).navGroups).toBeDefined();
    expect(check(validatePack, enterprisePack)).toBe(true);
  });
});

// ─── Frameworks de índice (enterprise + escola) ───────────────────────────────

describe("contrato — proprietaryIndex (multissetorial)", () => {
  test("ivo-framework (empresa) conforma ao contrato de índice", () => {
    expect(check(validateIndex, ivoFramework)).toBe(true);
  });

  test("iev-framework (escola) conforma ao MESMO contrato de índice", () => {
    expect(check(validateIndex, ievFramework)).toBe(true);
  });

  test("os pesos dos pilares do iev somam ~1.0", () => {
    const total = (ievFramework as { lenses: Array<{ pillars: Array<{ weight: number }> }> }).lenses
      .flatMap((l) => l.pillars)
      .reduce((s, p) => s + p.weight, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });
});

// ─── O validador realmente rejeita (não é no-op) ──────────────────────────────

describe("contrato — rejeição", () => {
  test("pack vazio → inválido (faltam campos obrigatórios)", () => {
    expect(Boolean(validatePack?.({}))).toBe(false);
  });

  test("índice sem lentes/maturidade → inválido", () => {
    expect(Boolean(validateIndex?.({ id: "x", name: "x", version: "1" }))).toBe(false);
  });
});
