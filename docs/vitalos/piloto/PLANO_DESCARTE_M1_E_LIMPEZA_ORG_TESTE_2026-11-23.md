# Plano · descarte M1 e limpeza da organização de teste (planejamento, sem execução)

**Estado: PLANEJAMENTO de 23/11/2026. Nada foi executado, em nenhum banco.** Não há instrução do proponente para apagar dados, e o Instituto ainda não escolheu a opção de retenção (`PROPOSTA_COMUNICADO_E_RETENCAO_PILOTO_Q2_2026-11-23.md`, §6, PR #68). Este documento prepara o **mecanismo M1** (procedimento manual autorizado) e a limpeza do **roteiro de convite nível 2** (`ROTEIRO_TESTE_CONVITE_ORG_FICTICIA_2026-11-23.md`, passo 7) para que, quando houver decisão, o ensaio e a execução sejam curtos e seguros. O piloto **não está pronto para operação**.

## 1. Método e limite do que foi levantado

Mapa de chaves estrangeiras obtido por **leitura estática** das 74 migrations de `supabase/migrations/` (script de análise em texto, 23/11), sem consultar nenhum banco e sem ler dados de pessoas.

Limites: o script lê `CREATE TABLE` e `ADD COLUMN … REFERENCES`. Pode **não** ver restrições criadas por `ADD CONSTRAINT`, alteradas depois, nem comportamento de triggers e de RLS. Por isso este mapa é **hipótese a ensaiar** em banco descartável, não ordem comprovada. Docker Desktop estava desligado em 23/11; não o iniciei, então o ensaio ainda não foi feito.

## 2. O que o mapa mostra

**Tabelas que apontam para `organizations` com `ON DELETE CASCADE`** (somem junto com a organização): `action_plans`, `action_items`, `action_log`, `evidence_records`, `practice_entries`, `devolutiva_sessions`, `org_cycle_registry`, `esg_report_snapshots`, `victory_records`, `seed_events`, `pair_directory_entries`, `pair_invites`, `pair_records`, `circle_sessions`, `efficacy_protocols`, `efficacy_observations`, `efficacy_verdicts`.

**Tabelas que apontam para `organizations` sem cascata (NO ACTION)**: bloqueiam a remoção da organização enquanto tiverem linhas:

| Grupo | Tabelas |
|---|---|
| Ondas e respostas | `waves`, `wave_cohorts`, `wave_capsules`, `cohort_capsules`, `sector_links` |
| Filhas de `waves` (também sem cascata) | `wave_responses`, `wave_invites` (além das quatro acima) |
| Convites e acesso | `member_invites`, `first_admin_invites`, `org_invites` (coluna `used_by_org_id`) |
| Módulos | `org_module_entitlements`, `org_module_changes` |
| Q1 (esquema `institutional`) | `q1_preparation_events`, `q1_preparation_delegates`, `q1_delegate_history`, `q1_technical_review_events` |
| Perfis | `profiles` |

**Tabelas que apontam para `auth.users`**: 42 chaves, **28 sem cascata**, entre elas `action_log.actor_user_id`, `evidence_records.recorded_by`, `action_plans.created_by`, `action_items.owner_user_id`, `member_invites.created_by`/`used_by_user_id`, `first_admin_invites.*`, `org_module_changes.actor_id`, `victory_records.issued_by` e as colunas de ator das tabelas `q1_*`.

**Consequências para quem planeja:**
1. Apagar só a organização **não funciona** por si: as tabelas NO ACTION precisam ser esvaziadas antes.
2. Apagar uma **conta** (autenticação) é bloqueado enquanto houver linha que a cite como autor. A ordem é: dados da organização, depois perfis, depois contas.
3. As tabelas de ledger têm gatilhos de proteção em `INSERT`/`UPDATE` (`ivo_ledger.guard_*`); a leitura estática **não prova** que o `DELETE` por cascata passa por eles. Precisa de ensaio.

## 3. Ordem hipotética de remoção (a validar no ensaio)

| Passo | O que | Por quê |
|---|---|---|
| 1 | `wave_responses`, `wave_invites`, `wave_capsules`, `cohort_capsules`, `wave_cohorts`, `sector_links` (da organização) | Filhas de `waves`, todas sem cascata |
| 2 | `waves` | Só depois das filhas |
| 3 | `member_invites`, `first_admin_invites`, `org_invites` (anular ou remover `used_by_org_id`), `org_module_changes`, `org_module_entitlements`, `institutional.q1_*` | NO ACTION para a organização |
| 4 | `profiles` da organização | NO ACTION; o endurecimento de perfis pode limitar `DELETE` |
| 5 | `organizations` | O resto sai por cascata |
| 6 | Contas de autenticação do teste | Só depois que nada mais as cita como autor; fora do SQL do app (API administrativa) |

Sempre com **contagem antes e depois** de cada passo (seção 5) e dentro de transação revisada.

## 4. Dois usos, duas regras

| Uso | Dados | Quando |
|---|---|---|
| **Limpeza da organização fictícia** (roteiro nível 2, passo 7) | Só dados sintéticos criados para o teste, com e-mails do próprio proponente | Ao fim do teste; exige autorização do proponente para criar e para limpar |
| **Descarte do piloto real** (opção A ou B da proposta) | Dados de pessoas do Instituto | Só com decisão do Instituto e instrução do proponente; passos 1–5 por categoria escolhida; nunca "apagar a organização" |

A mesma ordem serve aos dois, mas o segundo é **parcial por categoria** (a opção B preserva agregados e o ledger "sem autoria", que ainda não existe como operação), então o passo a passo real depende da opção escolhida.

## 5. Roteiro de ensaio (precisa de Docker Desktop ligado)

Em pilha **descartável e local** (`scripts/integ-local/`, loopback, sem volume nomeado):

1. `sh scripts/integ-local/reset.sh` e subir o app; rodar `mo2-journey.ts` para ter organização, convites, onda, plano e evidências sintéticos.
2. Registrar contagens por tabela da organização (somente `SELECT count(*) … WHERE org_id = …`; sem ler conteúdo).
3. Tentar remover **só a organização** e registrar qual restrição barra (confirma a seção 2, item 1).
4. Executar a ordem da seção 3, com contagem após cada passo, e registrar qualquer passo barrado por gatilho, RLS ou `profiles`.
5. Tentar remover a conta de teste antes e depois do passo 3 (confirma a seção 2, item 2).
6. Registrar a ordem **que de fato funcionou**, a lista de tabelas esquecidas e o resultado final: zero linhas da organização, sem efeito em outra organização (usar duas organizações no ensaio).
7. Resultado vira prova em `docs/vitalos/piloto/provas/` e a seção 3 é corrigida com o que o ensaio mostrar.

Nada disso toca o banco do projeto nem o Lovable.

## 6. Pendências e decisões

| Item | Quem |
|---|---|
| Ligar o Docker Desktop para o ensaio local | Proponente (ou autorizar que eu o inicie) |
| Autorizar criar e limpar a organização de teste no banco do projeto | Proponente |
| Escolher a opção de retenção (A, B ou C) e preencher a tabela por categoria | Instituto |
| Se for opção B: desenhar a operação "ledger sem autoria" (migration própria) | Depois da escolha |
| Procedimento de remoção de **contas** de autenticação | Proponente; fora do SQL do app |

Este documento não executa nem autoriza nenhum apagamento, não altera código, migrations, banco ou o Lovable, e não dispensa as pendências do checklist.
