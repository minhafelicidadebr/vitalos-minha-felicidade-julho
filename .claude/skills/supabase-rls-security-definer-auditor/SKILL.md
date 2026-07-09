---
name: supabase-rls-security-definer-auditor
description: Use when writing or reviewing any Supabase migration, RLS policy, RPC/SECURITY DEFINER function, GRANT/REVOKE statement, or any server code that resolves org_id/tenant/membership in this project (VitalOS). Also invoke explicitly when asked to "audit RLS", "check security", or "review this migration" for cross-tenant leakage. Not for general app logic reviews.
---

# Supabase RLS / SECURITY DEFINER Auditor

Contexto real deste repo: não há Supabase Edge Functions (`supabase/functions/`
não existe) — a lógica privilegiada vive em `src/lib/**/*.server.ts`
(TanStack Start server functions, service role importado dinamicamente) e em
RPCs `SECURITY DEFINER` nas migrations (`supabase/migrations/*.sql`). Esta
skill audita as DUAS camadas: SQL (RLS/RPC) e TypeScript server-only.

Padrões JÁ estabelecidos neste repo (não redescobrir, verificar aderência):
- `REVOKE ALL ... FROM PUBLIC, authenticated, anon` seguido de
  `GRANT ... TO service_role` em toda tabela nova (a conta Supabase usada
  aqui tem `ALTER DEFAULT PRIVILEGES` concedendo ALL por padrão — o REVOKE
  explícito é obrigatório, nunca opcional).
- `REVOKE EXECUTE ... FROM PUBLIC, authenticated` + `GRANT EXECUTE ... TO
  anon, service_role` (ou só `service_role`) em toda RPC `SECURITY DEFINER`
  nova.
- `SECURITY DEFINER SET search_path = public` sempre junto — nunca uma
  função `SECURITY DEFINER` sem `search_path` fixo.
- `orgId`/`waveId` autorizado NUNCA vem do payload do cliente — vem de
  `requireOrgAdmin(accessToken)` / `resolveOrgMembership(accessToken)`
  (`src/lib/auth/authorize.server.ts`), que resolve a sessão real.
- Verificação de privilégio pós-migration com `has_table_privilege`/
  `has_function_privilege` colada no rodapé do próprio arquivo `.sql` — o
  REVOKE da migration não é garantia por si só nesta conta, precisa ser
  CONFERIDO.

## Checklist de auditoria

Para cada migration ou server function tocada, verifique:

1. **Policies permissivas demais** — `FOR ALL` sem `USING`/`WITH CHECK`
   restritivo; policy que não distingue papel/tenant.
2. **Colunas sensíveis sem restrição** — `GRANT UPDATE` na tabela inteira
   quando só um subconjunto de colunas deveria ser editável pelo dono
   (ex.: `role`/`org_id` em `profiles` — ver migration de
   `revoke_profile_self_elevation` como precedente).
3. **`role`/`org_id` editáveis pelo próprio usuário** — nunca aceitável;
   deve haver REVOKE de coluna ou trigger de bloqueio.
4. **RPC `SECURITY DEFINER` sem `search_path` fixo** — risco de sequestro
   de schema.
5. **`GRANT EXECUTE` amplo demais** — checar se `PUBLIC`/`authenticated`
   ainda tem EXECUTE numa função que deveria ser só `anon` (link público de
   uso único) ou só `service_role` (chamada apenas do server).
6. **Uso de service role em código acessível pelo cliente** — `supabaseAdmin`
   nunca deve ser importado por um arquivo sem sufixo `.server.ts`, nem por
   um componente/rota client-side.
7. **Função aceitando `orgId` do payload sem validar membership** — toda
   função que recebe um id de organização/onda deve confirmar que a sessão
   autenticada pertence a essa organização ANTES de ler/escrever qualquer
   dado, não depois.
8. **Ausência de vínculo tenant→usuário** — RPCs que tocam dado
   multi-tenant precisam de `FOR UPDATE`/checagem de vínculo (ver
   `submit_wave_response`, `submit_sector_response` como padrão-ouro: trava
   a linha, confere vínculo, só então insere).
9. **Schema drift entre migrations, `types.ts` e código** — rode
   `bun run parity` (compara `schema-manifest.ts` contra as migrations
   aplicadas) antes de declarar uma dependência de coluna nova como segura.
10. **Ausência de teste adversarial cross-tenant** — toda função org-scoped
    nova precisa de um teste que prova que a org B não lê/escreve dado da
    org A (padrão: `mock.module` com duas orgs distintas, ver
    `wave-admin.server.test.ts`).

## Formato de saída obrigatório

Para cada achado, reporte exatamente:

```
Risco: <uma frase>
Evidência: <trecho de código/SQL ou comportamento observado>
Arquivo/linha: <caminho:linha>
Severidade: P0 | P1 | P2 | P3
Correção sugerida: <o que mudar>
Teste obrigatório: <o teste que provaria a correção>
```

Severidade:
- **P0** — vazamento cross-tenant, dado sensível exposto, ou escrita não
  autorizada possível agora.
- **P1** — falha silenciosa (finge sucesso sem persistir) ou controle
  ausente que vira P0 sob uso real.
- **P2** — falta de defesa em profundidade (funcionaria hoje, mas só uma
  camada protege).
- **P3** — desvio de convenção sem exploração conhecida.

Nunca rode a migration nem aplique a correção sem confirmação — esta skill
audita e recomenda; a decisão de aplicar em produção é do founder.
