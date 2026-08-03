# Especificação — Migration B produtiva (FIBT-1 CONTRACT)

> **Status: ESPECIFICAÇÃO. Nada aqui é executável.**
> Este documento define *o que* a Migration B produtiva precisa garantir.
> O rascunho de SQL vive em `MIGRATION_B_PRODUCTION_DRAFT.sql.disabled` —
> extensão deliberadamente inválida, fora de `supabase/migrations/`, para que
> nenhum pipeline o descubra. Ver `MIGRATION_B_EXECUTION_CHECKLIST.md` para o
> roteiro de execução futura.
>
> Promover este rascunho a migration executável é **decisão humana separada**
> (ver §H).

## Por que um arquivo novo, e não a Migration B de staging

A Migration B canônica
(`supabase/migrations/20260730160000_drop_response_invite_link_contract.sql`,
blob `c0d35c06f359bb1d56c23b06f3e2821df9b45246`) **permanece imutável**. Ela
não pode ser aplicada em produção porque suas preconditions são específicas do
dataset sintético de staging:

| Precondition de staging | Valor congelado | Em produção |
| --- | --- | --- |
| `AFETADAS_ESPERADAS` | `16` | **0** (inventário PROD-0) |
| `ORGS_SINTETICAS` | 2 UUIDs `a0000000-…` | não existem |
| Política de e-mail | aborta se houver e-mail fora de `example.invalid`/`example.com` | produção tem e-mails reais |

Isso **não é um defeito** — é o fail-closed funcionando: a migration recusa
rodar num banco que não é aquele para o qual a autorização humana foi dada.
A consequência correta é derivar um arquivo novo, com timestamp novo, hash
novo, revisão e autorização próprios.

## A. Finalidade

1. Remover `wave_responses.invite_token` — a coluna legada que materializa, no
   schema, o caminho resposta → convite → pessoa.
2. Remover a FK `wave_responses_invite_token_fkey`.
3. Preservar integralmente o contrato de submissão anônima introduzido por
   Migration A e pelo privacy hardening H.
4. Executar **somente** depois de A e H comprovadamente aplicadas e
   verificadas em produção.

Privacidade por desenho é **não guardar** a ligação — não escondê-la. Enquanto
a coluna existir, uma policy futura, um dump ou um RPC descuidado reidentifica.

## B. Preconditions fail-closed

Todas obrigatórias. Qualquer divergência **aborta a transação inteira**.

| # | Precondition | Como se verifica | Natureza |
| --- | --- | --- | --- |
| 1 | `project_ref` de produção confirmado | **externamente**, no painel do Lovable, comparando o ref mascarado. Não se prova por `current_database()` nem `inet_server_addr()` | humana, fora da transação |
| 2 | Migration A integralmente presente | `wave_cohorts` existe; `wave_responses.cohort_id` existe; `waves.instrument_version` existe; constraint `waves_id_org_uk` existe | SQL |
| 3 | Hardening H integralmente presente | `aggregate_cohort_responses` expõe `response_count_label`; `count_cohort_participation` existe | SQL |
| 4 | `wave_responses.invite_token` presente | `information_schema.columns` | SQL |
| 5 | FK legada presente | `information_schema.table_constraints` ⋈ `constraint_column_usage` | SQL |
| 6 | Contagem de afetadas **recalculada dentro da transação** | `SELECT COUNT(*) … WHERE invite_token IS NOT NULL`, executado depois do lock | SQL |
| 7 | `AFETADAS_ESPERADAS = 0` | a contagem de #6 comparada ao valor do inventário PROD-0 | SQL |
| 8 | Zero token órfão | resposta com `invite_token` sem convite correspondente | SQL |
| 9 | Zero token duplicado | mesmo `invite_token` em mais de uma resposta | SQL |
| 10 | Zero divergência resposta–convite–onda | `r.wave_id <> i.wave_id` | SQL |
| 11 | Zero inconsistência resposta–onda–organização | onda da resposta sem `org_id` válido | SQL |
| 12 | Nenhuma resposta criada entre preflight e execução | garantido pela conjunção #6 + #7 sob lock, não por janela de confiança | SQL |
| 13 | Assinaturas esperadas presentes | `submit_wave_response(uuid,text,jsonb)`, `submit_sector_response(text,jsonb)` — conferidas antes de qualquer reescrita | SQL |
| 14 | Snapshot obrigatório **se** qualquer contagem deixar de ser zero | ver §E — condicional, não incondicional | humana + SQL |
| 15 | Abortar em qualquer divergência | `RAISE EXCEPTION` em cada checagem acima | SQL |

### O que foi deliberadamente REMOVIDO em relação a staging

