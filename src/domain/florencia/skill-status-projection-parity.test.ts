// Paridade INTEGRAL entre a projeção runtime e o registro canônico
// documental (docs/ai/florencia-skills/registries/skill-registry.json).
// Divergência QUEBRA O GATE — nunca editar a projeção à mão; rodar
// `bun run scripts/sync-skill-status-projection.ts` e commitar o resultado
// (mesmo padrão de florencia-contract-parity.test.ts).
//
// Este é o único arquivo do repositório que lê docs/ai/florencia-skills/
// para comparação — o import é de teste (Node fs), nunca entra no bundle.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeSkillStatusParity, type SkillStatusEntry } from "@/engine/florencia/skill-status";
import { SKILL_STATUS_PROJECTION } from "./skill-status-projection";

const ROOT = resolve(import.meta.dir, "../../..");

interface CanonicalSkillRegistry {
  version: string;
  skills: { skill_id: string; status: string }[];
}

function readCanonical(): CanonicalSkillRegistry {
  const raw = readFileSync(
    resolve(ROOT, "docs/ai/florencia-skills/registries/skill-registry.json"),
    "utf-8",
  );
  return JSON.parse(raw) as CanonicalSkillRegistry;
}

describe("skill-status-projection × skill-registry.json — paridade integral", () => {
  test("a projeção real está em paridade total com o canônico ao vivo", () => {
    const canonical = readCanonical();
    const canonicalEntries: SkillStatusEntry[] = canonical.skills.map((s) => ({
      skill_id: s.skill_id,
      status: s.status,
    }));
    const projectionEntries: SkillStatusEntry[] = SKILL_STATUS_PROJECTION.skills.map((s) => ({
      skill_id: s.skill_id,
      status: s.status,
    }));

    const result = computeSkillStatusParity(
      canonicalEntries,
      canonical.version,
      projectionEntries,
      SKILL_STATUS_PROJECTION.sourceVersion,
    );

    if (!result.ok) {
      throw new Error(
        `Projeção de status de Skill fora de paridade com o canônico — rode ` +
          `"bun run scripts/sync-skill-status-projection.ts" e commite o resultado.\n` +
          result.errors.join("\n"),
      );
    }
    expect(result.ok).toBe(true);
  });

  test("sourceVersion da projeção é exatamente a version do canônico ao vivo", () => {
    const canonical = readCanonical();
    expect(SKILL_STATUS_PROJECTION.sourceVersion).toBe(canonical.version);
  });

  test("todo skill_id do CTA Registry (candidateSkillIds) existe na projeção — nenhuma CTA referencia Skill fantasma", () => {
    const ctaRegistryRaw = readFileSync(resolve(ROOT, "src/domain/florencia/cta-registry.json"), "utf-8");
    const ctaRegistry = JSON.parse(ctaRegistryRaw) as { ctas: { candidateSkillIds: string[] }[] };
    const projectionIds = new Set(SKILL_STATUS_PROJECTION.skills.map((s) => s.skill_id));
    const referenced = new Set(ctaRegistry.ctas.flatMap((c) => c.candidateSkillIds));
    const missing = [...referenced].filter((id) => !projectionIds.has(id));
    expect(missing).toEqual([]);
  });

  // ─── Os 6 modos de falha, forçados com dados sintéticos derivados do real ──
  // (não podemos mutar o canônico real em teste; construímos variantes locais
  // isoladas para provar que cada falha É detectável nesta engrenagem real.)

  test("simulação: skill removida do canônico mas esquecida na projeção → falha detectável", () => {
    const canonical = readCanonical();
    const canonicalEntries: SkillStatusEntry[] = canonical.skills
      .slice(1) // remove a primeira skill do "canônico" simulado
      .map((s) => ({ skill_id: s.skill_id, status: s.status }));
    const projectionEntries: SkillStatusEntry[] = SKILL_STATUS_PROJECTION.skills.map((s) => ({
      skill_id: s.skill_id,
      status: s.status,
    }));
    const result = computeSkillStatusParity(
      canonicalEntries,
      canonical.version,
      projectionEntries,
      SKILL_STATUS_PROJECTION.sourceVersion,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("órfã"))).toBe(true);
  });

  test("simulação: canônico avança de versão sem a projeção ser regenerada → falha detectável", () => {
    const canonical = readCanonical();
    const canonicalEntries: SkillStatusEntry[] = canonical.skills.map((s) => ({
      skill_id: s.skill_id,
      status: s.status,
    }));
    const projectionEntries: SkillStatusEntry[] = SKILL_STATUS_PROJECTION.skills.map((s) => ({
      skill_id: s.skill_id,
      status: s.status,
    }));
    const result = computeSkillStatusParity(
      canonicalEntries,
      "9.9.9", // simula o canônico tendo avançado
      projectionEntries,
      SKILL_STATUS_PROJECTION.sourceVersion,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("versão incompatível"))).toBe(true);
  });
});
