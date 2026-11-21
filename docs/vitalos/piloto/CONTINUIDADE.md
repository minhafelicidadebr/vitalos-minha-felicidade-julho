# Registro de continuidade · piloto do Instituto

Um registro só. Ao retomar: ler este arquivo e o diff desde o último SHA verificado.

## Último estado verificado · 21/11/2026 (MO2)

| Campo | Valor |
|---|---|
| SHA verificado | `main` `5e26e73`; candidato MO2 `feat/mo2-jornada-q2` `480f7c5` (assentos + D2 + roteiro) |
| Ambiente | Pilha descartável `vitalos-q1q2-integ` (loopback), derrubada ao fim; recriar com `scripts/integ-local/reset.sh` |
| Evidência reaproveitável | Gate 4657/0 em `9532c61`; jornada Q2 47/0 (`docs/vitalos/piloto/MO2_JORNADA_Q2_2026-11-21.md`), válida enquanto ledger, convites, leitura Q2 e migrations não mudarem |
| Riscos abertos | D1 depende da migration remota de assentos; **D7: Piloto não permite FIB-T** (decisão comercial); Q1/Q3 bloqueados por ficha; Q4 fora da `main` |
| Próxima ação | MO3 (lentes) e decisões D1/D7; navegador dos fluxos do piloto na MO4 |

## Leitura desta sessão

Lido: CHECKPOINT (topo), PIL-01..08, forma adotada do Q1, onda Q3, plan-engine e `member-invite.server.ts` da `main`, os 3 testes do CI. Dispensado: releitura das ondas de ajuda (provadas e já na `main`). Hipótese confirmada: as falhas do CI eram contrato de teste, não código. Continuar em: MO3. MO2: roteiro reproduzível no repositório; dispensa refazer a integração Q1+Q2 de 19/11.
