// Skill Status — enum canônico do ciclo de vida de uma Skill da FlorêncIA e
// os predicados puros de disponibilidade/validade. Engine puro: não importa
// nenhum JSON nem lê docs/ (Engine ≠ Domínio) — os dados concretos (mapa em
// runtime, registro canônico em teste) entram sempre por parâmetro.
//
// Duas checagens distintas, propositalmente separadas:
// - validateSkillStatusEntries: AUTO-checagem estrutural (duplicata, status
//   desconhecido, id vazio) — roda em runtime (defesa em profundidade) E em
//   teste, sem precisar do registro documental.
// - computeSkillStatusParity: checagem CRUZADA contra o canônico (skill
//   ausente/órfã, status divergente, versão incompatível) — só roda em
//   teste/build (o canônico em docs/ nunca é importado pelo bundle).

export type SkillLifecycleStatus = "REAL" | "PARCIAL" | "ROADMAP";

export interface SkillStatusEntry {
  readonly skill_id: string;
  readonly status: string;
}

const KNOWN_STATUSES: ReadonlySet<string> = new Set<SkillLifecycleStatus>([
  "REAL",
  "PARCIAL",
  "ROADMAP",
]);

const AVAILABLE_STATUSES: ReadonlySet<string> = new Set<SkillLifecycleStatus>(["REAL", "PARCIAL"]);

export function isKnownSkillStatus(status: string): status is SkillLifecycleStatus {
  return KNOWN_STATUSES.has(status);
}

/**
 * Único predicado de disponibilidade de Skill do sistema — fail-closed:
 * status ausente, desconhecido (fora do enum) ou ROADMAP NUNCA autoriza.
 * Nunca eleva. Toda superfície que filtra Skills passa por aqui, nunca por
 * um bloqueio duplicado local.
 */
export function isSkillAvailable(status: string | undefined): boolean {
  return status !== undefined && AVAILABLE_STATUSES.has(status);
}

export interface SkillStatusValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Auto-checagem estrutural de uma lista de entradas — sem depender do
 * canônico. Usada tanto pelo resolver de runtime (defesa em profundidade,
 * nunca confia cegamente no JSON) quanto pelo teste de paridade.
 */
export function validateSkillStatusEntries(entries: readonly SkillStatusEntry[]): SkillStatusValidation {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry.skill_id.trim()) {
      errors.push("entrada com skill_id vazio");
      continue;
    }
    if (seen.has(entry.skill_id)) {
      errors.push(`skill_id duplicado: ${entry.skill_id}`);
      continue;
    }
    seen.add(entry.skill_id);
    if (!isKnownSkillStatus(entry.status)) {
      errors.push(`${entry.skill_id}: status desconhecido "${entry.status}"`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export interface SkillStatusParityReport {
  ok: boolean;
  errors: string[];
}

/**
 * Paridade INTEGRAL projeção × canônico — só chamável em teste/build (exige
 * os dados do canônico, que o runtime nunca importa). Cobre, cada um
 * isoladamente reportado: skill ausente da projeção, skill órfã na
 * projeção, status divergente, id duplicado (dos dois lados), status
 * desconhecido, versão da fonte incompatível com o canônico ao vivo.
 */
export function computeSkillStatusParity(
  canonical: readonly SkillStatusEntry[],
  canonicalVersion: string,
  projection: readonly SkillStatusEntry[],
  projectionSourceVersion: string,
): SkillStatusParityReport {
  const errors: string[] = [];

  const canonicalSelfCheck = validateSkillStatusEntries(canonical);
  for (const e of canonicalSelfCheck.errors) errors.push(`canônico: ${e}`);

  const projectionSelfCheck = validateSkillStatusEntries(projection);
  for (const e of projectionSelfCheck.errors) errors.push(`projeção: ${e}`);

  if (projectionSourceVersion !== canonicalVersion) {
    errors.push(
      `versão incompatível: projeção aponta sourceVersion "${projectionSourceVersion}", canônico ao vivo está em "${canonicalVersion}" — regenerar a projeção`,
    );
  }

  const canonicalById = new Map(canonical.map((e) => [e.skill_id, e.status]));
  const projectionById = new Map(projection.map((e) => [e.skill_id, e.status]));

  for (const [id, status] of canonicalById) {
    if (!projectionById.has(id)) {
      errors.push(`skill ausente da projeção: ${id}`);
      continue;
    }
    const projectedStatus = projectionById.get(id);
    if (projectedStatus !== status) {
      errors.push(`status divergente em ${id}: canônico="${status}" projeção="${projectedStatus}"`);
    }
  }

  for (const id of projectionById.keys()) {
    if (!canonicalById.has(id)) {
      errors.push(`skill órfã na projeção (não existe mais no canônico): ${id}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
