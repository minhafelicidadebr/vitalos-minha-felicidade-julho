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

### Achado 1 — EXECUTE-grant de `accept_member_invite` (severidade condicional a produção)

```
Risco: o scanner de segurança do Lovable concede automaticamente EXECUTE a
`authenticated` em toda função SECURITY DEFINER nova — accept_member_invite
nunca confere se o CHAMADOR é o próprio p_user_id (só confere e-mail do
convite), então se o grant automático não tiver sido revertido em produção,
qualquer pessoa logada poderia criar um perfil de organização para outra
pessoa sem consentimento dela.
Evidência: accept_member_invite valida e-mail vs. p_user_id (linhas 117-121)
mas nunca `auth.uid() = p_user_id`; migration #39 já termina em
REVOKE FROM PUBLIC / GRANT TO service_role (linhas 143-144); migration #40
documenta que a query de verificação, colada no Lovable logo após aplicar
#39, encontrou has_function_privilege('authenticated', ...) = TRUE mesmo
assim — mesma classe de achado já vista em provision_organization_from_invite
(achado #3, 20260705160043) — e reaplica o REVOKE.
Arquivo/linha: supabase/migrations/20260714120000_member_invites.sql:117-121,143-144
             supabase/migrations/20260714130000_fix_accept_member_invite_execute_grant.sql:29-30
Severidade: P0 [PRODUÇÃO — pendente] se #40 não foi de fato aplicado no
banco vivo; P3 [CÓDIGO] — o código-fonte já contém e documenta o fix.
Correção sugerida: nenhuma mudança de código. Rodar no SQL Editor do Lovable:
  SELECT has_function_privilege('authenticated', 'public.accept_member_invite(text,uuid)', 'EXECUTE');
  Deve retornar false. Se retornar true, recolar o REVOKE de #40 (idempotente).
Teste obrigatório: não aplicável via bun test — é estado do banco vivo, não
do código. src/lib/api/member-invite.functions.ts:104-108 já confirma, do
lado da aplicação, que acceptMemberInvite sempre recebe userId de
resolveAuthenticatedUserId(accessToken), nunca do payload — fechando o único
vetor client-side que tornaria isto explorável.
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

## 3. O que só o founder pode confirmar

1. **Migration #40 foi de fato aplicada no Lovable?** — ver Achado 1. Esta é
   a única lacuna real que resta fechar; a query de verificação já está
   colada no rodapé da própria migration.
2. Nenhum outro item desta auditoria depende de confirmação em produção —
   os achados 2–4 são de código/design, verificáveis estaticamente.

## 4. Conclusão

Nenhum P0/P1 confirmado *no código* — o único achado de severidade alta
(Achado 1) já foi auto-detectado e corrigido no próprio repositório antes
desta auditoria começar; falta só a confirmação de que o fix chegou ao banco
vivo. Nenhuma migration foi executada nem correção aplicada nesta sessão —
só auditoria e recomendação, conforme a skill `supabase-rls-security-definer-auditor`.
