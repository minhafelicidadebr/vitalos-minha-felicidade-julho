#!/usr/bin/env bun
// Gera o PACOTE ÚNICO de decisões metodológicas do IVO a partir do registro
// canônico (src/domain/ivo/methodology-governance.json). O documento não tem
// conteúdo próprio: tudo vem do registro, então não há como divergir em silêncio.
//
//   bun run ivo:decision-package           grava docs/vitalos/ivo-decision-package.md
//   bun run ivo:decision-package --check   falha se o arquivo gravado divergir do registro
//
// Nada aqui aprova método: o documento descreve propostas e o que cada pendência
// bloqueia. Também não contata terceiros — D4/D5 listam só as perguntas que o
// responsável metodológico decidirá se e como encaminhar.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getGovernanceEntries, getGovernanceRegistryMeta } from "../src/domain/ivo/methodology-governance";
import { GOVERNANCE_STATE_LABEL, type GovernanceEntry } from "../src/engine/ivo/governance-decision";
import { getFibtManifest } from "../src/domain/instruments/fibt/fibt-instrument";

export const DECISION_PACKAGE_PATH = join("docs", "vitalos", "ivo-decision-package.md");

const bullet = (items: readonly string[]): string => (items.length === 0 ? "- (nenhum)" : items.map((i) => `- ${i}`).join("\n"));

