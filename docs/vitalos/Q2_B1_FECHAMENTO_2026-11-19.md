# Q2 · B1 · completar sem migration · 19/11/2026

Claude Code · Q2_FECHAMENTO · bloco B1 · branch `feat/claude-q2-perfis` · base `7dc0e83`. Estado: **aceito no escopo demonstrado**.

## Entregas

| Item | Mudança |
| --- | --- |
| C3 · designação no PI-13 | `resolveDesignatedOwner` (`fibt-action-loop.server.ts`) é a regra única: sem pedido → o próprio RH; pedido → só `LIDER_EQUIPE` da org da sessão, papel lido de `profiles`. Usada por `setFibtActionAccountability` e por `addFibtActionToPlan`. O schema da inclusão aceita `accountability.ownerUserId` (uuid); a gravação usa o responsável resolvido. |
| Idempotência | A pessoa designada entra na identidade do pedido: mesmo `requestId` com outra pessoa → `request_conflict`. Stores que não devolvem a coluna ficam fora da comparação. |
| Formulário de inclusão | "Pessoa responsável" ("Eu (RH)" + lideranças da org) no bloco de responsável do plano ativo. |
| Título | A sugestão "Prioridade: <fator> — <setor>" virou `placeholder`; o campo começa vazio (causa do título embaralhado na Delta). |
| C4 · plano encerrado | Sem mudança de código: o componente já oculta estado, evidência e responsabilidade fora do plano ativo/rascunho. Provado abaixo. |

## Verificação

- `plan-composition.server.test.ts`: 3 testes novos (designação e padrão; colaborador, outra org e id inexistente recusados antes da escrita; conflito por pessoa diferente no mesmo pedido). Store falsa passa a guardar o responsável.
- `IvoJourney.test.tsx`: o teste do planejador agora digita o título e verifica o campo vazio com a sugestão como dica.
- `bun run gate`: 4.507 aprovados, paridade, TypeScript, secret-scan.

Navegador (stack institucional preservado, app do worktree em 8092 por `scripts/institutional-app-port.ts`), tenant de ensaio **Gama** (nunca Alfa):

| Passo | Resultado |
| --- | --- |
| RH Gama inclui ação no plano ativo e designa `lider.gama` | "Ação incluída no plano."; leitura `READ ONLY`: responsável `LIDER_EQUIPE`, `added_by_role = RH_ADMIN` |
| `lider.gama` conclui as duas ações próprias | ambas `concluida` no banco |
| RH Gama encerra o plano 2026-T4 | "Plano encerrado. Ele não aceita mais ações nem registros…" |
| `lider.gama` abre o plano encerrado | plano ENCERRADO, as próprias ações visíveis, **0 formulários e 0 botões de escrita** |
| 320 px | largura útil = rolagem (320); nenhum alvo interativo abaixo de 44 px |
| 390 px · teclado | largura útil = rolagem (390); primeiro Tab em "Pular para o conteúdo" com contorno de foco |

Escrita no stack desta prova: 1 ação incluída e o plano 2026-T4 da Gama encerrado (irreversível, autorizado pelo superprompt para tenant de ensaio). Alfa, Beta e Delta não foram alteradas.

## Limite

A prova de largura é emulada em navegador desktop. A Gama não tem mais plano ativo no ciclo 2026-T4; novas provas de escrita de liderança usam a Delta ou um tenant novo do harness.

## Próxima ação única

B2: proposta de migration única (`title_visible_at` + checagem de papel e org dentro das RPCs do ledger), com rollback e prova só no stack local.
