# Registro de continuidade · piloto do Instituto

Um registro só. Ao retomar: ler este arquivo e o diff desde o último SHA verificado.

## Último estado verificado · 22/11/2026 (#58, #59 e #60 mesclados)

| Campo | Valor |
|---|---|
| `main` | `0cf588b` (merge commits: #58 `02bfb9d`, #59 `9734209`, #60 `0cf588b`), com autorização do proponente nesta conversa |
| Equivalência | Código da `main` idêntico ao candidato provado (`e70298b`: gate 4698/0; jornada Q2 54/0); diferença só em uma linha de `docs/`; nenhum arquivo em `supabase/` nos três merges |
| Lovable | Sessão do painel do navegador expirou; sincronização e prévia da nova `main` ainda não conferidas |
| Migration de assentos | Presente na `main`; aplicação no banco do projeto ainda não conferida (leitura autorizada, aguardando login no Lovable) |
| Próximo | Conferir sincronização e prévia; leitura de `reserve_member_invite` no Lovable Cloud; publicação segue reservada |

## Leitura desta sessão

Lido: CHECKPOINT (topo), PIL-01..08, forma adotada do Q1, onda Q3, plan-engine e `member-invite.server.ts` da `main`, os 3 testes do CI. Dispensado: releitura das ondas de ajuda (provadas e já na `main`). Hipótese confirmada: as falhas do CI eram contrato de teste, não código. Continuar em: decisões do relatório de liberação de 22/11. Reusar gate e jornada enquanto o candidato não mudar.
