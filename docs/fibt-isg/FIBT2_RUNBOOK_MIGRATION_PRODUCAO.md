# Runbook preparatório — aplicação das migrations FIBT-1 em produção

> **Status: PREPARATÓRIO. Nada aqui foi executado.**
> Nenhuma das três migrations foi aplicada em produção. Este documento existe
> para que, quando a decisão for tomada, ela seja executada por um roteiro
> escrito antes — e não improvisada no momento em que o banco real está aberto.
>
> Este runbook **não autoriza** aplicação. Autorização é ato separado, do
> responsável pelo projeto, registrado por escrito.

## Estado atual

- As três migrations estão aplicadas **no staging** e provadas dinamicamente lá.
- **Não** estão aplicadas em produção.
- `operational_real_collection_status = blocked_until_release_gate` — e
  permanece assim durante e depois desta aplicação. Aplicar schema **não**
  libera coleta real; são decisões diferentes, com donos diferentes.
- `VITE_FIBT_PILOT_ENABLED=false` em todo ambiente.

## Artefatos e hashes normativos

Aplicar exatamente estes arquivos, nesta ordem. Confira o hash **antes** de
colar cada um: um arquivo que não bate não é o arquivo revisado.

| # | arquivo | git blob | SHA-256 |
| --- | --- | --- | --- |
| 1 | `20260730150000_generic_anonymous_submissions_expand.sql` | `32710cca979f428461ea6a0c5bf47cede03d6ee3` | `3121fafe15a5985d8d92d282edf2e608adcddf3d6ee526b0504dfc4b891a941e` |
| 2 | `20260730155000_cohort_aggregate_privacy_hardening.sql` | `25cc1d41c828e24e6456be0ac414c18793ac1089` | `a38a17a40be7ed64397be6a5bac7f5bea3a6b106a52fad455a3fffaede1024a9` |
| 3 | `20260730160000_drop_response_invite_link_contract.sql` | `c0d35c06f359bb1d56c23b06f3e2821df9b45246` | `98ed8277bccf4a2fdb68ce2de8947cf05efe62ab69594267d3ac6269059bbb12` |

Conferência:

```bash
git hash-object supabase/migrations/20260730150000_generic_anonymous_submissions_expand.sql
```

**A ordem não é sugestão.** A migration 3 (CONTRACT) tem uma precondition
fail-closed que exige a 2 (hardening) já aplicada, e aborta a transação inteira
se não estiver. A 1 é aditiva (EXPAND); a 3 é a única destrutiva.

## Preconditions — todas obrigatórias, todas antes de começar

1. Confirmação escrita, do responsável pelo projeto, autorizando **esta**
   aplicação em produção.
2. Confirmação de **qual projeto Supabase** o app publicado no Lovable usa
   hoje (painel → configurações de Cloud). Comparar o `project_ref` mascarado
   com o esperado. Ver `docs/AMBIENTES_E_DEPLOY.md`.
3. Snapshot da produção feito e verificado (seção seguinte).
4. Janela combinada, fora de horário de uso, com o responsável disponível.
5. `main` sem commits novos desde a última verificação do gate.
6. Nenhuma outra alteração de schema em andamento (Lovable, outro operador).
7. A branch de código correspondente **já integrada** — schema novo sem código
   que o use é seguro; código que usa schema inexistente não é.

## Snapshot antes de qualquer escrita

A migration 3 executa `DROP COLUMN invite_token`. O valor dessa coluna **não
existe em nenhum outro lugar** depois disso.

1. Exportar `wave_responses` (todas as colunas, todas as linhas) para arquivo
   **fora do repositório**, em diretório privado.
2. Registrar o SHA-256 do arquivo e a contagem de linhas neste runbook, na
   seção de execução.
3. Confirmar que o arquivo **não** está dentro de nenhuma worktree do git
   (`git ls-files` não pode listá-lo, e o caminho não pode estar sob o repo).
4. Confirmar que o arquivo não contém e-mail nem token em claro além do
   estritamente necessário para restauração.

Precedente: o snapshot da FIBT-1 em staging seguiu exatamente este formato
(4097 bytes, 16 registros, SHA-256 registrado, fora do repo).

## Execução

Para cada migration, na ordem 1 → 2 → 3:

