# Registro de continuidade · piloto do Instituto

Um registro só. Ao retomar: ler este arquivo e o diff desde o último SHA verificado.

## Último estado verificado · 21/11/2026 (MO4)

| Campo | Valor |
|---|---|
| SHA verificado | `main` `5e26e73`; candidato do piloto `feat/mo3-lentes` `a3df96c` (MO2 + MO3 + MO4) |
| Ambiente | Pilha descartável derrubada; recriar com `scripts/integ-local/reset.sh`, app com `app.ts`, dados com `mo2-journey.ts`, login com `mail-link.ts` |
| Evidência reaproveitável | Gate 4680/0 (`c277371`; MO4 só acrescentou docs e um script de apoio); jornada 47/0 no candidato; navegador por papel (MO4) |
| Riscos abertos | D1 migration de assentos (passo 0: confirmar como o Lovable aplica migrations); pacote do Instituto e responsável operacional; PIL-07; Q1/Q3 sem ficha; Q4 sem commit do Codex; Q5 sem modo real |
| Próxima ação | Decisões humanas em lote (MO4 §2–§4); depois PR do candidato para a `main` |

## Leitura desta sessão

Lido: CHECKPOINT (topo), PIL-01..08, forma adotada do Q1, onda Q3, plan-engine e `member-invite.server.ts` da `main`, os 3 testes do CI. Dispensado: releitura das ondas de ajuda (provadas e já na `main`). Hipótese confirmada: as falhas do CI eram contrato de teste, não código. Continuar em: decisões de liberação (MO4). As macro-ondas 1–4 estão fechadas.
