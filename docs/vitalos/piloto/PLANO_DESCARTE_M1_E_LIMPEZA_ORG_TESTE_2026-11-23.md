# Plano · descarte M1 e limpeza da organização de teste (ensaiado em banco descartável local)

**Estado: planejamento de 23/11/2026, com ensaio em banco descartável local. Nada foi executado no banco do projeto nem em dados de pessoas.** Não há instrução do proponente para apagar dados, e o Instituto ainda não escolheu a opção de retenção (`PROPOSTA_COMUNICADO_E_RETENCAO_PILOTO_Q2_2026-11-23.md`, §6, PR #68). Este documento prepara o **mecanismo M1** e a limpeza do **roteiro de convite nível 2** (`ROTEIRO_TESTE_CONVITE_ORG_FICTICIA_2026-11-23.md`, passo 7). O piloto **não está pronto para operação**.

**Resumo do que o ensaio mostrou:** apagar uma organização do piloto **não é um procedimento simples** nem "sem código novo". Com os controles de integridade ligados, a remoção é **bloqueada por desenho**; só se completa desabilitando gatilhos de proteção (DDL), o que no banco do projeto exige decisão e procedimento próprios.

Prova: `provas/ENSAIO_DESCARTE_ORG_LOCAL_2026-11-23.txt`.

## 1. Método e limites

1. **Mapa estático** das 74 migrations (script de texto), sem banco.
2. **Ensaio** em pilha descartável local (`scripts/integ-local/`, loopback, sem volume), com 72 migrations aplicadas, dados **sintéticos** da jornada MO2 (organizações "Alfa" e "Beta") e superusuário local. Pilha desligada ao final.

Limites do ensaio: superusuário **contorna RLS**, então não prova o que o papel de serviço do projeto consegue; as tabelas `institutional.q1_*` estavam vazias; não testa descarte parcial por categoria; não toca o banco do projeto.

## 2. O que o ensaio mostrou (erros literais observados)

| # | Tentativa | Resultado |
|---|---|---|
| 1 | Apagar só a organização | Falha: `profiles_org_id_fkey` |
| 2 | `wave_cohorts` antes de `sector_links` | Falha: `sector_links_wave_cohort_key_fk` (**chave composta**; o mapa estático não a viu) |
| 3 | `sector_links` antes, mas `wave_cohorts` ainda com ledger | Falha: `action_items_source_cohort_wave_fk` (`action_items` aponta para `wave_cohorts`) |
| 4 | Ledger por cascata a partir de `action_plans` | Falha: `module_origin_required` (gatilho `institutional.guard_module_operation`) |
| 5 | Ledger de baixo para cima | Falha: **`first_admin_immutable`**: `first_admin_invites` não aceita `DELETE`, por desenho (o gatilho `first_admin_integrity` levanta a exceção em qualquer remoção) |
| 6 | Idem, com esse gatilho desabilitado | Falha no `COMMIT`: `module_origin_required`. O gatilho é `DEFERRABLE INITIALLY DEFERRED` e avalia o estado final, em que o item ou a onda de origem já foi apagado |
| 7 | Uma tabela do ledger por transação | `action_log`, `evidence_records` e `action_items` saem; **`action_plans` falha** (plano sem cápsula de origem só resolve o módulo pelos itens, já removidos) |
| 8 | Gatilhos de proteção desabilitados por tabela, **numa só transação**, ordem da seção 3, reabilitados antes do `COMMIT` | **Passa** nas duas organizações: 0 organizações restantes, 0 gatilhos desabilitados |
| 9 | Apagar `auth.users` depois (transação desfeita) | Passa: as 8 contas poderiam ser removidas |

**Achados que o mapa estático não deu:**
- **Gatilhos de integridade deliberados**: `first_admin_invites` é imutável; as tabelas do ledger e das ondas têm gatilho de módulo (`module_operation`, `module_plan_operation`) que só aceita `DELETE` enquanto o módulo da organização está habilitado e a origem existe no fim da transação.
- **Chaves compostas**: `sector_links → wave_cohorts` e `action_items → wave_cohorts`/`waves`.
- **`ops_events` fica de fora**: tem `org_id` mas **nenhuma chave estrangeira**, não é removida por nenhum passo (Alfa 10 linhas, Beta 3, e 9 sem organização). Precisa de decisão própria (apagar por `org_id`, anonimizar, ou manter como log operacional).

## 3. Ordem que funcionou (só no banco descartável, com gatilhos desabilitados na transação)

| Passo | O que |
|---|---|
| 0 | Desabilitar `first_admin_integrity` e os gatilhos de módulo das tabelas do ledger e das ondas |
| 1 | `efficacy_verdicts`, `efficacy_observations`, `efficacy_protocols`, `action_log`, `evidence_records`, `action_items`, `action_plans` |
| 2 | `wave_responses` e `wave_invites` (via `waves`), `cohort_capsules`, `sector_links`, `wave_capsules`, `wave_cohorts` |
| 3 | `waves` |
| 4 | `member_invites`, `first_admin_invites`, `org_invites` (`used_by_org_id` = nulo), `org_module_changes`, `org_module_entitlements`, `institutional.q1_*` (`q1_technical_review_events` antes de `q1_preparation_events`) |
| 5 | `profiles`, `organizations` |
| 6 | Reabilitar todos os gatilhos e confirmar |
| 7 | Contas de autenticação, só depois (28 chaves para `auth.users` não têm cascata) |

## 4. Consequências para as decisões pendentes

| Tema | Consequência |
|---|---|
| **M1 "manual, sem código novo"** (proposta #68) | **Não vale como estava escrito.** No banco do projeto, o descarte exige desabilitar gatilhos de proteção, ou seja, DDL (`ALTER TABLE … DISABLE TRIGGER`), com autorização, janela e reabilitação conferida. Não improvisar |
| **Limpeza do roteiro nível 2, passo 7** | Se a organização de teste for criada pelo fluxo de primeiro administrador, ela **não pode ser apagada** com os controles ligados. Opções: (a) autorizar o procedimento com gatilhos desabilitados; (b) **não apagar** e manter a organização marcada como teste, com contas suas; (c) criar antes uma rotina oficial de descarte (M2). Decisão do proponente |
| **Opção B (ledger sem autoria)** | Continua sem existir como operação e esbarra nos mesmos gatilhos do ledger |
| **Comunicado** | A promessa "apagamos ao fim" só é verdadeira se o procedimento acima estiver decidido e ensaiado. Não prometer descarte antes disso |
| **`ops_events`** | Incluir no inventário de dados do piloto (`PROPOSTA…`, §3), com decisão própria |

## 5. Se o Instituto ou o proponente quiserem o descarte de verdade

Caminho sugerido, **sem executar nada agora**:

1. Decidir entre M1 autorizado (DDL controlado), M2 (rotina oficial de descarte, com migration, testes e aprovação) ou não descartar a organização de teste.
2. Se M2: desenhar uma função de descarte por organização, `SECURITY DEFINER`, executável só pelo papel de serviço, com trilha de quem pediu, contagem antes e depois, e que **respeite** os gatilhos em vez de desabilitá-los (por exemplo, liberando uma etapa de descarte explícita e auditada). Passa pela auditoria de RLS e `SECURITY DEFINER` do projeto.
3. Ensaiar de novo no banco descartável com a função real, em duas organizações, e com papel de serviço em vez de superusuário.
4. Só então autorização para qualquer execução no banco do projeto.

## 6. O que este documento não faz

Não autoriza nem executa apagamento, não altera código, migrations, banco do projeto ou o Lovable, e não dispensa as pendências do checklist (build, publicação, convite de ponta a ponta no app publicado, responsável operacional, PIL-01, PIL-03, PIL-04, PIL-07).
