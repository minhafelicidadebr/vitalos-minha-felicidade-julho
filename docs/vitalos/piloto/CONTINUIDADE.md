# Registro de continuidade · piloto do Instituto

Um registro só. Ao retomar: ler este arquivo e o diff desde o último SHA verificado.

## Último estado verificado · 21/11/2026 (#57 mesclado)

| Campo | Valor |
|---|---|
| SHA verificado | `main` `425b4a9` (PR #57 mesclado com autorização do proponente para a migration remota; árvore igual a `8ae18c6`) |
| Lovable | Sincronizou o #57, mas **todos os builds desde os commits do #56 aparecem como "Build malsucedido"**, inclusive commits só de teste; o #55 havia construído. Prévia desatualizada (versão do #55). Build local de `425b4a9` (`build:dev`) passa. Causa provável: ambiente do Lovable (log não visível; conta com "0 crédito restante") |
| Migration | Não confirmado se `20261121120000` foi aplicada no banco do projeto. Conferência é do proponente (acesso a produção segue bloqueado para o agente) |
| Evidência reaproveitável | Gate 4647/0 em `8ae18c6`; candidato `feat/mo3-lentes` 4680/0 |
| Riscos abertos | Build do Lovable falhando; migration sem confirmação; publicar o código de assentos sem a função no banco deixaria convites indisponíveis (falha fechada) |
| Próxima ação | Proponente: ver o log de build no Lovable e conferir a função no banco. Depois, PR #58 |

## Leitura desta sessão

Lido: CHECKPOINT (topo), PIL-01..08, forma adotada do Q1, onda Q3, plan-engine e `member-invite.server.ts` da `main`, os 3 testes do CI. Dispensado: releitura das ondas de ajuda (provadas e já na `main`). Hipótese confirmada: as falhas do CI eram contrato de teste, não código. Continuar em: decisões de liberação (MO4). As macro-ondas 1–4 estão fechadas.
