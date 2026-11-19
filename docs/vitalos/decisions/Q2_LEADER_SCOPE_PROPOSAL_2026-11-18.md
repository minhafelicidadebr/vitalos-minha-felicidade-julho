# Decisão pendente · escopo da liderança no ciclo Q2 · 18/11/2026

Proposta de Claude Code · Q2 · branch `feat/claude-q2-perfis`. Estado: **B aprovado pelo operador em 18/11/2026 ("Aprovar e ligar") e ligado ao servidor** — ver "Ligação" abaixo. Pendente: decisão S6 sobre quem pode ser responsável por uma ação.

## Fatos (SHA `78d39b1`)

- Todo o caminho Q2 no servidor exige `requireOrgAdmin` (`src/lib/auth/authorize.server.ts:110`); LIDER_EQUIPE hoje recebe a mesma recusa e o mesmo caminho para o Diário que o colaborador.
- Não há vínculo pessoa↔equipe/setor: `profiles` = `id, org_id, role, display_name`; `sector_links` são links anônimos de coleta.
- A única relação pessoa↔plano já persistida é `owner_user_id` de cada ação (`src/lib/ivo/fibt-action-loop.server.ts:563`).

## Alternativas (ToT, 0–10, maior = mais favorável)

| Ramo | Valor | Segurança | Custo | Sem migration | Reversível | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A. Escopo por setor (nova tabela de vínculo) | 9 | 6 | 3 | 0 | 5 | 23 |
| **B. Escopo por responsabilidade (`owner_user_id`)** | 8 | 9 | 9 | 10 | 9 | **45** |
| C. Liderança lê a leitura completa da organização | 6 | 3 | 9 | 10 | 7 | 35 |
| D. Nenhuma mudança | 2 | 10 | 10 | 10 | 10 | 42 (sem valor) |

Fator decisivo: B usa um dado já existente, não amplia leitura de setores (evita recorte revelador da própria equipe) e não exige migration. A fica como evolução se o produto precisar de "minha equipe".

## Contrato proposto (B) · `src/lib/ivo/leader-scope-policy.ts`

| Operação | Liderança |
| --- | --- |
| Ver resumo agregado do plano (contagens) | plano ativo ou encerrado |
| Ver ação | só se for a responsável; plano ativo ou encerrado |
| Registrar estado / evidência de execução | só própria ação, só plano ativo |
| Criar, atribuir responsável, ativar, incluir, encerrar plano | **não** — exclusivo do RH |
| Ler resultado FIB-T por setor | **não** — exclusivo do RH |

Ordem de recusa: papel → organização → autoridade reservada → responsabilidade → estado do plano. A função é pura; o ator vem sempre do servidor. 7 testes, incluindo prova de que nenhum módulo de produção a importa.

## O que decidir

1. Aprovar B como contrato (ou escolher A/C).
2. Confirmar que a liderança pode **registrar evidência de execução** — ela continua distinta de aprendizagem e de avaliação de eficácia, que seguem com o RH.
3. Autorizar a ligação: um guard `requireOrgMember` + a política nos endpoints de leitura, estado e evidência do ciclo, uma persona LIDER_EQUIPE fictícia convidada pelo RH Alfa no stack local e a prova em navegador. Estimativa: diff pequeno, sem migration.

Responsáveis: operador (autoridade de produto) e João Paulo Brandão Barboza se a leitura de evidência pela liderança tocar método.

## Ligação (após aprovação)

- `authorizeIvoSession` ganhou `options.allowLeader`: só quando o endpoint admite, uma recusa `not_admin` consulta o vínculo real (`resolveOrgMembership`) e aceita `LIDER_EQUIPE`. Leitura Q2 por setor, criação, responsabilidade, ativação, inclusão e encerramento **não** passam a opção.
- `loadFibtActionLoop`: liderança recebe só ações próprias de plano ativo/encerrado, com evidências e eventos delas, e `viewerScope: "own_actions"`.
- `recordFibtActionStatus` / `recordFibtActionEvidence`: política antes da escrita; ação alheia responde `item_not_found`; aprendizagem recusada (`authority_reserved_to_admin`). Papel gravado = papel da sessão.
- `findItem` passa a devolver `ownerUserId`. As RPCs de escrita são `service_role` sem checagem de papel; a autorização continua inteira no servidor. Sem migration.
- `/ivo-integral/acoes`: para a liderança, nota "Ações sob sua responsabilidade" e vazio "Nenhuma ação atribuída a você neste ciclo", sem os avisos do RH.

