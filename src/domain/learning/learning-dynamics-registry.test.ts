// Integridade do Learning Dynamics Registry (Onda LDX-1) — o mesmo padrão de
// registry.test.ts (Ajv + invariantes de negócio). Impede exatamente as 5
// falhas que docs/learning/REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_V1.md §1
// existe para prevenir: documentação≠runtime, engine≠conteúdo demo, IA
// fantasma, funcionalidade fantasma, duplicação de superfície.

import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./learning-dynamics-registry.schema.json";
import { deriveProductStatus } from "@/engine/learning/learning-dynamics-resolution";
import registryJson from "./learning-dynamics-registry.json";
import {
  getLearningDynamicsRegistry,
  ROADMAP_RUNTIME_STATUSES,
  type CanonicalLearningDynamic,
} from "./learning-dynamics-registry";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema as object);

describe("learning-dynamics-registry — paridade de schema", () => {
  test("o JSON completo é válido contra o schema", () => {
    const valid = validate(registryJson);
    if (!valid) console.log("Ajv errors:", JSON.stringify(validate.errors, null, 2));
    expect(valid).toBe(true);
  });
});

describe("learning-dynamics-registry — invariantes de catálogo", () => {
  const dynamics = getLearningDynamicsRegistry();

  test("existem exatamente as 14 dinâmicas do mapa canônico (LDX-1)", () => {
    expect(dynamics.length).toBe(14);
  });

  test("IDs são únicos e seguem o padrão LD-NNN", () => {
    const ids = dynamics.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^LD-\d{3}$/);
  });

  test("slugs são únicos", () => {
    const slugs = dynamics.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("toda versão é semver válido", () => {
    for (const d of dynamics) expect(d.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("toda dinâmica declara eixo M.E.T.E., risco e os 6 estados de governança", () => {
    for (const d of dynamics) {
      expect(d.meteAxes.length).toBeGreaterThan(0);
      expect(d.riskTier).toBeTruthy();
      expect(d.runtimeStatus).toBeTruthy();
      expect(d.contentStatus).toBeTruthy();
      expect(d.persistenceStatus).toBeTruthy();
      expect(d.aiMode).toBeTruthy();
      expect(d.publicExposure).toBeTruthy();
    }
  });

  test("dinâmicas com runtimeStatus REAL/PARCIAL/DEMO/PLANNED têm rota-alvo mapeada", () => {
    // PROPOSED e R_AND_D podem legitimamente não ter superfície ainda — são
    // ideias sem planejamento técnico aprovado (nunca aparecem em rota
    // nenhuma, então "rota vazia" não é funcionalidade fantasma).
    const mustHaveRoute = dynamics.filter((d) => !["PROPOSED", "R_AND_D"].includes(d.runtimeStatus));
    for (const d of mustHaveRoute) {
      expect(d.enrichesRoutes.length, `${d.id} sem rota`).toBeGreaterThan(0);
    }
  });

  test("dinâmicas com runtimeStatus REAL/PARCIAL/DEMO têm papel autorizado mapeado", () => {
    // PLANNED/PROPOSED/R_AND_D podem não ter papel fechado ainda — quem vai
    // usar só se decide perto da implementação real.
    const mustHaveRole = dynamics.filter((d) => ["REAL", "PARCIAL", "DEMO"].includes(d.runtimeStatus));
    for (const d of mustHaveRole) {
      expect(d.authorizedRoles.length, `${d.id} sem papel`).toBeGreaterThan(0);
    }
  });

  test("nenhuma dinâmica usa GENERATIVE_GATED nesta onda (LDX-1 não integra LLM/RAG)", () => {
    for (const d of dynamics) expect(d.aiMode).not.toBe("GENERATIVE_GATED");
  });

  test("PLANNED/PROPOSED/R_AND_D/AUSENTE/DEPRECATED nunca têm exposição operacional", () => {
    for (const d of dynamics) {
      if (ROADMAP_RUNTIME_STATUSES.includes(d.runtimeStatus)) {
        expect(["PREPARATION", "HIDDEN", "R_AND_D"]).toContain(d.publicExposure);
      }
    }
  });

  test("dinâmicas REAL/PARCIAL/DEMO nunca têm exposição HIDDEN ou R_AND_D (sem funcionalidade escondida por engano)", () => {
    for (const d of dynamics) {
      if (["REAL", "PARCIAL", "DEMO"].includes(d.runtimeStatus)) {
        expect(["HIDDEN", "R_AND_D"]).not.toContain(d.publicExposure);
      }
    }
  });

  test("todo runtimeEvidence declarado aponta para um arquivo que existe no repositório", () => {
    const missing: string[] = [];
    for (const d of dynamics) {
      for (const relPath of d.runtimeEvidence) {
        // Só o caminho de arquivo, sem sufixo descritivo entre parênteses.
        const cleanPath = relPath.split(" (")[0]!.trim();
        if (!existsSync(join(REPO_ROOT, cleanPath))) {
          missing.push(`${d.id}: ${cleanPath}`);
        }
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });

  test("toda dinâmica com evidenceRefs referencia claim/estudo do registro congelado (formato válido)", () => {
    for (const d of dynamics) {
      for (const ref of d.evidenceRefs) {
        expect(ref).toMatch(/^(CLAIM-|[A-Z]{3}-\d{3}$)/);
      }
    }
  });

  test("nenhuma dinâmica REAL declara persistenceStatus incompatível (REAL exige persistência resolvida, não NOT_APPLICABLE de fato)", () => {
    const real = dynamics.filter((d): d is CanonicalLearningDynamic => d.runtimeStatus === "REAL");
    for (const d of real) {
      expect(d.persistenceStatus).not.toBe("NOT_APPLICABLE");
    }
  });
});

describe("Truth Layer (Onda 5 — semente) × registro canônico", () => {
  const dynamics = getLearningDynamicsRegistry();
  test("LD-001 (FlorêncIA) deriva DEMO pelo elo mais fraco — PARCIAL × conteúdo DEMO", () => {
    const ld1 = dynamics.find((d) => d.id === "LD-001")!;
    expect(deriveProductStatus(ld1)).toBe("DEMO");
  });

  test("nenhuma dinâmica do registro deriva classificação acima do próprio runtime (anti-overclaim estrutural)", () => {
    for (const d of dynamics) {
      const derived = deriveProductStatus(d);
      if (derived === "REAL") expect(d.runtimeStatus).toBe("REAL");
      if (derived === "PARCIAL") expect(["REAL", "PARCIAL"]).toContain(d.runtimeStatus);
    }
  });
});
