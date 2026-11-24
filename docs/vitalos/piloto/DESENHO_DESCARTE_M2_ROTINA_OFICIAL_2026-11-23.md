# Desenho · rotina oficial de descarte (M2)

**Estado: DESENHO de 23/11/2026, sobre a `main` `cd3feae`. Nada foi implementado, nenhuma migration foi escrita ou aplicada, nenhum banco foi tocado.** O piloto **não está pronto para operação**. Este documento existe para que o Instituto e o proponente possam escolher entre M1 e M2 sabendo o custo de cada um (`PROPOSTA_COMUNICADO_E_RETENCAO_PILOTO_Q2_2026-11-23.md`, §6; `PLANO_DESCARTE_M1_E_LIMPEZA_ORG_TESTE_2026-11-23.md`).

## 1. Problema que o desenho resolve

O ensaio local de 23/11 (`provas/ENSAIO_DESCARTE_ORG_LOCAL_2026-11-23.txt`) mostrou que apagar dados de uma organização é barrado, por desenho, por três controles de integridade:

| Controle | Onde | Efeito no descarte |
|---|---|---|
| `first_admin_integrity` → `institutional.guard_first_admin_invite()` | `first_admin_invites` | Recusa **qualquer** `DELETE` (`first_admin_immutable`) |
| `module_operation` / `module_plan_operation` → `institutional.guard_module_operation()` | 14 tabelas do ledger, das ondas e da eficácia | Gatilho `DEFERRABLE INITIALLY DEFERRED`: no `COMMIT`, resolve o módulo da linha apagada consultando o pai (onda, item, cápsula). Se o pai também foi apagado, falha com `module_origin_required` |
| Chaves sem cascata e chaves compostas | `waves`, `wave_cohorts`, `first_admin_invites`, `profiles` e outras | Exigem ordem exata de remoção |

Hoje, a única forma de completar a remoção é desabilitar gatilhos (DDL), o que é o M1. M2 é uma rotina que **respeita** os controles em vez de desligá-los.

## 2. Requisitos

| # | Requisito |
|---|---|
| R1 | Nenhum `ALTER TABLE … DISABLE TRIGGER`, nenhum `session_replication_role`: os controles continuam ativos para todo o resto |
| R2 | Só o papel de serviço executa; cliente (`anon`, `authenticated`) nunca. O pedido parte de administrador de plataforma (`verifyPlatformAdmin`, `src/lib/api/org-invite.server.ts`), nunca do RH da organização |
| R3 | Uma organização por execução; outra organização **intocada** (provado por teste com duas organizações) |
| R4 | Tudo numa transação: ou remove tudo do escopo, ou nada |
| R5 | Prévia antes da execução: contagens por tabela, e a execução só ocorre se as contagens não mudaram desde a prévia |
| R6 | Recibo sem dados de pessoas: quem pediu, referência da decisão, escopo, contagens antes e depois, horário |
| R7 | O recibo sobrevive à remoção (não tem chave estrangeira para a organização) |
| R8 | Inclui `ops_events` por `org_id` (sem chave estrangeira; hoje ficaria órfã) |
| R9 | Contas de autenticação são um passo separado, depois, e só para contas sem perfil restante |
| R10 | Seguir as convenções de segurança do projeto: `SECURITY DEFINER SET search_path`, `REVOKE ALL … FROM PUBLIC, anon, authenticated`, `GRANT … TO service_role`, conferência de privilégio no rodapé da migration (skill `supabase-rls-security-definer-auditor`) |

## 3. Alternativas consideradas

| Alternativa | Respeita R1 | Segurança | Complexidade | Escolha |
|---|---|---|---|---|
| A. Variável de sessão (`set_config('vitalos.purge', …)`) lida pelos gatilhos | Sim | **Fraca**: variáveis personalizadas podem ser definidas por qualquer papel que execute SQL | Baixa | Não |
| B. **Registro de execução por transação** numa tabela restrita, consultado pelos gatilhos | Sim | Forte: só o dono da função grava; o gatilho confere a transação corrente | Média | **Sim** |
| C. Desabilitar gatilhos dentro da função (DDL) | Não | Média; trava a tabela inteira e esconde erros | Média | Não (é o M1) |
| D. `session_replication_role = replica` | Não | Fraca: desliga também as chaves estrangeiras | Baixa | Não |
| E. Só anonimizar, sem apagar | Sim | Forte | Alta (colunas de autoria são `NOT NULL`) | Fase 2, se o Instituto escolher a opção B |

