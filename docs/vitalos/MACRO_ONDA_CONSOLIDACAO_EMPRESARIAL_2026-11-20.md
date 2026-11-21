# Macro-onda de consolidação empresarial · 20/11/2026

Branch `feat/claude-ciclo-relatorio` (worktree `..\vitalos-claude-ciclo`), a partir do candidato Q1+Q2 `f8cabb9` (`integ/q1-q2-merge`). Local, sem push. `.q.out`/`.q.sql` não abertos. O checkout do Codex (`codex/q4-pratica-forcas`, Q4 não comitado) não foi tocado.

## Onda 0 · ponto de partida

| Frente | Commit | Alcançável | Nível de evidência | Primeiro pendente |
| --- | --- | --- | --- | --- |
| Q1 COPSOQ | `f8cabb9` (via `9bbfa92` + correções `cda7c3d`, `655ce95`) | preparação, comunicado, delegação, revisão técnica pelo SST designado; coleta bloqueada (`method_pending`) | prova local (pilha descartável, navegador) + gate | decidir a edição que corresponde à fonte aprovada |
| Q2 FIB-T | `f8cabb9` | leitura agregada → atividade aprovada → plano → execução → aprendizagem → devolutiva | prova local por papel + gate | CI/staging; PIL-01..07; desenho de eficácia |
| Q3 PERMA+V | `713b6d5` (editorial, local) · `f692b03` (demo, em `origin/main`) | demo sintética `/q3-demo` na prévia; produção 404 até Publish | teste automatizado; prévia verificada | Vitalidade 001 v0.2.0 aprovada em D10 (20/11, `33d92d5`) e refletida no relatório; falta levar a uma rota do app |
| Q4 VIA-T | WIP do Codex, não comitado | percurso individual em desenvolvimento | não verificável por commit | Codex comitar; contrato coletivo |
| Relatório Global | este branch | PDF sintético do ciclo | teste automatizado + PDF inspecionado | contrato de emissão e aprovação de vínculos ESG |

Q1+Q2: a prova integrada de `Q1Q2_INTEGRACAO_LOCAL_2026-11-19.md` continua válida para `f8cabb9` (a última mudança só move a regra do ledger para o esquema `ivo_ledger`, com a suíte 10 aprovada no replay). Nada novo a provar no delta.

## Entrega desta onda

- `src/lib/reports/cycle-report.ts`: modelo puro do ciclo sintético. Cada registro tem origem, período, ação, estado, evidência, nível e regra de publicação; `claim` diferencia contribuição temática, execução comprovada, mudança observada e impacto avaliado; `data` diferencia dado presente, ausente, suprimido e sem mudança. O validador recusa impacto sem avaliação, vínculo ESG aprovado sem registro, afirmação sem dado e modo não sintético. A projeção retira origem, texto e ESG do recorte suprimido.
- `src/lib/reports/cycle-report.test.ts`: 6 testes.
- `docs/vitalos/artifacts/RELATORIO_GLOBAL_CICLO_SINTETICO.pdf`: 6 páginas A4 (capa, resumo executivo, percurso, evidências, compromissos, anexo de rastreabilidade). Gerado pelo Edge headless a partir do HTML do modelo; todas as páginas foram inspecionadas. Não é o gerador institucional e não consulta dados reais.

Reprodução: renderizar `renderCycleReportHtml(SYNTHETIC_CYCLE, { vitalosLogo, institutoLogo })` em HTML e imprimir com `msedge --headless=new --no-pdf-header-footer --print-to-pdf=…`.

## Limites

Q1, Q3 e Q4 aparecem só com seu estado efetivo, sem dado presumido. Vínculos ESG são propostos, nenhum aprovado. Nenhuma fonte institucional foi conectada.
