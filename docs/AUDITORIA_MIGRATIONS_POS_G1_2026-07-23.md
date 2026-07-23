# Auditoria RLS / SECURITY DEFINER — Migrations pós-G1 (#30–#40)

> Continuação direta de `docs/AUDITORIA_DE_PRODUCAO_VITALOS_G1.md` (commit
> `90a1f10`, 2026-07-09, cutoff em 29 migrations). Esta auditoria cobre as
> **11 migrations criadas depois do G1** (`supabase/migrations/#30` a `#40`,
> 2026-07-09 a 2026-07-14), usando a metodologia da skill
> `supabase-rls-security-definer-auditor` (auditoria das duas camadas: SQL
> RLS/RPC + TypeScript server-only).
>
> **Método:** leitura read-only do repositório (11 migrations + 8 arquivos
> `.server.ts`/adapter + testes) + reexecução de `bun run parity` (exit 0,
> "Paridade de schema OK"). Nenhuma migration, seed ou comando de produção
> foi rodado nesta auditoria.
>
> **Regra de honestidade (mesma convenção do G1):** `[CÓDIGO]` = verificável
> estaticamente neste repo, reexecutado agora; `[PRODUÇÃO]` = só o founder
> pode confirmar (requer query no Supabase/Lovable real).

## 1. Escopo confirmado

