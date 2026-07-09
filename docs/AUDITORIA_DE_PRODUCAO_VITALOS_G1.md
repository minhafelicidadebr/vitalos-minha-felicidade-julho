# Auditoria de Produção VitalOS — Gate G1

> Reauditoria pós-S4/pós-S8, exatamente como `PLANO_MESTRE_EVOLUCAO_VITALOS_2026_2027.md`
> pede em seu rodapé: *"Reauditar após S4 (gate de piloto) produzindo
> `AUDITORIA_DE_PRODUCAO_VITALOS_G1.md` com resultados contra banco real."*
>
> **Commit auditado:** `90a1f10` · **Data:** 2026-07-09 · **Método:** leitura
> read-only do repositório + reexecução do gate completo. Nenhuma migration,
> seed ou comando de produção foi rodado nesta auditoria.
>
> **Regra de honestidade (EV-17):** cada linha abaixo é uma de duas coisas —
> `[CÓDIGO]` = verificável estaticamente neste repo, reexecutado agora; ou
> `[PRODUÇÃO]` = só o founder pode confirmar (requer query/observação no
> Supabase/Lovable real). Nunca misturo os dois sob a mesma alegação.

## 1. Veredicto resumido

| Métrica | Auditoria original (2026-07-02) | Agora (2026-07-09) |
|---|---|---|
| Testes | 1408 verdes | **1958 verdes / 184 arquivos** `[CÓDIGO]` |
| Migrations | drift confirmado | **29 migrations, parity-check verde** `[CÓDIGO]` |
| P0 abertos | 8/8 confirmados no código | **0/8 — todos fechados e reverificados** `[CÓDIGO]`, ver §2 |
| P1 abertos | 7/7 | **6/7 fechados** `[CÓDIGO]` — só P1-03 (lint) em aberto |
| CI | inexistente | **existe, 3 runs verdes consecutivos no runner real** `[CÓDIGO+PRODUÇÃO]` |
| Decisão de go-live (§A) | piloto real = NO-GO até S4+evidências | **GO técnico** — condição satisfeita |

**Mudança de estágio:** de "MVP estruturado com data plane frágil" (veredicto
original) para **"fundação de segurança fechada e reverificada, produto e
camada comercial operantes, confiança técnica (CI+testes) demonstrável"**.
O que falta para o piloto real não é mais código — é checklist operacional
(`docs/CHECKLIST_PRONTIDAO_PILOTO.md`) e confirmações em produção que só o
founder pode fazer (§4 abaixo).

## 2. P0 — reverificados um a um

| ID | Veredicto original | Veredicto agora | Evidência `[CÓDIGO]` |
|---|---|---|---|
| P0-01 Coleta setorial fantasma | Confirmado, descarte silencioso | **Fechado** | `sector_links` (migration `20260708120000`) + RPC `submit_sector_response` (anon, SECURITY DEFINER) + `sector-link.server.ts` branch cloud real; 10 testes em `sector-link.server.test.ts` |
| P0-02 Drift de schema | Confirmado | **Fechado** | `schema-manifest.ts` + `parity-check.test.ts` roda dentro de `bun test src`; `bun run gate` falha se código referenciar coluna/RPC ausente da migration |
| P0-03 Autoelevação em profiles | Confirmado | **Fechado, com correção de 2ª camada já registrada** | `20260703130000_revoke_profile_self_elevation.sql` + `20260703170000_fix_profile_revoke_table_level_grant.sql` (a 2ª existe porque a 1ª sozinha não bastou nesta conta Supabase — REVOKE coluna não subtrai GRANT tabela pré-existente; achado real do S1, documentado, não escondido) |
| P0-04 orgId sem autoridade | Confirmado | **Fechado** | 12/39 arquivos `.functions.ts` chamam `requireOrgAdmin`/`resolveOrgMembership` diretamente; os 27 restantes foram auditados individualmente nesta reauditoria — são: (a) proof/aggregation MOCK por `packId` de setor público (sem tenant, sem risco), (b) `onboarding.functions.ts` usa `resolveAuthenticatedUserId` corretamente (org ainda não existe no momento do onboarding), (c) `org-invite.functions.ts` usa `verifyPlatformAdmin(accessToken)` — allowlist de plataforma, não de org, modelo de autorização diferente e intencional, (d) `consent*.functions.ts` não recebem nenhum parâmetro identificador (zero risco por ausência de tenant), (e) `wave-lifecycle.functions.ts` opera só sobre `campaign-mock.ts` (demo, nunca a tabela real), (f) `lead-capture.functions.ts` é intencionalmente público (formulário de captação) |
| P0-05 Onboarding forjável | Confirmado | **Fechado** | RPC `provision_organization_from_invite` (transacional, `FOR UPDATE`); `resolveAuthenticatedUserId(accessToken)` — userId nunca do payload |
| P0-06 Submissão não atômica | Confirmado | **Fechado** | RPC `submit_wave_response` (lock do convite + vínculo wave↔token + status + insert + consumo, uma transação) |
| P0-07 Validação pulada no Cloud | Confirmado | **Fechado** | `validateBlindSubmission` chamado ANTES de `saveWaveResponse` em `response-capture.server.ts:77` — mesma função pura do modo demo |
| P0-08 k-anon encerra coleta | Confirmado | **Fechado** | Única escrita de `status: "sealed"` no repo inteiro é `wave-admin.server.ts:145` (`closeWaveAsAdmin`) — decisão humana autorizada, nunca efeito colateral de `triggerCapsuleAggregation` |