1. Conferir o hash do arquivo.
2. Colar o arquivo **inteiro** no chat do Lovable, pedindo execução no banco
   conectado (`docs/RUNBOOK_MIGRACOES_LOVABLE.md` — não há `psql` direto).
3. Colar de volta a confirmação do Lovable. **Se aparecer diff inesperado em
   alguma função, parar e investigar** — pode haver lógica de produção não
   versionada.
4. Rodar as queries de verificação do rodapé do próprio arquivo `.sql`.
   Lição já paga duas vezes nesta base: `GRANT`/`REVOKE` que "rodou sem erro"
   pode ser no-op silencioso — o efeito só se prova consultando
   `has_table_privilege` / `has_function_privilege` no banco vivo.
5. Só então passar para a próxima.

## Critérios de abortar

Interromper imediatamente, sem tentar corrigir no meio, se:

- qualquer hash não bater;
- o Lovable mostrar diff inesperado numa função;
- a precondition fail-closed da migration 3 disparar `RAISE EXCEPTION`
  (isso é o sistema funcionando — investigar, nunca contornar);
- qualquer contagem do pós-check divergir do esperado;
- o projeto conectado não for o confirmado na precondition 2;
- aparecer qualquer escrita concorrente durante a janela.

Abortar no meio é seguro **entre** migrations (cada uma é uma transação). Não
existe "meio de uma migration": ou a transação inteira passou, ou nada dela
passou.

## Rollback

| migration | reversível? | como |
| --- | --- | --- |
| 1 (EXPAND) | sim | é aditiva: `DROP` das estruturas novas, sem perda de dado preexistente |
| 2 (hardening) | sim | reinstalar a versão anterior da função (está no arquivo da migration 1) |
| 3 (CONTRACT) | **não, sem o snapshot** | recriar a coluna e restaurar do snapshot |

Para a 3, o roteiro de restauração existe e está testado em staging:
`scripts/fibt1-restore-invite-links.ts` — dry-run por padrão, verifica SHA-256
do snapshot e o `project_ref` do alvo antes de emitir qualquer `UPDATE`.
**Ele nunca foi executado em modo `--apply`.**

Rollback do código é separado: reverter o merge não desfaz schema, e desfazer
schema não reverte o código.

## Pós-check

Depois das três aplicadas:

1. Contagens de `organizations`, `waves`, `wave_invites`, `wave_responses`
   idênticas às do pré-check (nenhuma migration apaga linha).
2. `wave_responses.invite_token` **não existe** mais.
3. A FK `wave_responses_invite_token_fkey` **não existe** mais.
4. Junção `wave_responses ⋈ wave_invites ON invite_token` falha por coluna
   inexistente — a ligação resposta→convite não existe mais no schema.
5. `aggregate_cohort_responses` devolve o contrato de 8 colunas (com
   `response_count_label` e `suppression_reason`).
6. `count_cohort_participation` existe e nega `anon`.
7. Nenhuma função nova retém `EXECUTE` para `PUBLIC` — conferir com
   `has_function_privilege`, não presumir do `REVOKE`.
8. Fluxo de submissão setorial (`submit_sector_response`) continua funcionando:
   o link setorial é caminho vivo em produção.

## Smoke test

Somente leitura, sem criar dado real:

1. `/admin` abre e lista as ondas existentes.
2. Uma onda já selada continua exibindo o relatório protegido.
3. Um link setorial existente continua aceitando resposta (testar em staging,
   **não** criar resposta real em produção).
4. `/fibt-piloto` **continua indisponível** — `VITE_FIBT_PILOT_ENABLED` segue
   `false`. O schema estar pronto não liga o piloto.

## Publicação

**Proibido acionar "Publish changes" antes de todas as três migrations
aplicadas e de todos os itens do pós-check verificados.**

A ordem importa: publicar código que usa schema inexistente quebra ao vivo;
aplicar schema sem publicar código é inerte e seguro. Portanto — schema
primeiro, publicação depois, nunca o contrário.

Mesmo depois de tudo verde, publicar é decisão separada, com autorização
separada.

## O que este runbook não faz

- Não libera coleta real: `operational_real_collection_status` permanece
  `blocked_until_release_gate`.
- Não liga o piloto FIB-T.
- Não autoriza convite real, importação de pessoa real ou envio de e-mail.
- Não substitui a revisão externa independente da superfície SQL, que segue
  sendo uma ressalva aberta e formalmente aceita como risco na PR #32.