function block(e: GovernanceEntry): string {
  const external = e.sources.filter((s) => s.kind === "externa_a_verificar");
  const lines = [
    `### ${e.id} — ${e.title}`,
    "",
    `Estado: **${GOVERNANCE_STATE_LABEL[e.state]}** · versão do registro ${e.version} · responsável: ${e.owner ?? "não designado"} · revisor: ${e.reviewer ?? "não designado"}`,
  ];
  if (e.mapping) {
    lines.push("", `Mapeamento: lente \`${e.mapping.lens}\` · construto \`${e.mapping.sourceConstructId ?? "—"}\` → ${e.mapping.dimension ? `\`${e.mapping.dimension}\`` : "nenhuma dimensão"} (${e.mapping.nature})`);
  }
  lines.push(
    "",
    `**Proposta.** ${e.proposal}`,
    "",
    `**Justificativa.** ${e.rationale}`,
    "",
    `**Recomendação.** ${e.recommendation}`,
    "",
    "**Alternativas consideradas**",
    bullet(e.alternatives),
    "",
    "**Evidência e fontes**",
    bullet(e.sources.map((s) => (s.kind === "externa_a_verificar" ? `${s.ref} _(externa — a verificar; não lida por este sistema)_` : s.ref))),
  );
  if (external.length > 0) lines.push("", `Atenção: ${external.length} fonte(s) externa(s) ainda não verificada(s) — não tratar como evidência confirmada.`);
  lines.push(
    "",
    "**Limitações**",
    bullet(e.limitations),
    "",
    "**Critérios para aprovar**",
    bullet(e.approvalCriteria),
    "",
    "**Efeito enquanto estiver pendente**",
    bullet(e.effects.map((x) => `${x.feature}: ${x.effect}`)),
    "",
    `Depende de: ${e.dependsOn.length > 0 ? e.dependsOn.join(", ") : "—"}`,
    "",
  );
  return lines.join("\n");
}

export function renderDecisionPackage(): string {
  const meta = getGovernanceRegistryMeta();
  const entries = getGovernanceEntries();
  const decisions = entries.filter((e) => e.kind === "decision");
  const mappings = entries.filter((e) => e.kind === "mapping");
  const open = ((getFibtManifest() as unknown as { governance?: { open_questions?: string[] } }).governance?.open_questions ?? []) as string[];
  const counts = (["proposta", "em_revisao", "aprovado_para_piloto", "validado_para_uso_definido", "rejeitada", "retirada"] as const).map(
    (s) => `${GOVERNANCE_STATE_LABEL[s]}: ${entries.filter((e) => e.state === s).length}`,
  );

  const out: string[] = [
    "# Pacote único de decisões metodológicas — IVO",
    "",
    `> **Gerado** de \`src/domain/ivo/methodology-governance.json\` (registro v${meta.version}) por \`bun run ivo:decision-package\`.`,
    "> Não edite à mão: `bun run ivo:decision-package --check` (e o teste `scripts/ivo-decision-package.test.ts`) falham se este arquivo divergir do registro.",
    "",
    "## Como ler",
    "",
    `- Situação: ${counts.join(" · ")}. ${entries.some((e) => e.state === "aprovado_para_piloto" || e.state === "validado_para_uso_definido") ? "**Aprovações restritas ao escopo de cada entrada.**" : "**Nada está aprovado.**"} Mapeamentos, índice composto e eficácia (D9) dependem de suas próprias decisões; aprovação editorial de conteúdo não os aprova.`,
    "- Estados distintos: _Proposta_ (sem efeito no produto) · _Em revisão_ · _Aprovado para piloto_ (uso experimental delimitado e identificado; **não** é validação) · _Validado para uso definido_ (evidência de validação para o uso declarado, e só ele).",
    `- ${meta.authorityPolicy}`,
    "",
    "## Como decidir (fluxo técnico já pronto)",
    "",
    "1. Identificar o responsável metodológico e revisor distinto, com autoria, versões e evidência da decisão; registrar nomes somente no escopo institucional autorizado.",
    "2. Configurar no servidor a autoridade (`VITALOS_IVO_METHOD_AUTHORITY_USER_IDS`, lista de ids de usuário). Sem configuração, `/ivo-integral/governanca` continua consultável e a aprovação fica indisponível com o motivo.",
    "3. Na mesma página, a autoridade usa **Preparar decisão**: o servidor valida transição, responsável ≠ revisor, evidência e critérios, e devolve o registro resultante **sem gravar nada**.",
    "4. O registro resultante é revisto por pessoa e entra por commit em `methodology-governance.json` (versão nova + trilha). Só então o produto passa a tratar a decisão como aprovada.",
    "",
    "## Resumo",
    "",
    "| ID | Decisão | Estado | Recomendação | Depende de |",
    "|---|---|---|---|---|",
    ...entries.map((e) => `| ${e.id} | ${e.title} | ${GOVERNANCE_STATE_LABEL[e.state]} | ${e.recommendation.replace(/\|/g, "\\|")} | ${e.dependsOn.length > 0 ? e.dependsOn.join(", ") : "—"} |`),
    "",
    "## Decisões D1–D10",
    "",
    ...decisions.map(block),
    "## Mapeamentos FIB-T → dimensão (M1–M6)",
    "",
    ...mappings.map(block),
    "## Verificações necessárias para D4 e D5 (sem contato com terceiros)",
    "",
    "Este sistema **não envia mensagens a terceiros**. Abaixo estão só as perguntas; se, como e por quem elas serão encaminhadas é decisão do responsável metodológico.",
    "",
    "**D4 — perguntas abertas no manifesto da FIB-T (`governance.open_questions`)**",
    bullet(open),
    "",
    "**D5 — COPSOQ: o que precisa estar respondido antes de qualquer uso no IVO**",
    bullet([
      "Qual licença/condição de uso se aplica à organização e ao uso pretendido (e quem é o titular)?",
      "Qual versão do instrumento (II-Br ou III) será adotada e com que adaptação?",
      "Política dos Domínios A e B: entram no IVO, só em uma lente independente, ou de que forma?",
      "A fonte externa listada em D5 confere com o texto vigente? (marcada _a verificar_ no registro)",
    ]),
    "",
  ];
  return `${out.join("\n")}\n`;
}

if (import.meta.main) {
  const text = renderDecisionPackage();
  if (process.argv.includes("--check")) {
    const current = existsSync(DECISION_PACKAGE_PATH) ? readFileSync(DECISION_PACKAGE_PATH, "utf8").replace(/\r\n/g, "\n") : "";
    if (current !== text) {
      console.error(`❌ ${DECISION_PACKAGE_PATH} diverge do registro. Rode: bun run ivo:decision-package`);
      process.exit(1);
    }
    console.log(`✅ ${DECISION_PACKAGE_PATH} está em dia com o registro.`);
  } else {
    writeFileSync(DECISION_PACKAGE_PATH, text);
    console.log(`Gravado: ${DECISION_PACKAGE_PATH}`);
  }
}
