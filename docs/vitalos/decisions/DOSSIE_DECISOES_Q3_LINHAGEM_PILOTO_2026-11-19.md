# Dossiê de decisões · Q3, linhagem do replay e piloto · 19/11/2026

Preparado por Claude Code para decisão humana. **Nenhuma decisão aqui foi tomada pelo agente.** Cada item traz a pergunta, o que o repositório comprova, as opções e o que destrava. Recomendações aparecem marcadas como tal e não substituem a decisão.

Base técnica: Q1+Q2 integrados em `integ/q1-q2-merge` (`6eff411`, gate 4.545, prova no navegador em pilha descartável); Q3 em `feat/claude-q3-fundacao` (`e5e2596`, gate 4.549, aviso de prontidão).

## A · Metodologia do Q3 (responsável metodológico)

| ID | Pergunta | O que o repositório comprova | Opções | Destrava |
| --- | --- | --- | --- | --- |
| Q3-01 | Qual instrumento e o que é o “+V”? | `docs/instrumentos/PERMA_TRABALHO.md` descreve “PERMA no Trabalho”, 15 itens, 0–10, citando Seligman (2011) e uma validação brasileira 2026 (PePSIC). O “+V” **não está definido** em nenhum arquivo. Não há entrada no Evidence Registry nem em `instrument-usage-authorization.json`. | (a) adotar o instrumento citado e definir “+V” como construto próprio com fonte; (b) adotar o instrumento e retirar o “+V”; (c) outro instrumento. | Manifesto versionado, rótulos, rota |
| Q3-02 | Fonte, versão e permissão | Só o link citado; sem hash, DOI conferido ou licença registrada. | Registrar referência exata + arquivo/hash + permissão de uso. | Paridade de fonte (padrão do verificador Q1) |
| Q3-03 | Itens, escala, polaridade, ausências, cálculo | Itens e “mapeamento → pilares IVO” no documento de referência, **não aprovados**. | Aprovar a tabela item→fator, regras de ausência e casos esperados. | Motor de cálculo + testes de casos |
| Q3-04 | Limiar e proteção de recortes | Q2 usa k≥5 e lote protegido. | (a) mesmo padrão do Q2; (b) limiar próprio justificado. | Publicação agregada |
| Q3-05 | Mapeamento para dimensões IVO | Matriz atual mantém Q3 `mapping_pending`; nenhum índice composto. | (a) não mapear nesta fase (recomendado para não acoplar lentes); (b) mapear com parecer. | Matriz IVO |
| Q3-08 | Conteúdo educativo de referência | Padrão D10 (unidade/atividade versionada, revisão editorial registrada). | Designar autoria e revisão editorial. | Educar do Q3 |

## B · Operação (operador)

| ID | Pergunta | Opções e consequência |
| --- | --- | --- |
| Q3-06 | Criar o módulo Q3 em `org_module_entitlements` agora? | (a) Agora: migration aditiva local (enum + CAS), Q3 continua `method_pending` como o Q1 — permite habilitar por empresa antes do método; (b) Só após Q3-01..03 (recomendado: evita habilitação sem instrumento). |
| Q3-07 | Papéis do Q3 | Proposta neutra espelhando Q2: RH aplica e lê agregado; liderança só ações próprias; membros só devolutiva coletiva; ninguém vê respostas individuais. |
| LIN | Linhagem do replay das 10 migrations | (a) pacote único `PACOTE_INSTITUCIONAL_Q1_Q2_LOCAL` só no modo `clean` (como R6/C8/PI-13); (b) incluir também em `preprod`/`upgrade`, exigindo prova de atualização com dados para as que redefinem funções de produção (`aggregate_cohort_responses`, 3 RPCs do ledger). Ver `REPLAY_LINEAGE_10_MIGRATIONS_PROPOSAL_2026-11-19.md` (branch de integração). |
| PIL-08 | Candidato técnico do piloto | Registro atual aponta `2e9df54`; candidato integrado atual é `6eff411`. Atualizar a seleção é decisão do operador. |
| PIL-01–07 | Empresa/coorte, finalidade, período, operadores, participação, dados, avaliação, recursos | Pendentes; nenhuma aprovação atribuída a João Paulo, Olga ou Ana Paula além do registro D10. |

## C · O que o agente faz assim que cada decisão existir

- Q3-01..03 → manifesto versionado + verificador de paridade de fonte (padrão `check-copsoq-source.ts`) + motor puro com casos esperados; nada publicado.
- Q3-04/05 → publicação agregada reutilizando o lote protegido do Q2; matriz sem composição.
- Q3-06/07 → migration aditiva local com prova na pilha descartável `scripts/integ-local/`.
- LIN → pacote no `db-replay-proof.ts` + `bun run db:replay` verde.
- PIL-08 → atualização do registro do piloto com a evidência do candidato.

## Decisões do operador · 19/11/2026

Q3-07 **adotada** (papéis espelhando o Q2). Q3-06: módulo só após Q3-01..03. LIN: só modo clean (implementado em integ/q1-q2-merge f8cabb9). PIL-08: candidato 6eff411.
