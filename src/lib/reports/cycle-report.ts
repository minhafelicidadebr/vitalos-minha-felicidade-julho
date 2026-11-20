// Relatório Global · ciclo rastreável sintético (puro, sem I/O).
//
// Um cenário empresarial FICTÍCIO percorre o Q2 de ponta a ponta. Q1, Q3 e Q4 aparecem
// com o estado efetivo do código, sem preencher lacunas com dados presumidos. Cada
// registro carrega origem, período, ação, estado, evidência e regra de publicação.
// Não é gerador institucional: rejeita qualquer modo diferente de "synthetic".

export const CYCLE_REPORT_VERSION = "0.1.0-sintetica";

export type Lens = "Q1" | "Q2" | "Q3" | "Q4";
export type Phase = "Mensurar" | "Educar" | "Transformar" | "Evoluir";
/** Natureza da afirmação. "evaluated_impact" exige avaliação registrada — nenhuma existe. */
export type ClaimKind = "none" | "thematic" | "execution" | "observed_change" | "evaluated_impact";
/** Estados distintos: ausência de dado ≠ dado suprimido ≠ ausência de mudança. */
export type DataState = "present" | "absent" | "suppressed" | "no_change";
export type Publication = "collective" | "internal" | "withheld";
export type EsgLinkState = "proposed" | "unsupported" | "approved";

export interface CycleRecord {
  id: string;
  lens: Lens;
  phase: Phase;
  step: string;
  origin: string;
  period: string;
  action: string;
  state: string;
  claim: ClaimKind;
  data: DataState;
  /** Texto exibível. Vazio quando `data` é "suppressed". */
  finding: string;
  evidence: string;
  evidenceLevel: "teste automatizado" | "prova local" | "código" | "ausente";
  publication: Publication;
  esg?: { axis: "E" | "S" | "G"; state: EsgLinkState; note: string };
}

export interface LensStatus {
  lens: Lens;
  name: string;
  state: string;
  canRun: string;
  blockedBy: string;
  ref: string;
}

const PERIOD = "2026-T4 (fictício)";

