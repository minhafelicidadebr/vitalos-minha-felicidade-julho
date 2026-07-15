# Evidence Registry VitalOS v1 — Congelamento (2026-07-14)

**Arquivo canônico:** `src/domain/evidence/evidence-registry.json` (v1.0.0, `frozen: true`)
**Validação:** `src/engine/evidence/passport-engine.ts` (`validateEvidenceRegistry` + teste que roda no gate)
**Decisão do founder:** parar a expansão científica e pivotar ~80% da energia para produto (Trilho A), mantendo a verificação como trilho separado em lotes pequenos (Trilho B).

---

## As 4 correções aplicadas antes do congelamento

| # | Correção | Resolução |
|---|---|---|
| 1 | Divergência de contagem (32+16 vs "~46") | **46 estudos únicos**, determinístico por DOI: 32 (Fase 1a) + 16 verificados no lote 1b − 2 já contados (JOB-035 era V2 desde a Fase 0; JOB-038 já tinha grade E4/C2 na biblioteca). O "16 novos" da Fase 1b eram 14 novos + 2 confirmações. |
| 2 | RECOG-2020/APP-004 exibido como verificado | **Fora do v1.** Está em `excluded[]` com o motivo registrado; só entra após verificação B2 real. O bug vira impossível por construção: todo texto de status é derivado dos códigos pelo `passport-engine` — nunca digitado à mão. |
| 3 | Duplicatas da Fase 1a não consolidadas | Consolidadas em nós canônicos com `aliases[]`: TRU-006 (=LDR-013/VOI-005), APP-008 (=AUT-005/SUP-010/WLP-037), FLX-001 (=FLX-010), MGT-005 (=STR-006), OPD-002 (=AUT-021), OPD-030 (=WLP-032), LDR-005 (=MGT-003, DUP-015 confirmado com DOI retro-preenchido). |
| 4 | Claims C1/C2/C3 do primeiro ciclo | Todos os 46 têm `safe_claim` + `prohibited_claims`; os 7 C3 (ACH-003, ENE-019, JOB-041, JOB-057, LDR-005, LRN-001, LRN-006) e os 3 V2 (ENE-019, JOB-035, LRN-003) têm `caveat` obrigatório — o schema e o engine recusam o arquivo sem ele. JOB-035: o deck usava claim C4 (CA-001); o safe_claim registrado é C2 (efeitos heterogêneos, nunca "+15–40% generalizado"). |

Correção editorial adicional: grafia "Edmonson" do xlsx corrigida para **Edmondson** (conferida na fonte primária).

## Composição do v1

46 estudos únicos B2 · por nascente: Segurança 16 · Horizonte 11 · Autoria 10 · Vínculo 9 · Recuperação 4 · classe de contexto Tecnologia/IA 3.
Acesso honesto: todos `abstract_and_metadata` — nenhuma verificação leu texto integral, e o passaporte declara isso.

## Regra "trust once, reuse many" (agora em código)

`trustGate()` confia automaticamente quando: B2 + C1/C2 + L0/L1 + sem retratação + claim usado = safe_claim + contexto dentro da população original. **Não se re-pesquisa fonte nesses casos.**
Revisão científica reabre somente quando: o claim muda · o público/contexto muda · o estudo é C3 · uso clínico/legal/trabalhista sensível · alerta de retratação · claim comercial de alto impacto · IA quiser afirmar causalidade não registrada.

## Dois trilhos

- **Trilho A — Produto (~80%)**: Evidence Passport, trilhas, quizzes, cenários, Intervention Builder, projetos 90d, ActionLog, indicadores, rastreabilidade ESG — trabalhando SÓ com o registro congelado.
- **Trilho B — Expansão científica (pausado)**: lotes de 5–10 estudos, apenas quando uma funcionalidade depender de fonte ainda não verificada. Fila herdada da Fase 0 §5: Job Security restante (40), Employee Voice (39/1), Operational Design (37/3). O gate de 120 estudos vale para congelar a taxonomia v1.0, ampliar claims públicos e publicar metodologia — **não** para construir produto.

## Orçamento de evidência (contrato em `learning-patterns.json`)

Atividade: 1 mecanismo + 1 estudo principal + ≤2 complementares + 1 limite + 1 aplicação.
Trilha: 2–6 estudos-âncora + 1 mapa de mecanismos + guardrails + plano de transferência.
Projeto: 2–5 estudos + hipótese + contexto elegível + métricas processo/resultado + efeitos adversos + stop rule.
Relatório ESG: referencia projeto/mecanismo/passport/indicadores — nunca repete bibliografia (`esg-trace.schema.json`).

```text
STATUS CONGELAMENTO V1
Estudos únicos congelados: 46 (B2; 43 V1 + 3 V2)
C3 com caveat obrigatório: 7 · Excluídos: APP-004 (V0), CA-001..006, 15 refs V9
Mecanismos registrados: 1 (MECH-VOICE-001 — Voz Segura)
Validação: passport-engine.test.ts (19 testes) roda em todo `bun run gate`
Próximo: corte vertical /voz-segura (TASK.md)
```
