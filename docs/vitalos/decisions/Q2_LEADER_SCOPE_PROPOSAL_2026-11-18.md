# Decisão pendente · escopo da liderança no ciclo Q2 · 18/11/2026

Proposta de Claude Code · Q2 · branch `feat/claude-q2-perfis`. Estado: **aguardando decisão do operador e do responsável metodológico**. Nada foi ligado ao servidor.

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