export const SYNTHETIC_CYCLE = {
  mode: "synthetic" as const,
  version: CYCLE_REPORT_VERSION,
  org: "Empresa Exemplo Norte (fictícia)",
  period: PERIOD,
  lenses: [
    {
      lens: "Q1", name: "COPSOQ · risco psicossocial (Domínio B)", state: "method_pending",
      canRun: "Preparação do ciclo, comunicado, delegação e revisão técnica pelo SST designado.",
      blockedBy: "Correspondência entre a versão brasileira aprovada e o instrumento servido (41 itens/14 dimensões/escala uniforme × forma publicada). Coleta e resultados bloqueados.",
      ref: "docs/vitalos/Q1_COPSOQ_SOURCE_PARITY_2026-11-18.md",
    },
    {
      lens: "Q2", name: "FIB-T · bem comum", state: "ciclo completo em prova local",
      canRun: "Leitura agregada → atividade aprovada → plano → execução → aprendizagem → devolutiva coletiva.",
      blockedBy: "CI, staging e piloto não confirmados; PIL-01 a PIL-07 pendentes.",
      ref: "docs/vitalos/Q1Q2_INTEGRACAO_LOCAL_2026-11-19.md",
    },
    {
      lens: "Q3", name: "PERMA+V · florescimento", state: "candidato editorial + demo sintética",
      canRun: "Demonstração sintética /q3-demo; unidade Vitalidade 001 v0.2.0 aguardando revisão D10.",
      blockedBy: "Autorização dos autores, regras de cálculo e ausências; aprovação D10 da unidade.",
      ref: "branch feat/claude-q3-fundacao @713b6d5 · src/domain/ivo/q3-vitality-unit-001.json",
    },
    {
      lens: "Q4", name: "VIA-T · forças", state: "percurso individual em desenvolvimento (Codex)",
      canRun: "Percurso individual de leitura, prática e reflexão — trabalho local não comitado.",
      blockedBy: "Contrato de finalidade, fonte, papéis, publicação e proteção para qualquer visão coletiva.",
      ref: "branch codex/q4-pratica-forcas (local)",
    },
  ] satisfies LensStatus[],
  records: [
    {
      id: "Q2-01", lens: "Q2", phase: "Mensurar", step: "Leitura agregada", origin: "Onda FIB-T sintética, setor Operações",
      period: PERIOD, action: "Publicar leitura por setor com n ≥ 5", state: "publicada", claim: "none", data: "present",
      finding: "Fator Relações abaixo dos demais no setor Operações (agregado sintético).",
      evidence: "Q2 B1/C2 · navegador, papel RH", evidenceLevel: "prova local", publication: "collective",
    },
    {
      id: "Q2-02", lens: "Q2", phase: "Mensurar", step: "Leitura agregada", origin: "Onda FIB-T sintética, setor Jurídico",
      period: PERIOD, action: "Publicar leitura por setor", state: "suprimida (n < 5)", claim: "none", data: "suppressed",
      finding: "", evidence: "Regra k ≥ 5 · teste automatizado", evidenceLevel: "teste automatizado", publication: "withheld",
    },
    {
      id: "Q2-03", lens: "Q2", phase: "Educar", step: "Atividade aprovada", origin: "Q2-pratica-aprendizagem-equipe-001 v0.1.0",
      period: PERIOD, action: "Oferecer prática aprovada em D10", state: "aprovada 15/11/2026", claim: "thematic", data: "present",
      finding: "Prática de aprendizagem em equipe disponível para o setor.",
      evidence: "docs/vitalos/Q2_D10_UNIT_001_REVIEW.md", evidenceLevel: "prova local", publication: "collective",
      esg: { axis: "S", state: "proposed", note: "desenvolvimento e condições de aplicação" },
    },
    {
      id: "Q2-04", lens: "Q2", phase: "Transformar", step: "Plano", origin: "Plano 2026-T4 · RH",
      period: PERIOD, action: "Ativar plano e designar a liderança", state: "ativo", claim: "none", data: "present",
      finding: "Uma ação de plano com responsável da liderança.",
      evidence: "Prova integrada Q1+Q2 · navegador, RH", evidenceLevel: "prova local", publication: "internal",
    },
    {
      id: "Q2-05", lens: "Q2", phase: "Transformar", step: "Execução", origin: "Ação 1 · liderança",
      period: PERIOD, action: "Registrar execução", state: "em execução, evidência registrada", claim: "execution", data: "present",
      finding: "Execução registrada pela liderança responsável.",
      evidence: "Ledger: evidence_recorded:LIDER_EQUIPE", evidenceLevel: "prova local", publication: "collective",
      esg: { axis: "G", state: "proposed", note: "processo de decisão e resposta" },
    },
    {
      id: "Q2-06", lens: "Q2", phase: "Evoluir", step: "Aprendizagem", origin: "Revisão da prática · RH",
      period: PERIOD, action: "Registrar aprendizagem da ação", state: "registrada", claim: "observed_change", data: "no_change",
      finding: "Sem mudança observada entre as leituras comparáveis do exemplo.",
      evidence: "docs/vitalos/Q2_PRACTICE_REVIEW_LOCAL_2026-11-18.md", evidenceLevel: "prova local", publication: "internal",
    },
    {
      id: "Q2-07", lens: "Q2", phase: "Evoluir", step: "Eficácia", origin: "—",
      period: PERIOD, action: "Avaliar eficácia", state: "não avaliada", claim: "none", data: "absent",
      finding: "Eficácia ainda não avaliada: não há desenho de avaliação.",
      evidence: "Nenhum registro", evidenceLevel: "ausente", publication: "collective",
    },
    {
      id: "Q2-08", lens: "Q2", phase: "Evoluir", step: "Devolutiva coletiva", origin: "Devolutiva Q2 · colaborador",
      period: PERIOD, action: "Devolver ao coletivo", state: "publicada após aviso", claim: "execution", data: "present",
      finding: "Colaboradores veem título, setor, fator, estado, prazo e “execução registrada”; sem responsável nem evidência.",
      evidence: "Prova integrada Q1+Q2 · navegador, colaborador", evidenceLevel: "prova local", publication: "collective",
    },
    {
      id: "Q1-01", lens: "Q1", phase: "Mensurar", step: "Preparação e revisão técnica", origin: "Ciclo 2026-T4 · RH e SST designado",
      period: PERIOD, action: "Comunicado, encaminhamento e devolução técnica", state: "revisão 1 devolvida", claim: "none", data: "present",
      finding: "Preparação registrada; nenhuma coleta.",
      evidence: "Prova integrada Q1+Q2 · navegador, RH/SST/delegado", evidenceLevel: "prova local", publication: "internal",
    },
    {
      id: "Q1-02", lens: "Q1", phase: "Mensurar", step: "Resultados COPSOQ", origin: "—",
      period: PERIOD, action: "Coletar e publicar", state: "bloqueado (method_pending)", claim: "none", data: "absent",
      finding: "Sem dados: coleta bloqueada até a correspondência da fonte.",
      evidence: "MODULE_MESSAGES.method_pending", evidenceLevel: "código", publication: "collective",
    },
    {
      id: "Q3-01", lens: "Q3", phase: "Educar", step: "Vitalidade 001", origin: "Q3-pratica-vitalidade-pausas-001 v0.2.0",
      period: PERIOD, action: "Oferecer prática", state: "candidata à revisão D10", claim: "none", data: "absent",
      finding: "Não ofertada: aprovação editorial pendente.",
      evidence: "branch feat/claude-q3-fundacao @713b6d5 · q3-vitality-unit-001.json", evidenceLevel: "teste automatizado", publication: "collective",
    },
    {
      id: "Q4-01", lens: "Q4", phase: "Mensurar", step: "Visão coletiva de forças", origin: "—",
      period: PERIOD, action: "Ler forças da equipe", state: "fora do escopo sem contrato", claim: "none", data: "absent",
      finding: "Sem visão coletiva: não se soma ranking individual.",
      evidence: "Nenhum contrato coletivo", evidenceLevel: "ausente", publication: "collective",
    },
  ] satisfies CycleRecord[],
};

