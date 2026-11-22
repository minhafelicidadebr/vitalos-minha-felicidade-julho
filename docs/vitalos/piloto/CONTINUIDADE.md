# Registro de continuidade · piloto do Instituto

Um registro só. Ao retomar: ler este arquivo e o diff desde o último SHA verificado.

## Último estado verificado · 22/11/2026 (migration de assentos aplicada)

| Campo | Valor |
|---|---|
| `main` | `0cf588b` (#58, #59, #60 mesclados). O Lovable está no mesmo commit (conector MCP: `latest_commit_sha` `0cf588b`, projeto `ready`, sem erro, publicado) |
| Migration | Em 22/11, leitura no banco do projeto mostrou `reserve_member_invite` **ausente**. Com autorização explícita do proponente ("somente a migration 20261121120000"), o texto exato de `origin/main:supabase/migrations/20261121120000_reserve_member_invite_atomic.sql` foi aplicado pelo conector do Lovable (consulta ao banco). O bloco de conferência da migration passou |
| Conferência independente | 1 função, 7 argumentos, `SECURITY DEFINER`, `search_path=public`; EXECUTE: `anon` não, `authenticated` não, `service_role` sim |
| Não feito | Nenhuma outra migration, nenhum dado lido ou escrito, sem publicação |
| Não verificado | Convite real ponta a ponta no app publicado; se o cache de esquema da API já enxerga a função; build de publicação do Lovable (log indisponível) |
| Próximo | Teste de convite só com organização de teste autorizada; publicação segue reservada ao proponente |

## Leitura desta sessão

Lido: CHECKPOINT (topo), PIL-01..08, forma adotada do Q1, onda Q3, plan-engine e `member-invite.server.ts` da `main`, os 3 testes do CI. Dispensado: releitura das ondas de ajuda (provadas e já na `main`). Hipótese confirmada: as falhas do CI eram contrato de teste, não código. Continuar em: decisões do relatório de liberação de 22/11. Reusar gate e jornada enquanto o candidato não mudar.
