#!/usr/bin/env bun
// Gera/atualiza a projeção runtime MÍNIMA e curada do status de cada Skill
// a partir da fonte canônica documental (docs/ai/florencia-skills/registries/
// skill-registry.json — governança humana, NUNCA importada pelo bundle).
// A projeção só carrega skill_id + status (nunca path/category/allowed_modes
// etc. — essa é a curadoria: runtime não precisa do resto).
//
// Uso: bun run scripts/sync-skill-status-projection.ts
// Roda também dentro de bun test src (skill-status-projection-parity.test.ts)
// — divergência entre canônico e projeção quebra o gate.
//
// `generatedAt` é metadado manual (não regenerado automaticamente) — muda só
// quando alguém de fato revisita a projeção, para não gerar diff todo run.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const CANONICAL_PATH = resolve(ROOT, "docs/ai/florencia-skills/registries/skill-registry.json");
const PROJECTION_PATH = resolve(ROOT, "src/domain/florencia/contracts/skill-status-projection.json");

interface CanonicalSkillEntry {
  skill_id: string;
  status: string;
}
interface CanonicalRegistry {
  version: string;
  skills: CanonicalSkillEntry[];
}

const canonical = JSON.parse(readFileSync(CANONICAL_PATH, "utf-8")) as CanonicalRegistry;

let previousGeneratedAt = "2026-07-18";
try {
  const previous = JSON.parse(readFileSync(PROJECTION_PATH, "utf-8")) as { generatedAt?: string };
  if (previous.generatedAt) previousGeneratedAt = previous.generatedAt;
} catch {
  // primeira geração — usa o default acima
}

const projection = {
  $schema: "./skill-status-projection.schema.json",
  projection: "FlorêncIA Skill Status Projection",
  description:
    "Espelho runtime MÍNIMO e curado do status de cada Skill — skill_id + status, nada além disso. Nunca importa docs/ai/florencia-skills/ diretamente (governança documental, não runtime — ver CLAUDE.md §FlorêncIA). Fonte canônica: docs/ai/florencia-skills/registries/skill-registry.json. Regenerar com `bun run scripts/sync-skill-status-projection.ts` sempre que a fonte mudar — divergência quebra o gate (skill-status-projection-parity.test.ts).",
  sourceRegistry: "docs/ai/florencia-skills/registries/skill-registry.json",
  sourceVersion: canonical.version,
  generatedAt: previousGeneratedAt,
  skills: canonical.skills.map((s) => ({ skill_id: s.skill_id, status: s.status })),
};

const serialized = JSON.stringify(projection, null, 2) + "\n";

let current: string | null = null;
try {
  current = readFileSync(PROJECTION_PATH, "utf-8");
} catch {
  // ainda não existe — será criado
}

if (current !== serialized) {
  writeFileSync(PROJECTION_PATH, serialized, "utf-8");
  console.log(`sincronizado: ${PROJECTION_PATH} (${projection.skills.length} skills, sourceVersion=${projection.sourceVersion})`);
} else {
  console.log("✅ projeção já sincronizada");
}