export type SyntheticCycle = typeof SYNTHETIC_CYCLE;

/** Regras de integridade. Retorna problemas; vazio = coerente. */
export function validateCycle(cycle: { mode: string; records: readonly CycleRecord[] }): string[] {
  const issues: string[] = [];
  if (cycle.mode !== "synthetic") issues.push("modo não sintético recusado");
  for (const r of cycle.records) {
    for (const k of ["origin", "period", "action", "state", "evidence"] as const) if (!r[k].trim()) issues.push(`${r.id}: ${k} vazio`);
    if (r.claim === "evaluated_impact") issues.push(`${r.id}: impacto avaliado sem avaliação registrada`);
    if (r.data === "suppressed" && (r.finding || r.publication !== "withheld" || r.esg)) issues.push(`${r.id}: suprimido carrega conteúdo`);
    if (r.data === "absent" && r.claim !== "none") issues.push(`${r.id}: afirmação sem dado`);
    if (r.esg?.state === "approved") issues.push(`${r.id}: vínculo ESG aprovado sem registro de aprovação`);
    if (r.evidenceLevel === "ausente" && r.data === "present") issues.push(`${r.id}: dado presente sem evidência`);
  }
  return issues;
}

const DATA_LABEL: Record<DataState, string> = {
  present: "Dado disponível", absent: "Sem dado", suppressed: "Suprimido (proteção)", no_change: "Sem mudança observada",
};
const CLAIM_LABEL: Record<ClaimKind, string> = {
  none: "—", thematic: "Contribuição temática", execution: "Execução comprovada",
  observed_change: "Mudança observada", evaluated_impact: "Impacto avaliado",
};
const ESG_LABEL: Record<EsgLinkState, string> = { proposed: "vínculo proposto, não aprovado", unsupported: "sem sustentação", approved: "aprovado" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Projeção exibível: registros suprimidos não levam texto, ESG nem origem. */
export function projectRecord(r: CycleRecord) {
  const hidden = r.data === "suppressed";
  return {
    id: r.id, lens: r.lens, phase: r.phase, step: r.step,
    origin: hidden ? "Não exibida" : r.origin, period: r.period, action: r.action, state: r.state,
    data: DATA_LABEL[r.data], claim: CLAIM_LABEL[r.claim],
    finding: hidden ? "Conteúdo retido: grupo com menos de 5 respostas. Proteção não equivale a resultado zero." : r.finding,
    evidence: r.evidence, level: r.evidenceLevel,
    publication: r.publication === "collective" ? "Devolutiva coletiva" : r.publication === "internal" ? "Uso interno (RH)" : "Retido",
    esg: hidden || !r.esg ? "—" : `${r.esg.axis} · ${ESG_LABEL[r.esg.state]}: ${r.esg.note}`,
  };
}

export function renderCycleReportHtml(cycle: SyntheticCycle, assets: { vitalosLogo: string; institutoLogo: string }): string {
  if (cycle.mode !== "synthetic") throw new Error("renderizador aceita apenas modo synthetic");
  const issues = validateCycle(cycle);
  if (issues.length) throw new Error(`ciclo incoerente: ${issues.join("; ")}`);
  const rows = cycle.records.map(projectRecord);
  const q2 = rows.filter((r) => r.lens === "Q2");
  const count = (d: string) => rows.filter((r) => r.data === d).length;
  const cell = (s: string) => `<td>${esc(s)}</td>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Global · ciclo sintético</title>
<style>
@page{size:A4;margin:16mm 14mm 18mm}
body{font-family:Georgia,serif;color:#1C2A24;font-size:10pt;line-height:1.45}
h1,h2,h3,th,.tag,.small{font-family:Arial,sans-serif}
h1{font-size:22pt;color:#0B3D2E;margin:0 0 4mm}h2{font-size:14pt;color:#0B3D2E;border-bottom:2px solid #C9A227;padding-bottom:1mm;margin-top:8mm}
h3{font-size:11pt;margin:4mm 0 1mm}
.cover{height:250mm;display:flex;flex-direction:column;justify-content:space-between}
.logos{display:flex;justify-content:space-between;align-items:center}.logos img{height:16mm}
.banner{background:#0B3D2E;color:#fff;padding:3mm 4mm;font-family:Arial,sans-serif;font-size:9pt;border-left:4px solid #C9A227}
.page{page-break-before:always}
table{border-collapse:collapse;width:100%;font-size:8.5pt;margin-top:2mm}th,td{border:1px solid #c9cfc9;padding:1.4mm 1.8mm;vertical-align:top;text-align:left}
th{background:#eef1ec;font-size:8pt}
.tag{display:inline-block;font-size:7.5pt;padding:0 1.5mm;border:1px solid #0B3D2E;border-radius:2mm}
.small{font-size:8pt;color:#4a5a52}
.kpis{display:flex;gap:3mm;margin:3mm 0}.kpis div{flex:1;border:1px solid #c9cfc9;padding:2mm;font-family:Arial,sans-serif;font-size:8.5pt}.kpis b{display:block;font-size:14pt;color:#0B3D2E}
.mark{font-family:Arial,sans-serif;font-size:7.5pt;color:#4a5a52;margin:0 0 2mm}td:first-child{white-space:nowrap}
</style></head><body>
<section class="cover">
<div class="logos"><img src="${esc(assets.vitalosLogo)}" alt="VitalOS"><img src="${esc(assets.institutoLogo)}" alt="Instituto"></div>
<div><p class="tag">EXEMPLO SINTÉTICO</p><h1>Relatório Global do ciclo</h1>
<p style="font-size:13pt">${esc(cycle.org)} · ${esc(cycle.period)}</p>
<p>Mensurar → Educar → Transformar → Evoluir, organizado pelas lentes do IVO. Este documento demonstra o formato com um cenário fictício; não descreve uma empresa real.</p></div>
<div class="banner">Leitura correta: execução comprovada ≠ mudança observada ≠ impacto avaliado. Vínculos ESG/ODS aparecem apenas como propostos; nenhum foi aprovado. Ausência de dado, dado suprimido e ausência de mudança são estados distintos.</div>
</section>

<section class="page"><p class="mark">VitalOS · Relatório Global · EXEMPLO SINTÉTICO — nenhum dado de cliente · v${esc(cycle.version)}</p><h2>1 · Resumo executivo</h2>
<div class="kpis"><div><b>${q2.length}</b>registros do ciclo Q2</div><div><b>${rows.filter((r) => r.claim === "Execução comprovada").length}</b>execuções comprovadas</div><div><b>0</b>impactos avaliados</div><div><b>${count("Suprimido (proteção)")}</b>recorte suprimido (n&lt;5)</div></div>
<p>O ciclo Q2 (FIB-T) foi percorrido de ponta a ponta no exemplo: leitura agregada, atividade aprovada, plano, execução, aprendizagem e devolutiva coletiva. A execução está comprovada por registro; não houve mudança observada entre leituras comparáveis; a eficácia não foi avaliada.</p>
<h3>Estado efetivo de cada lente</h3>
<table><tr><th>Lente</th><th>Estado</th><th>O que pode ser executado</th><th>O que falta</th></tr>
${cycle.lenses.map((l) => `<tr>${cell(`${l.lens} · ${l.name}`)}${cell(l.state)}${cell(l.canRun)}${cell(l.blockedBy)}</tr>`).join("")}</table>
<p class="small">A pendência de uma lente não bloqueia a operação válida de outra. Nenhum dado de Q1, Q3 ou Q4 foi presumido.</p>
</section>

<section class="page"><p class="mark">VitalOS · Relatório Global · EXEMPLO SINTÉTICO — nenhum dado de cliente · v${esc(cycle.version)}</p><h2>2 · Percurso do ciclo</h2>
<table><tr><th>Fase</th><th>Lente · passo</th><th>Estado</th><th>Dado</th><th>Natureza</th><th>Leitura</th></tr>
${rows.map((r) => `<tr>${cell(r.phase)}${cell(`${r.lens} · ${r.step}`)}${cell(r.state)}${cell(r.data)}${cell(r.claim)}${cell(r.finding)}</tr>`).join("")}</table>
<h3>Vínculos ESG</h3>
<table><tr><th>Registro</th><th>Vínculo</th></tr>${rows.filter((r) => r.esg !== "—").map((r) => `<tr>${cell(r.id)}${cell(r.esg)}</tr>`).join("")}</table>
<p class="small">Sem vínculo aprovado, não há nota ESG, conformidade, ODS atingido nem certificação.</p>
</section>

<section class="page"><p class="mark">VitalOS · Relatório Global · EXEMPLO SINTÉTICO — nenhum dado de cliente · v${esc(cycle.version)}</p><h2>3 · Evidências</h2>
<table><tr><th>ID</th><th>Origem</th><th>Ação</th><th>Evidência</th><th>Nível</th><th>Publicação</th></tr>
${rows.map((r) => `<tr>${cell(r.id)}${cell(r.origin)}${cell(r.action)}${cell(r.evidence)}${cell(r.level)}${cell(r.publication)}</tr>`).join("")}</table>
<p class="small">Níveis: código · teste automatizado · prova local (pilha descartável, navegador). CI, staging e piloto não confirmados.</p>

</section><section class="page"><p class="mark">VitalOS · Relatório Global · EXEMPLO SINTÉTICO — nenhum dado de cliente · v${esc(cycle.version)}</p><h2>4 · Próximos compromissos</h2>
<table><tr><th>Lente</th><th>Próximo marco verificável</th></tr>
<tr><td>Q1</td><td>Decidir a edição que corresponde à fonte aprovada; só então liberar coleta.</td></tr>
<tr><td>Q2</td><td>Desenho de avaliação de eficácia; CI e staging do candidato integrado.</td></tr>
<tr><td>Q3</td><td>Revisão D10 da Vitalidade 001 v0.2.0; autorização dos autores para a mensuração.</td></tr>
<tr><td>Q4</td><td>Comitar o percurso individual (Codex); contrato explícito antes de qualquer visão coletiva.</td></tr>
<tr><td>ESG</td><td>Revisão humana dos vínculos propostos e da materialidade.</td></tr></table>
</section>

<section class="page"><p class="mark">VitalOS · Relatório Global · EXEMPLO SINTÉTICO — nenhum dado de cliente · v${esc(cycle.version)}</p><h2>Anexo · rastreabilidade</h2>
<table><tr><th>ID</th><th>Período</th><th>Lente</th><th>Fonte de referência do estado</th></tr>
${rows.map((r) => `<tr>${cell(r.id)}${cell(r.period)}${cell(r.lens)}${cell(r.evidence)}</tr>`).join("")}
${cycle.lenses.map((l) => `<tr>${cell(`Lente ${l.lens}`)}${cell(cycle.period)}${cell(l.lens)}${cell(l.ref)}</tr>`).join("")}</table>
<p class="small">Modelo: src/lib/reports/cycle-report.ts v${esc(cycle.version)}. Cenário fictício; organização, setores e registros são ilustrativos. Instituto identificado como organização idealizadora; nenhum selo de acreditação.</p>
</section></body></html>`;
}
