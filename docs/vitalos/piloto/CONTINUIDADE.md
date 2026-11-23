# Registro de continuidade · piloto do Instituto

Um registro só. Ao retomar: ler este arquivo e o diff desde o último SHA verificado.

## Último estado verificado · 23/11/2026 (migration aplicada; convite ponta a ponta não testado)

| Campo | Valor |
|---|---|
| `main` | `0cf588b` (#58, #59, #60 mesclados). O Lovable está no mesmo commit (conector MCP: `latest_commit_sha` `0cf588b`, projeto `ready`, sem erro, publicado) |
| Migration | Em 22/11, leitura no banco do projeto mostrou `reserve_member_invite` **ausente**. Com autorização explícita do proponente ("somente a migration 20261121120000"), o texto exato de `origin/main:supabase/migrations/20261121120000_reserve_member_invite_atomic.sql` foi aplicado pelo conector do Lovable (consulta ao banco). O bloco de conferência da migration passou |
| Conferência independente | 1 função, 7 argumentos, `SECURITY DEFINER`, `search_path=public`; EXECUTE: `anon` não, `authenticated` não, `service_role` sim |
| Os quatro fatos da migration de assentos | **1.** função presente (1 assinatura, 7 argumentos). **2.** permissões conferidas (`anon`/`authenticated` sem EXECUTE, `service_role` com). **3.** ausente do histórico `supabase_migrations.schema_migrations`. **4.** convite de ponta a ponta no app publicado **não testado**. Os quatro são independentes: nenhum implica outro |
| Não feito | Nenhuma outra migration; nenhum dado de pessoas lido ou escrito (só catálogo de funções e o histórico de migrations); sem publicação |
| Não verificado | Convite real ponta a ponta no app publicado; se o cache de esquema da API já enxerga a função; build de publicação do Lovable (log indisponível) |
| Suporte do Lovable (23/11) | Causa do "Build malsucedido": workspace com **0 créditos**; sem créditos não há build novo nem log. Créditos renovam em ~26/11 ou top-up. Depois, o suporte manda usar "Fix build" no chat (gasta créditos; não usado). A hipótese de erro de TypeScript no arquivo de teste de `e371edd` é improvável: `tsc` passou no gate dessa árvore e o `build` local passa |
| Histórico de migrations | `supabase_migrations.schema_migrations` do projeto tem só 2 registros (`20260713234253`, `20260825022411`), nenhum de `20261121120000`: a função foi aplicada por consulta direta e não está no histórico. O histórico já era não canônico; a função existe e foi conferida no catálogo. A migration usa `CREATE OR REPLACE`, então uma reaplicação futura é inofensiva |
| Próximo | Créditos (top-up ou 26/11) → novo build → publicar com autorização do proponente; teste de convite só com organização de teste autorizada |

## Leitura desta sessão

Lido: CHECKPOINT (topo), PIL-01..08, forma adotada do Q1, onda Q3, plan-engine e `member-invite.server.ts` da `main`, os 3 testes do CI. Dispensado: releitura das ondas de ajuda (provadas e já na `main`). Hipótese confirmada: as falhas do CI eram contrato de teste, não código. Continuar em: decisões do relatório de liberação de 22/11. Reusar gate e jornada enquanto o candidato não mudar.