- **Lista fechada de UUIDs de organização.** Em produção não existe conjunto
  sintético autorizado; a invariante correta é *zero linha afetada*, não
  *linhas afetadas pertencem a esta lista*.
- **Política baseada em domínio de e-mail.** Não se consulta nem se valida
  e-mail. Com zero resposta afetada, não há vínculo a inspecionar; se um dia
  houver, a invariante substituta é decidida **naquele momento**, com o
  inventário daquele momento.

## C. Ordem transacional

```
BEGIN
  → mecanismo de exclusão (ver comparação abaixo)
  → rechecagens fail-closed  (preconditions #2 a #13)
  → DROP POLICY IF EXISTS "response_submit"
  → DROP CONSTRAINT IF EXISTS wave_responses_invite_token_fkey
  → DROP COLUMN IF EXISTS invite_token
  → atualização das funções dependentes (submit_sector_response)
  → pós-checks (§D)
COMMIT
```

**Nota de ordem:** as funções dependentes precisam ser corrigidas **antes** do
`DROP COLUMN` se ainda nomearem a coluna. Na Migration B de staging,
`submit_sector_response` é reescrita antes do DROP exatamente por isso. Em
produção a ordem é a mesma; o rascunho mantém a reescrita antes da remoção.

### Mecanismo de exclusão — alternativas comparadas

Não decido isto silenciosamente. As três alternativas reais:

| Alternativa | Como funciona | Vantagem | Risco | Adequação aqui |
| --- | --- | --- | --- | --- |
| **1. `pg_advisory_xact_lock(chave)`** | lock consultivo, liberado no fim da transação | não bloqueia escrita de aplicação; serializa apenas quem coopera com a mesma chave | **não impede** um `INSERT` concorrente vindo de `submit_wave_response`, que não conhece a chave | protege contra *dois operadores* rodando a migration ao mesmo tempo — não contra tráfego de aplicação |
| **2. `LOCK TABLE wave_responses IN ACCESS EXCLUSIVE MODE`** | bloqueia toda leitura e escrita da tabela até o COMMIT | **impede** de fato qualquer INSERT concorrente entre a recontagem e o DROP | bloqueia a aplicação durante a transação; se houver tráfego, requisições esperam ou estouram timeout | é o único que fecha a janela real |
| **3. Nenhum lock explícito** | confia na janela curta | mais simples | a recontagem pode ficar obsoleta entre o `SELECT` e o `DROP` | inaceitável para operação destrutiva |

**Recomendação: alternativa 2 — `LOCK TABLE … IN ACCESS EXCLUSIVE MODE`, com
a alternativa 1 aplicada em conjunto.** Justificativa:

- O `DROP COLUMN` **já adquire** `ACCESS EXCLUSIVE` implicitamente. Adquiri-lo
  explicitamente **no início** da transação, antes das rechecagens, é o que
  torna a contagem de #6 confiável: nada pode inserir entre a contagem e o
  DROP. Sem isso, a precondition #12 seria uma promessa, não uma garantia.
- O custo de bloqueio é irrelevante neste caso concreto: `wave_responses` tem
  **0 linhas** e nenhum dos 30 convites foi enviado — não há tráfego de
  submissão para bloquear.
- O advisory lock (alternativa 1) é somado como defesa barata contra dois
  operadores humanos executando em paralelo, cenário que o lock de tabela
  sozinho resolveria com espera, mas com diagnóstico pior.

**Contraindicação registrada:** se, no momento da execução, a onda estiver
recebendo respostas reais, `ACCESS EXCLUSIVE` derruba a coleta enquanto durar.
Nesse cenário a execução deve ser adiada para uma janela sem tráfego — não
trocada por um lock mais fraco.

## D. Pós-checks obrigatórios

Dentro da mesma transação, antes do COMMIT:

1. `wave_responses.invite_token` **ausente**.
2. FK legada **ausente** — nenhuma FK de `wave_responses` alcança
   `wave_invites`.
3. Nenhuma função referencia `wave_responses` + `invite_token` juntos
   (excetuadas as duas reescritas na própria transação).
4. Nenhum objeto parcialmente criado — `cohort_id` sobreviveu; nada de A/H foi
   removido por efeito colateral.
5. Assinaturas corretas: `submit_wave_response(uuid,text,jsonb)`,
   `submit_sector_response(text,jsonb)`.
6. Contrato de agregação intacto: `aggregate_cohort_responses` continua com as
   8 colunas do hardening; `count_cohort_participation` continua existindo.

Fora da transação, como parte da onda:

