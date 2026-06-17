// Contrato do REGISTRO de packs. Garante que todo setor registrado é carregável e
// válido — do mesmo jeito que o PackProvider faz no boot. Se um novo pack drifta do
// schema, ou referencia papéis inexistentes, este teste pega antes do runtime.

import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import packSchema from "./enterprise/domain-pack.schema.json";
import {
  PACK_REGISTRY,
  PACK_CHOICES,
  REGISTERED_PACK_IDS,
  DEFAULT_PACK_ID,
  resolvePackBundle,
} from "./registry";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(packSchema as object);
const schemaId = (packSchema as { $id: string }).$id;
const validatePack = ajv.getSchema(schemaId)!;
const validateIndex = ajv.getSchema(`${schemaId}#/definitions/proprietaryIndex`)!;

function ok(validator: ReturnType<typeof ajv.getSchema>, data: unknown): boolean {
  const valid = Boolean(validator?.(data));
  if (!valid) console.log("Ajv errors:", JSON.stringify(validator?.errors, null, 2));
  return valid;
}

describe("registry — packs registrados", () => {
  test("o default está registrado", () => {
    expect(REGISTERED_PACK_IDS).toContain(DEFAULT_PACK_ID);
  });

  test("há pelo menos 2 setores (a opcionalidade multissetorial é real)", () => {
    expect(REGISTERED_PACK_IDS.length).toBeGreaterThanOrEqual(2);
  });

  for (const id of Object.keys(PACK_REGISTRY)) {
    const bundle = PACK_REGISTRY[id]!;

    test(`pack "${id}" é válido contra o schema`, () => {
      expect(ok(validatePack, bundle.pack)).toBe(true);
    });

    test(`pack "${id}" — packId do JSON casa com a chave do registro`, () => {
      expect(bundle.pack.packId).toBe(id);
    });

    test(`pack "${id}" — índice (quando presente) conforma ao contrato`, () => {
      if (bundle.index) expect(ok(validateIndex, bundle.index)).toBe(true);
    });

    test(`pack "${id}" — ids de navegação são únicos`, () => {
      const ids = bundle.pack.navigation.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    test(`pack "${id}" — papéis de navegação existem na lista de papéis`, () => {
      const roleIds = new Set(bundle.pack.roles.map((r) => r.id));
      for (const nav of bundle.pack.navigation) {
        if (nav.roles === ("all" as unknown)) continue;
        const navRoles = nav.roles as string[];
        for (const r of navRoles) {
          expect(roleIds.has(r)).toBe(true);
        }
      }
    });

    test(`pack "${id}" — demoPersonas e defaultRole referenciam papéis reais`, () => {
      const roleIds = new Set(bundle.pack.roles.map((r) => r.id));
      const personas = (bundle.pack.demoPersonas as string[] | undefined) ?? [];
      for (const p of personas) expect(roleIds.has(p)).toBe(true);
      const def = bundle.pack.defaultRole as string | undefined;
      if (def) expect(roleIds.has(def)).toBe(true);
    });
  }
});

describe("registry — resolução", () => {
  test("id desconhecido cai para o default", () => {
    expect(resolvePackBundle("inexistente").pack.packId).toBe(DEFAULT_PACK_ID);
  });

  test("PACK_CHOICES expõe um cartão por setor registrado", () => {
    expect(PACK_CHOICES.map((c) => c.id).sort()).toEqual([...REGISTERED_PACK_IDS].sort());
    for (const c of PACK_CHOICES) {
      expect(c.sectorLabel.length).toBeGreaterThan(0);
      expect(c.indexLabel.length).toBeGreaterThan(0);
      expect(c.defaultRole.length).toBeGreaterThan(0);
    }
  });
});