Verificação: `leader-scope.server.test.ts` (4) + política (7); `bun run gate` 4.481 aprovados, paridade, TypeScript, secret-scan. Navegador (stack institucional, app 8092): RH Alfa convidou `lider.alfa@institutional.test` como LIDER_EQUIPE (papel conferido em `member_invites`, `READ ONLY`); a liderança aceitou, viu o estado vazio próprio em `/ivo-integral/acoes` sem nenhuma ação alheia, e `/ivo-integral/q2` segue negada com o caminho do Diário e sem setores.

## Decisão S6 · tomada em 19/11/2026

O operador escolheu **"Sim, designar líder"**: o RH pode designar uma pessoa `LIDER_EQUIPE` da própria organização como responsável (`owner_user_id`). Sem designação, segue o próprio RH (comportamento anterior).

Implementação:
- `setFibtActionAccountability` aceita `ownerUserId` opcional (schema `uuid`); o papel do designado é lido de `profiles` por organização da sessão (`findOrgMemberRole`). Colaborador, RH de outra pessoa, membro de outra empresa ou id inexistente → `owner_not_eligible`. A liderança não designa ninguém (`requireOrgAdmin`).
- `loadFibtActionLoop` entrega ao RH `assignableLeaders` (id + `display_name`, sem e-mail); a liderança não recebe a lista.
- `/ivo-integral/acoes`: campo "Pessoa responsável" (padrão "Eu (RH)") no formulário de responsabilidade em rascunho. Para a liderança, a ação aparece sem encerrar, incluir, aprendizagem, eficácia ou jornada educativa.
- Fora deste incremento: inclusão de ação em plano ativo (PI-13) continua designando o próprio RH.

Verificação: `leader-scope.server.test.ts` (5); `bun run gate` 4.482 aprovados, paridade, TypeScript, secret-scan.

### Prova em navegador · Empresa Fictícia Gama · 19/11/2026

Autorizada pelo operador ("Habilitar empresa Gama"). Stack institucional preservado (API 57621, DB 57622, Mailpit 57624), app do worktree em 8092. Provisionamento por script de scratchpad que valida o alvo com `institutionalEnv()` e usa só o fluxo real: empresa `institutional-gama` (plano `enterprise`, como a fixture Alfa/Beta) e identidades sintéticas `gama@` / `lider.gama@institutional.test`; primeiro RH emitido pela plataforma e aceito pela própria identidade; Q2 habilitado pela plataforma só na Gama (CAS por revisão); onda FIB-T, setor "Equipe Gama sintética", link e 5 respostas anônimas sintéticas; liderança convidada pelo RH Gama e aceita pela própria identidade. Alfa e Beta não foram tocadas.

| Passo (navegador, login por link mágico local) | Resultado |
| --- | --- |
| RH Gama abre o centro de controle FIB-T | setor publicado em lote protegido (n=5, 3,0/4 por fator) |
| RH Gama cria o plano 2026-T4 a partir da prioridade | rascunho criado; "Pessoa responsável" oferece só "Eu (RH)" e a liderança da Gama |
| RH designa a liderança, define prazo e indicador, ativa | "Responsável, prazo e indicador salvos." · "Plano ativado." |
| Liderança Gama abre `/ivo-integral/acoes` | nota de escopo próprio, a própria ação, formulário de execução; sem encerrar, incluir, aprendizagem, nem ações da Alfa |
| Liderança muda o estado e registra execução | "Estado atualizado." (em execução) · "Evidência de execução registrada." |
| Recarga | estado e evidência persistem |

Leitura `READ ONLY` independente: responsável da ação = perfil `LIDER_EQUIPE`; `action_log` da Gama com `status_change` e `evidence_recorded`, ambos `actor_role_label = LIDER_EQUIPE`; 1 evidência `texto`; Alfa com as mesmas 5 ações; Q2 = Alfa ligado, Beta desligado, Gama ligado.

Limite: prova em navegador desktop; a recusa da liderança a ação alheia, a aprendizagem e a designação inválida estão provadas nos testes de serviço, não no navegador.

## Contexto da decisão S6 (anterior)

Hoje `setFibtActionAccountability` grava sempre como responsável o próprio RH que define a responsabilidade (`fibt-action-loop.server.ts`, comentário "Escopo declarado do ledger S6"). Logo nenhuma liderança é responsável por ação e o escopo ligado fica vazio na prática. Para operar: decidir se o RH pode designar uma pessoa LIDER_EQUIPE da própria organização como responsável (o `owner_user_id` deixa de significar "quem administra o plano"), ou criar um campo distinto de executor (migration). A responsabilidade só é editável em plano em rascunho.
