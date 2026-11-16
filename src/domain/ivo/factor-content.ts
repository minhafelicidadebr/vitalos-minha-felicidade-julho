// Catálogo curatorial fator FIB-T → conteúdo educativo (R7).
//
// Fail-closed no carregamento (mesma disciplina de dimension-mappings.ts e
// methodology-governance.ts). Regras:
//   · APROVADO exige responsável, data, ≥ 1 código do registro de evidências
//     existente e ≥ 1 safe_claim — o conteúdo só afirma o que o registro permite;
//   · TESTE não pode citar evidência nem safe_claim (não carrega afirmação
//     científica) e o título precisa começar com "[TESTE]";
//   · o vínculo é por `factor_id` do manifesto FIB-T e NÃO cria mapeamento para
//     dimensão IVO nem altera escore.
import raw from "./factor-content.json";
import learningPatterns from "@/domain/evidence/learning-patterns.json";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { validateQ2LearningCuration, Q2_LEARNING_REGISTRIES, type LearningRegistries, type Q2LearningCuration } from "./q2-learning-curation";

export type FactorContentStatus = "PROPOSTO" | "APROVADO" | "TESTE";

export interface FactorContent {
  id: string;
  factorId: string;
  status: FactorContentStatus;
  version: string;
  title: string;
  objective: string;
  audience: string;
  format: string;
  estimatedMinutes: number;
  evidenceCodes: readonly string[];
  safeClaimIds: readonly string[];
  owner: string | null;
  approvedAt: string | null;
  body: readonly string[];
  curation?: Q2LearningCuration;
}

interface RawEntry {
  id: string;
  factor_id: string;
  status: string;
  version: string;
  title: string;
  objective: string;
  audience: string;
  format: string;
  estimated_minutes: number;
  evidence_codes: string[];
  safe_claim_ids: string[];
  owner: string | null;
  approved_at: string | null;
  body: string[];
  curation?: Q2LearningCuration;
}
interface RawCatalog {
  registry_version: string;
  description: string;
  curation: { status: string; decision: string };
  entries: RawEntry[];
}

export class FactorContentError extends Error {
  constructor(message: string) {
    super(`[ivo-factor-content] ${message}`);
    this.name = "FactorContentError";
  }
}

