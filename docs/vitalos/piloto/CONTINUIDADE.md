# Registro de continuidade · piloto do Instituto

Um registro só. Ao retomar: ler este arquivo e o diff desde o último SHA verificado.

## Último estado verificado · 22/11/2026 (reconciliação do #58)

| Campo | Valor |
|---|---|
| `main` | `09784aa` (contém #57 e a migration `20261121120000`, uma vez) |
| PRs | #58 `feat/mo3-lentes` `473fed0` (main mesclada; sem `supabase/` no diff) · #59 `de1a3c9` · #60 `d62f73b` (ambos sem `supabase/`) |
| Candidato | `integ/piloto-candidato` `88349e4` (conteúdo igual a `e70298b` fora de `docs/`) |
| Provas válidas | Gate 4698/0 em `e70298b`; gate 4686/0 em `923d2b5` (#58 + main, repetido); jornada 54/0 em `28b6b11` (mudanças posteriores fora do caminho da API) |
| Migration | Presente na `main`; aplicação no banco do projeto não confirmada |
| Pendente | Aplicar no GitHub a descrição `docs/vitalos/piloto/PR58_DESCRICAO_2026-11-22.md` (sessão do GitHub ausente no navegador) |
| Próximo comando útil | `sh scripts/integ-local/reset.sh` → `bun --no-env-file scripts/integ-local/app.ts` → `bun --no-env-file scripts/integ-local/mo2-journey.ts` |

## Leitura desta sessão

Lido: CHECKPOINT (topo), PIL-01..08, forma adotada do Q1, onda Q3, plan-engine e `member-invite.server.ts` da `main`, os 3 testes do CI. Dispensado: releitura das ondas de ajuda (provadas e já na `main`). Hipótese confirmada: as falhas do CI eram contrato de teste, não código. Continuar em: decisões do relatório de liberação de 22/11. Reusar gate e jornada enquanto o candidato não mudar.
