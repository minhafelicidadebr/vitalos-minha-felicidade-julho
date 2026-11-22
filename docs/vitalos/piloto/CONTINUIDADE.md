# Registro de continuidade · piloto do Instituto

Um registro só. Ao retomar: ler este arquivo e o diff desde o último SHA verificado.

## Último estado verificado · 21/11/2026 (#57 mesclado)

| Campo | Valor |
|---|---|
| SHA verificado | `main` `425b4a9` (PR #57 mesclado com autorização do proponente para a migration remota; árvore igual a `8ae18c6`) |
| Lovable | Sincronizou o #57. **Todo build depois do #55 aparece como "Build malsucedido"**, a começar por `e371edd`, que só altera um arquivo de teste. Investigação (21/11): no mesmo commit `425b4a9`, passam localmente o preflight de produção, `bun run build` (contrato do Lovable) e `build:dev`; o preflight também passa em `268dfbc` e `e371edd`. O painel "Detalhes" não mostra log. Conclusão: causa no ambiente do Lovable, não no código. Suspeita não confirmada: conta com "0 crédito restante". A prévia segue servindo o build do #55 (servidor sem o código de assentos) |
| Migration | Não confirmado se `20261121120000` foi aplicada no banco do projeto. Conferência é do proponente (acesso a produção segue bloqueado para o agente) |
| Evidência reaproveitável | Gate 4647/0 em `8ae18c6`; candidato `feat/mo3-lentes` 4680/0 |
| Riscos abertos | Build do Lovable falhando; migration sem confirmação; publicar o código de assentos sem a função no banco deixaria convites indisponíveis (falha fechada) |
| Próxima ação | Proponente: ver o log de build no Lovable e conferir a função no banco. Depois, PR #58 |

## Leitura desta sessão

Lido: CHECKPOINT (topo), PIL-01..08, forma adotada do Q1, onda Q3, plan-engine e `member-invite.server.ts` da `main`, os 3 testes do CI. Dispensado: releitura das ondas de ajuda (provadas e já na `main`). Hipótese confirmada: as falhas do CI eram contrato de teste, não código. Continuar em: decisões de liberação (MO4). As macro-ondas 1–4 estão fechadas.