const STATUSES: readonly FactorContentStatus[] = ["PROPOSTO", "APROVADO", "TESTE"];
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateFactorContent(catalog: RawCatalog, registries: LearningRegistries = Q2_LEARNING_REGISTRIES): FactorContent[] {
  const factors = new Set(getFibtManifest().factors.map((f) => f.id));
  const formats = new Set((learningPatterns as unknown as { patterns: Array<{ pattern_id: string }> }).patterns.map((p) => p.pattern_id));
  const ids = new Set<string>();
  return catalog.entries.map((e) => {
    if (!nonEmpty(e.id) || ids.has(e.id)) throw new FactorContentError(`id ausente ou duplicado: ${e.id}`);
    ids.add(e.id);
    if (!factors.has(e.factor_id)) throw new FactorContentError(`${e.id}: fator ${e.factor_id} não existe no manifesto FIB-T`);
    if (!(STATUSES as readonly string[]).includes(e.status)) throw new FactorContentError(`${e.id}: status inválido ${e.status}`);
    for (const field of ["version", "title", "objective", "audience"] as const) {
      if (!nonEmpty(e[field])) throw new FactorContentError(`${e.id}: ${field} ausente`);
    }
    if (!formats.has(e.format)) throw new FactorContentError(`${e.id}: formato ${e.format} não é um padrão de aprendizagem registrado`);
    if (!Number.isFinite(e.estimated_minutes) || e.estimated_minutes < 1 || e.estimated_minutes > 60) throw new FactorContentError(`${e.id}: duração inválida`);
    if (e.body.filter(nonEmpty).length === 0) throw new FactorContentError(`${e.id}: corpo vazio`);

    if (e.status === "APROVADO") {
      if (!nonEmpty(e.owner) || !e.approved_at || !ISO_DATE.test(e.approved_at)) throw new FactorContentError(`${e.id}: aprovado exige responsável e data`);
      if (e.evidence_codes.length === 0 || e.safe_claim_ids.length === 0) throw new FactorContentError(`${e.id}: aprovado exige evidência e safe_claim`);
      for (const code of e.evidence_codes) {
        if (!registries.evidence.studies.some((study) => study.study_id === code || study.aliases.includes(code))) throw new FactorContentError(`${e.id}: código ${code} não existe no registro de evidências`);
      }
    } else {
      if (e.owner !== null || e.approved_at !== null) throw new FactorContentError(`${e.id}: só conteúdo APROVADO carrega responsável/data`);
    }
    // Convenção verificável no cliente: só conteúdo de TESTE usa o prefixo TESTE- no id.
    if ((e.status === "TESTE") !== e.id.startsWith("TESTE-")) throw new FactorContentError(`${e.id}: o prefixo "TESTE-" do id é exclusivo de conteúdo de teste`);
    if (e.status === "TESTE") {
      if (!e.title.startsWith("[TESTE]")) throw new FactorContentError(`${e.id}: conteúdo de teste precisa de título '[TESTE]'`);
      if (e.evidence_codes.length > 0 || e.safe_claim_ids.length > 0) throw new FactorContentError(`${e.id}: conteúdo de teste não cita evidência nem safe_claim`);
      if (e.curation) throw new FactorContentError(`${e.id}: TESTE não recebe revisão de produção`);
    }
    const curation = e.status === "TESTE" ? undefined : validateQ2LearningCuration({
      status: e.status as "PROPOSTO" | "APROVADO", version: e.version,
      evidenceCodes: e.evidence_codes, safeClaimIds: e.safe_claim_ids, curation: e.curation,
    }, registries);
    if (e.status === "APROVADO" && (e.owner !== curation?.approval?.reviewer || e.approved_at !== curation?.approval?.approvedOn))
      throw new FactorContentError(`${e.id}: responsável/data divergem da revisão D10`);
    if (e.status === "APROVADO") for (const id of e.safe_claim_ids) {
      const claim = registries.claims.claims.find((entry) => entry.claim_id === id)!;
      if (!e.body.some((paragraph) => paragraph.includes(claim.safe_claim)) ||
        (claim.caveat && !e.body.some((paragraph) => paragraph.includes(claim.caveat!))))
        throw new FactorContentError(`${e.id}: corpo precisa apresentar safe_claim e ressalva registrados`);
    }
    return Object.freeze({
      id: e.id,
      factorId: e.factor_id,
      status: e.status as FactorContentStatus,
      version: e.version,
      title: e.title,
      objective: e.objective,
      audience: e.audience,
      format: e.format,
      estimatedMinutes: e.estimated_minutes,
      evidenceCodes: Object.freeze([...e.evidence_codes]),
      safeClaimIds: Object.freeze([...e.safe_claim_ids]),
      owner: e.owner,
      approvedAt: e.approved_at,
      body: Object.freeze([...e.body]),
      ...(curation ? { curation } : {}),
    });
  });
}

const ENTRIES = Object.freeze(validateFactorContent(raw as unknown as RawCatalog));

export function getFactorContentCatalog(): readonly FactorContent[] {
  return ENTRIES;
}

export function getFactorContentMeta(): { version: string; curationStatus: string; curationDecision: string } {
  const c = raw as unknown as RawCatalog;
  return { version: c.registry_version, curationStatus: c.curation.status, curationDecision: c.curation.decision };
}

export function getFactorContentById(id: string): FactorContent | undefined {
  return ENTRIES.find((e) => e.id === id);
}

// Referência estruturada (encode/parse): módulo puro e client-safe em src/lib/ivo/content-ref.ts.
export { encodeContentRef, parseContentRef } from "@/lib/ivo/content-ref";