`ls supabase/migrations | sort` → 40 arquivos. Migration #29
(`20260709140000_leads.sql`) é o corte exato citado pelo G1 ("29 migrations,
parity-check verde"). Migrations #30–#40 (11 arquivos) nunca haviam sido
auditadas:

| # | Arquivo | O que cria |
|---|---|---|
| 30 | `20260709150000_practice_entries.sql` | Diário de prática pessoal (own-only, sem UPDATE) |
| 31 | `20260709160000_seed_events.sql` | Ledger de sementes (insert-only, nem o dono edita/apaga) |
| 32 | `20260710115614_463d3c6b-....sql` | **Duplicata funcional de #29** (`leads`) |
| 33 | `20260710121521_ac98d677-....sql` | No-op (`SELECT 1;`) |
| 34 | `20260710130000_pair_directory.sql` | Diretório consentido de colegas (org-shared-read, own-write) |
| 35 | `20260710140000_bilateral_pairs.sql` | Convites + duplas de prática (RPCs `accept/decline/cancel_pair_invite`) |
| 36 | `20260710150000_circle_sessions.sql` | Círculos Vivos — sem coluna de participantes (privacidade por schema) |
| 37 | `20260713210000_add_wave_invites_email.sql` | `ALTER TABLE wave_invites ADD COLUMN email` |
| 38 | `20260713234252_8e382d9e-....sql` | **Duplicata de #37** |
| 39 | `20260714120000_member_invites.sql` | Convite de 2ª+ pessoa numa org existente + RPC `accept_member_invite` |
| 40 | `20260714130000_fix_accept_member_invite_execute_grant.sql` | Fix auto-descoberto do EXECUTE-grant de #39 |

## 2. Achados

### Achado 1 — EXECUTE-grant de `accept_member_invite` — FECHADO, confirmado em produção

```
Risco (histórico): o scanner de segurança do Lovable concede automaticamente
EXECUTE a `authenticated` em toda função SECURITY DEFINER nova —
accept_member_invite nunca confere se o CHAMADOR é o próprio p_user_id (só
confere e-mail do convite), então se o grant automático não tivesse sido
revertido em produção, qualquer pessoa logada poderia criar um perfil de
organização para outra pessoa sem consentimento dela.
Evidência: accept_member_invite valida e-mail vs. p_user_id (linhas 117-121)
mas nunca `auth.uid() = p_user_id`; migration #39 já termina em
REVOKE FROM PUBLIC / GRANT TO service_role (linhas 143-144); migration #40
documenta que a query de verificação, colada no Lovable logo após aplicar
#39, encontrou has_function_privilege('authenticated', ...) = TRUE mesmo
assim — mesma classe de achado já vista em provision_organization_from_invite
(achado #3, 20260705160043) — e reaplica o REVOKE.
Arquivo/linha: supabase/migrations/20260714120000_member_invites.sql:117-121,143-144
             supabase/migrations/20260714130000_fix_accept_member_invite_execute_grant.sql:29-30
Severidade: era P0 [PRODUÇÃO — pendente] até a confirmação abaixo; hoje P3
[CÓDIGO] — o código-fonte já continha e documentava o fix, e a produção
confirma que ele está em vigor.
Confirmação `[PRODUÇÃO]` (2026-07-23, via SQL Editor do Lovable): founder
rodou `SELECT has_function_privilege('authenticated',
'public.accept_member_invite(text,uuid)', 'EXECUTE');` → retornou `false`.
Migration #40 está aplicada e em vigor no banco vivo. Achado fechado nas
duas camadas.
Teste obrigatório: não aplicável via bun test — era estado do banco vivo,
não do código, e já foi confirmado diretamente. Do lado da aplicação,
src/lib/api/member-invite.functions.ts:104-108 já confirmava que
acceptMemberInvite sempre recebe userId de resolveAuthenticatedUserId(accessToken),
nunca do payload — fechando o único vetor client-side que tornaria isto
explorável, independente da camada de banco.
```

### Achado 2 — `accept_pair_invite` não revalida org_id no aceite

```
Risco: a RPC confere visibilidade no diretório de ambas as partes, mas não
reconfere se to_user ainda pertence à mesma org do convite no momento do
aceite (só é checado no INSERT do convite, via WITH CHECK).
Arquivo/linha: supabase/migrations/20260710140000_bilateral_pairs.sql:107-121
Severidade: P3 — não existe hoje nenhum fluxo de "trocar de organização" no
produto; janela teórica, não uma exploração viável no estado atual.
Correção sugerida: se um fluxo de troca de org for construído, adicionar
checagem de org_id de ambas as partes dentro da RPC antes do INSERT em
pair_records.
Teste obrigatório: teste adversarial mudando org_id de to_user entre convite
e aceite — não existe hoje.
```

### Achado 3 — migrations duplicadas (higiene, não segurança)

```
Risco: nenhum — IF NOT EXISTS / ADD COLUMN IF NOT EXISTS tornam as
duplicatas no-ops. Indica drift no processo de geração de migration.
Arquivo/linha: supabase/migrations/20260710115614_463d3c6b-....sql (dup de #29)
             supabase/migrations/20260713234252_8e382d9e-....sql (dup de #37)
Severidade: P3
Correção sugerida: nenhuma ação em produção necessária; conferir histórico
antes de commitar novas migrations geradas pelo Lovable.
```

### Achado 4 — cobertura de teste dos adapters cliente (informativo)

```
Risco: pair-directory-adapter, pair-invite-adapter e circle-sessions-adapter
só têm testes de "transporte" contra fakes que não modelam RLS — nenhum
teste adversarial cross-tenant (diferente do padrão server-side, ex.
wave-admin.server.test.ts).
Arquivo/linha: src/lib/cloud/pair-directory-adapter.test.ts,
             src/lib/cloud/pair-invite-adapter.test.ts,
             src/lib/cloud/circle-sessions-adapter.test.ts
Severidade: P3 — gap estrutural de todo adapter client-side RLS-gated neste
repo (não é regressão destas 11 migrations); mitigado por revisão manual do
SQL (feita nesta auditoria).
Correção sugerida: só relevante se/quando o repo ganhar infraestrutura de
teste de integração contra Postgres real.
```

### Achado 5 — GRANT de tabela/EXECUTE aberto em 6 superfícies de #30/#31/#34/#35/#36 — FECHADO, confirmado em produção

```
Risco (histórico): o REVOKE ALL explícito das migrations #30 (practice_entries),
#31 (seed_events), #34 (pair_directory_entries), #35 (pair_invites,
pair_records, accept_pair_invite) e #36 (circle_sessions) não estava em
vigor no banco vivo — authenticated/anon tinham privilégios de tabela/EXECUTE
além do que cada migration concedia explicitamente (ex.: UPDATE em
practice_entries e circle_sessions, que foram desenhadas para nunca ter
UPDATE nem por policy nem por GRANT). Mesma classe de drift já documentada
para `profiles` (20260703170000_fix_profile_revoke_table_level_grant.sql) e
para `accept_member_invite` (Achado 1) — nesta conta Supabase, ALTER DEFAULT
PRIVILEGES concede ALL por padrão a tabela nova, e o REVOKE explícito da
migration original nem sempre "gruda" contra esse default.
Como foi encontrado: varredura de confirmação em produção pedida pelo
founder após o fechamento do Achado 1 (não fazia parte dos 4 achados
originais desta auditoria, que era só leitura estática de código) — 12 de
14 checks de privilégio esperando `false` vieram `true`; a contagem de
policies de cada tabela bateu certo (3/2/4/3/2), confirmando que as
migrations tinham aplicado tabelas e RLS corretamente — só o REVOKE de
privilégio de tabela/função não tinha colado.
Verificação de exploração real: RLS confirmado HABILITADO
(relrowsecurity = true) nas 6 tabelas antes de qualquer correção — rebaixa
de risco ativo (P0) para gap de defesa em profundidade (P2): as policies já
bloqueavam acesso linha a linha independente do GRANT de tabela estar
aberto, mas a segunda camada estava ausente.
Correção aplicada `[PRODUÇÃO]` (2026-07-23, via SQL Editor do Lovable, pelo
founder): reaplicados os REVOKE/GRANT originais e idênticos de cada
migration (#30, #31, #34, #35, #36) — nenhuma migration nova nem alteração
de código, só recolar os privilégios já documentados.
Confirmação `[PRODUÇÃO]`: reexecução das 12 checagens após a correção — as
12 voltaram `false = false` (esperado = obtido). Fechado.
Arquivo/linha: supabase/migrations/20260709150000_practice_entries.sql:58-60
             supabase/migrations/20260709160000_seed_events.sql:52-54
             supabase/migrations/20260710130000_pair_directory.sql:72-74
             supabase/migrations/20260710140000_bilateral_pairs.sql:61-63,86-88,163-168
             supabase/migrations/20260710150000_circle_sessions.sql:54-56
Severidade: era P2 [PRODUÇÃO] (RLS mitigava); hoje P3 [CÓDIGO+PRODUÇÃO] —
GRANT e RLS agora alinhados nas duas camadas.
Teste obrigatório: não aplicável via bun test (estado de banco vivo); já
confirmado diretamente pela query de verificação re-executada.
```

## 3. O que só o founder pode confirmar

1. ~~Migration #40 foi de fato aplicada no Lovable?~~ **Confirmado em
   2026-07-23** — ver Achado 1.
2. ~~GRANT de tabela/EXECUTE de #30/#31/#34/#35/#36 batendo com o pretendido?~~
   **Corrigido e confirmado em 2026-07-23** — ver Achado 5. Reforça a
   recomendação: para toda migration nova nesta conta Supabase, sempre
   confirmar as queries `has_table_privilege`/`has_function_privilege` do
   rodapé contra o banco vivo — REVOKE em arquivo não é garantia de REVOKE
   aplicado (3ª vez que este exato padrão se repete no repo: `profiles`,
   `accept_member_invite`, agora estas 6 superfícies).
3. Nenhuma pendência restante desta auditoria.

## 4. Conclusão

Nenhum P0/P1/P2 aberto — os dois achados de severidade alta (Achado 1 e
Achado 5) foram ambos fechados e confirmados em produção em 2026-07-23. O
padrão se repetiu uma terceira vez neste repo (REVOKE em migration não
implica REVOKE em vigor nesta conta Supabase); recomenda-se tratar a
verificação pós-aplicação como passo obrigatório do runbook de toda
migration nova, não como item opcional. Nenhuma migration foi executada nem
correção aplicada pelo Claude Code nesta auditoria — só leitura, análise, e
a construção das queries; toda escrita em produção (a correção do Achado 5
e a confirmação do Achado 1) foi feita pelo founder diretamente no Lovable,
conforme a skill `supabase-rls-security-definer-auditor`.