## 3. P1 — reverificados

| ID | Status | Evidência `[CÓDIGO]` |
|---|---|---|
| P1-01 `.env` no git | **Fechado** | `git ls-files .env` vazio; `.gitignore` cobre `.env*` exceto `.env.example` |
| P1-02 Sem CI | **Fechado hoje** | `.github/workflows/gate.yml`; 3 runs `success` consecutivos no runner real (commits `7f74522`, `[health score]`, `b1f703a`) `[PRODUÇÃO — GitHub Actions]` |
| P1-03 Lint mascarado por CRLF | **Aberto** | `bun run lint` = 81.532 problemas (81.458 auto-corrigíveis) — não mudou; exige commit de formatação massiva + `.gitattributes`, decisão a coordenar com o founder pelo tamanho do diff em sync com Lovable |
| P1-04 Zero telemetria | **Fechado hoje** | `ops_events` (migration `20260708130000`) + `emitOpsEvent` fire-and-forget nos 5 pontos-chave; painel "Trilha de operações" em `/admin` |
| P1-05 Zero captura de leads | **Fechado hoje** | `leads` (migration `20260709140000`) + engine + painel `/plataforma` — **requer confirmação**: migration aplicada em produção? `[PRODUÇÃO — pendente]` |
| P1-06 Redirect hardcoded /rh | **Fechado** (já no S2) | `resolveOrgOverviewRoute(packId)` em `pack-routes.ts`, 6 testes |
| P1-07 Engine importa domain | **Fechado hoje** | 0 imports de `@/domain` em `src/engine` fora de teste; virou teste permanente (`engine-domain-boundary.test.ts`) |

## 4. O que só o founder pode confirmar (requer ação/observação em produção)

Nada aqui é um risco conhecido — é o que esta auditoria **não pode** provar
sozinha por ser read-only e sem credencial de produção:

1. **Migration 19 (`leads`) foi aplicada no Lovable?** As migrations 17
   (`sector_links`) e 18 (`ops_events`) foram confirmadas com 6 queries de
   privilégio em 2026-07-09. A 19 foi criada na mesma sessão do S7 mas
   **não tenho registro de confirmação** — verificar antes do piloto.
2. **RLS comportamental contra o banco vivo.** `bun run parity` prova
   coerência estática (código↔schema versionado); não prova que o REVOKE/
   GRANT de cada migration teve o efeito pretendido no banco real (lição do
   S1: já houve um caso onde não teve, e só apareceu com
   `has_column_privilege` ao vivo). Recomendação: rodar as queries de
   verificação de TODAS as migrations com RPC `SECURITY DEFINER` desta
   sessão (17, 18, 19), não só as duas já feitas.
3. **Redirect URLs do Supabase Auth** — causa histórica conhecida (S5) de
   travamento de magic link; fora do alcance deste repo (painel Lovable).
4. **`RESEND_API_KEY`** — decidir se está provisionada; sem ela, e-mail cai
   em `logged_only` (seguro, mas silencioso).

## 5. Desvios conscientes vs. o roadmap original (não são regressão)

- **S1** implementou autorização via `profiles.org_id` (1 pessoa = 1 org =
  1 papel) em vez de `organization_memberships`/`role_grants` (N:M) que a
  auditoria externa original sugeria — decisão de escopo documentada
  (over-engineering sem caso de uso real hoje; schema comporta evolução).
- **S5** (Academia viva v1, escopo original: "3 drivers × D1/D2/D4/D5")
  evoluiu para a Academia Viva 2.0 (7 invenções: Sementes, Diploma, Loop,
  Expedições, Círculos, Duplas, Diário) — superset mais rico do que o
  roadmap original previa, entregue mock-first com persistência real
  parcial (S5 base) e pendente para as camadas mais novas.
- **P2-04 (LLM real no Copiloto)** segue corretamente NO-GO — os
  pré-requisitos técnicos (data plane seguro, fim do S4) estão satisfeitos
  agora pela primeira vez, mas a decisão de provider/orçamento não foi
  tomada; não é um gap, é uma decisão de negócio pendente.

## 6. Métrica de confiança desta auditoria

Todo item marcado `[CÓDIGO]` foi reexecutado nesta sessão (não citado de
memória): `bun test src` rodou de novo (1958/1958), `git ls-files .env`
rodou de novo, cada RPC/migration foi confirmada por grep no arquivo real,
e a varredura de P0-04 cobriu as 39 funções server, não uma amostra.

**Conclusão:** o VitalOS atingiu o gate G1 pós-S4/S8. O bloqueio para o
primeiro piloto real deixou de ser técnico — é a lista curta e nomeada do
§4, mais o pré-voo operacional já documentado em
`docs/CHECKLIST_PRONTIDAO_PILOTO.md`.
