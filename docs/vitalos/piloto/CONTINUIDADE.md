# Registro de continuidade · piloto do Instituto

Um registro só. Ao retomar: ler este arquivo e o diff desde o último SHA verificado.

## Último estado verificado · 22/11/2026 (consolidação do piloto)

| Campo | Valor |
|---|---|
| SHA verificado | `main` `09784aa` (#61); candidato `integ/piloto-candidato` `503ea67` = main + #58 (`69d208f`) + #59 (`de1a3c9`) + #60 (`d62f73b`) |
| Provas | Gate 4698/0 em `e70298b` (o último merge só acrescentou documentos); jornada Q2 54/0 em pilha recriada; navegador por papel (convite → primeiro acesso → Diário); relatório `docs/vitalos/piloto/RELATORIO_LIBERACAO_2026-11-22.md` |
| Lovable | Prévia serve o #61 (`/ivo-integral` com os dois botões de método); cartões marcam "Build malsucedido" (build de produção) desde o #56; ticket de suporte aberto |
| Riscos abertos | Build de produção; migration de assentos sem confirmação no banco do projeto; pacote do Instituto e responsável; cerimônia da devolutiva desligada (decisão de produto) |
| Próximo comando útil | `sh scripts/integ-local/reset.sh` → `bun --no-env-file scripts/integ-local/app.ts` → `bun --no-env-file scripts/integ-local/mo2-journey.ts` (no candidato) |

## Leitura desta sessão

Lido: CHECKPOINT (topo), PIL-01..08, forma adotada do Q1, onda Q3, plan-engine e `member-invite.server.ts` da `main`, os 3 testes do CI. Dispensado: releitura das ondas de ajuda (provadas e já na `main`). Hipótese confirmada: as falhas do CI eram contrato de teste, não código. Continuar em: decisões do relatório de liberação de 22/11. Reusar gate e jornada enquanto o candidato não mudar.