## 4. Desenho escolhido (B)

### 4.1 Objetos novos (esboço; não aplicado)

```sql
-- Recibo e marcador da transação de descarte. Sem FK para organizations (R7).
CREATE TABLE institutional.org_purge_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL,
  scope          text NOT NULL CHECK (scope IN ('organization')),
  decision_ref   text NOT NULL CHECK (length(decision_ref) BETWEEN 3 AND 200),
  requested_by   uuid NOT NULL,          -- administrador de plataforma; sem FK (sobrevive à conta)
  xact_id        xid8 NOT NULL DEFAULT pg_current_xact_id(),
  counts_before  jsonb NOT NULL,
  counts_after   jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON institutional.org_purge_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON institutional.org_purge_runs TO service_role;

-- Verdadeiro só dentro da transação que abriu uma execução.
CREATE FUNCTION institutional.purge_in_current_xact() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM institutional.org_purge_runs WHERE xact_id = pg_current_xact_id())
$$;
REVOKE ALL ON FUNCTION institutional.purge_in_current_xact() FROM PUBLIC, anon, authenticated;
```

**Por que a transação e não um "status":** os gatilhos de módulo são diferidos e rodam no `COMMIT`. Se a liberação dependesse de um campo "em andamento" que a função muda para "concluído" antes de terminar, a checagem diferida já não a veria. Conferir a **transação corrente** resolve: a liberação vale do início ao `COMMIT`, e só nela.

### 4.2 Mudança mínima nos dois gatilhos (esboço)

Em `institutional.guard_module_operation()` e em `institutional.guard_first_admin_invite()`, uma única linha, **só para `DELETE`**, depois das verificações de papel que já existem:

```sql
IF TG_OP = 'DELETE' AND institutional.purge_in_current_xact() THEN RETURN OLD; END IF;
```

Para `guard_first_admin_invite`, a linha entra **depois** da recusa a `anon`/`authenticated` e **antes** de `first_admin_immutable`. `INSERT` e `UPDATE` não mudam. Fora de uma execução registrada, os dois gatilhos se comportam exatamente como hoje.

### 4.3 Funções de serviço (esboço de assinatura)

| Função | O que faz |
|---|---|
| `public.purge_organization_preview(p_org_id uuid) RETURNS jsonb` | Só leitura: contagens por tabela do escopo e um resumo (`digest`) das contagens. `STABLE`, `SECURITY DEFINER`, só `service_role` |
| `public.purge_organization(p_org_id uuid, p_decision_ref text, p_requested_by uuid, p_expected_digest text) RETURNS jsonb` | Trava a organização (`FOR UPDATE`); recalcula as contagens e **recusa** se o resumo não bate com o da prévia (R5); grava a linha em `org_purge_runs`; apaga na ordem do ensaio; apaga `ops_events` da organização (R8); grava `counts_after`; devolve o recibo. Só `service_role` |

Ordem interna (a do ensaio, `PLANO_DESCARTE_M1…`, §3), agora sem desabilitar nada:
1. eficácia (veredictos, observações, protocolos), `action_log`, `evidence_records`, `action_items`, `action_plans`;
2. `wave_responses` e `wave_invites` (via ondas), `cohort_capsules`, `sector_links`, `wave_capsules`, `wave_cohorts`;
3. `waves`;
4. `member_invites`, `first_admin_invites`, `org_invites.used_by_org_id` → nulo, `org_module_changes`, `org_module_entitlements`, `institutional.q1_technical_review_events`, `q1_preparation_events`, `q1_preparation_delegates`, `q1_delegate_history`, `ops_events`;
5. `profiles`, `organizations`.

Erros possíveis com código próprio: `purge_org_not_found`, `purge_counts_changed`, `purge_decision_ref_required`, `purge_forbidden`.

### 4.4 Servidor e contas