7. **Tipos ainda não regenerados** — a regeneração é a onda PROD-5, separada.
8. `VITE_FIBT_PILOT_ENABLED` ainda `false`.
9. `operational_real_collection_status` ainda `blocked_until_release_gate`.

## E. Snapshot

**Não será criado snapshot agora.** Com `wave_responses = 0` e respostas com
`invite_token = 0`, não existe vínculo algum a preservar; um snapshot vazio não
protege nada e cria um artefato sensível para gerenciar sem motivo.

Regra que o substitui:

1. As contagens são **repetidas imediatamente antes** da execução — o
   inventário PROD-0 não vale indefinidamente.
2. Se a recontagem ainda for **0** → prossegue sem snapshot; a precondition #7
   cobre o caso.
3. Se for **> 0** (alguém respondeu um dos 30 convites no intervalo) →
   - **aborta** a execução;
   - exige snapshot privado (fora do repositório, mesmo formato do precedente
     de staging);
   - exige SHA-256 calculado e registrado;
   - exige caminho de custódia registrado;
   - exige **nova autorização humana específica** — a autorização desta onda
     não cobre esse cenário.

Isto é mais seguro que gerar um snapshot agora e presumir validade futura: o
intervalo entre preparar e executar é exatamente onde um convite poderia ser
respondido.

## F. Rollback

| Momento | Situação | Rollback |
| --- | --- | --- |
| **Antes do DROP** | precondition falhou | `RAISE EXCEPTION` → `ROLLBACK` automático. Nada foi alterado. **Plenamente reversível.** |
| **Dentro da transação** | erro após o DROP, antes do COMMIT | `ROLLBACK` desfaz DDL — Postgres é transacional para DDL. **Plenamente reversível.** |
| **Depois do COMMIT, com 0 linhas afetadas** | estado atual esperado | Recriar coluna + FK restaura o **schema**. Não há dado a restaurar porque não havia nenhum. **Reversível em schema, sem perda de dado.** |
| **Depois do COMMIT, com linhas afetadas** | só ocorre se §E foi violado | Requer snapshot. Recriar coluna, recriar FK, restaurar valores. **Reversível apenas com snapshot.** |
| **Depois do COMMIT, com linhas afetadas e sem snapshot** | cenário proibido por §E | **Irreversível.** Os valores de `invite_token` não existem em nenhum outro lugar. |

**Critério para nunca executar rollback de dados:** se a restauração não for
estritamente necessária para corrigir falha funcional comprovada, não
restaurar. A perda dos tokens é o **objetivo** da migration, não o dano — e
restaurá-los reconstrói exatamente o vínculo que se decidiu eliminar. Depois de
recuperado o que for indispensável, a coluna deve ser removida de novo.

## G. ACLs — fora de escopo desta migration

Esta mudança **não toca privilégios**. Explicitamente não altera:

- `PUBLIC`;
- `anon`;
- `authenticated`;
- `service_role`;
- `sandbox_exec` — papel **gerenciado da plataforma** (LOGIN, BYPASSRLS,
  CONNECT, default privileges). Nunca entra em migration da aplicação e nunca
  é alvo de `REVOKE` nosso;
- default privileges.

Exceção necessária e delimitada: ao reescrever `submit_sector_response`, o
`REVOKE`/`GRANT` que **já acompanha aquela função** na Migration B de staging é
preservado — é parte da definição da função, não uma mudança de política de
ACL. Nenhuma outra função tem privilégio alterado.

A remediação de ACL identificada na Q19 (`PUBLIC EXECUTE` em 7 funções
`SECURITY DEFINER`) é **trilha separada** (ACL-0 → ACL-4). Ela deve estar
concluída **antes da ativação da FIB-T** — não necessariamente antes da
Migration A ou B, porque A e B já revogam `PUBLIC` nas duas funções que
reescrevem, e as outras 5 não são tocadas por nenhuma delas.

## H. Promoção a migration executável — decisão humana

Este rascunho **não** vira migration por iniciativa técnica. Para promover:

1. Revisão humana desta especificação e do rascunho SQL.
2. Confirmação de que o inventário PROD-0 ainda vale (contagens recontadas).
3. Confirmação externa do `project_ref` de produção.
4. Migrations A e H **aplicadas e verificadas** em produção.
5. Decisão explícita sobre o mecanismo de lock (§C) — recomendação registrada,
   não imposta.
6. Autorização escrita para criar o arquivo em `supabase/migrations/` com
   timestamp definitivo, seguido de PR, gate e autorização de aplicação
   separada.

Enquanto esses seis pontos não estiverem satisfeitos, o arquivo permanece
`.sql.disabled`, fora de `supabase/migrations/`, invisível para o pipeline.