- `src/lib/api/org-purge.server.ts` (novo, só servidor): exige `verifyPlatformAdmin(accessToken)`; dois passos, prévia e confirmação com o `digest`; nunca aceita `org_id` de organização a que o pedido não se refira explicitamente; registra só o recibo.
- **Contas (R9):** depois do `COMMIT`, o servidor lista as contas que tinham perfil na organização (capturadas na prévia) e, para as que não têm mais nenhum perfil, chama a API administrativa de autenticação. O recibo ganha só a contagem de contas removidas. Já existe uso de `auth.admin.deleteUser` em `scripts/fibt1-staging-proof.ts`, como referência.
- **Sem tela no app** nesta fase. Se houver tela, é só de administrador de plataforma, com os quatro estados e texto de confirmação explícito.

## 5. Provas obrigatórias antes de qualquer aplicação

| Prova | Onde |
|---|---|
| Sem execução registrada, `DELETE` em `first_admin_invites` e no ledger **continua** recusado | `supabase/tests/11_org_purge.sql` (padrão das suítes existentes: transação + `ROLLBACK`) |
| Com a função, a organização A some por inteiro, inclusive `ops_events`; a organização B fica com as mesmas contagens | idem, duas organizações |
| Resumo divergente da prévia é recusado e nada é apagado | idem |
| `anon` e `authenticated` sem `EXECUTE` nas funções e sem acesso a `org_purge_runs` (`has_function_privilege`, `has_table_privilege`) | idem e rodapé da migration |
| A liberação não vaza: uma segunda transação concorrente, sem execução registrada, continua bloqueada | idem |
| Recibo sem dado de pessoa (só ids técnicos, contagens, referência da decisão) | idem |
| Servidor exige administrador de plataforma; RH da organização é recusado | teste unitário de `org-purge.server.ts` |
| Repetir o ensaio local com **papel de serviço**, não superusuário | pilha `scripts/integ-local/`, prova em `provas/` |
| Gate completo (`bun run gate`) e paridade de esquema (`bun run parity`) | local e CI |

## 6. Riscos e como ficam

| Risco | Tratamento |
|---|---|
| Enfraquecer a imutabilidade do ledger e do primeiro administrador | A exceção existe só dentro de uma transação aberta pela função de serviço, deixa recibo e é testada para não vazar. Documentos e comunicação que falem em "imutável" precisam dizer "imutável, salvo descarte autorizado e registrado" |
| Merge na `main` aplica a migration no banco do projeto (o Lovable aplica migrations ao sincronizar) | O PR de implementação precisa de **autorização explícita** para o merge, tratado como mudança no banco remoto |
| Apagar a organização errada | Prévia + `digest` + `decision_ref` obrigatório + administrador de plataforma; nenhuma chamada a partir do app do cliente |
| Tabela nova com `org_id` no futuro fica de fora | Teste que compara a lista de tabelas com `org_id` no catálogo com a lista tratada pela função e falha se aparecer uma nova |
| Descarte parcial (opções A e B) | Fora desta fase. A opção B exige decidir como representar "sem autoria" (colunas hoje `NOT NULL`); vira desenho próprio depois da escolha do Instituto |

## 7. Fases

| Fase | Escopo | Depende de |
|---|---|---|
| F1 | Remoção da organização inteira (organização de teste; opção "não guardar nada") | Escolha de M2 pelo proponente; autorização para implementar em branch; depois, autorização para o merge |
| F2 | Descarte por categoria (respostas, convites, práticas, autoria do ledger) | Escolha entre A e B pelo Instituto e desenho da representação "sem autoria" |

Esforço estimado da F1, só como ordem de grandeza: uma migration com duas funções, uma tabela e duas linhas nos gatilhos, uma suíte SQL, um módulo de servidor com teste, e a repetição do ensaio local. Não há estimativa de prazo; depende de prioridade.

## 8. Decisões necessárias

1. Proponente: M1 (DDL controlado, sem código) ou M2 (este desenho).
2. Se M2: autorizar a F1 numa branch própria, com PR em rascunho e sem merge.
3. Antes do merge: autorização explícita, porque o merge aplica a migration no banco do projeto.
4. Instituto: opção A ou B, que define a F2.

## 9. O que este documento não faz

Não escreve migration, não altera gatilhos, código, banco, Lovable ou o comunicado. Não autoriza nenhum apagamento e não dispensa as pendências do checklist.
