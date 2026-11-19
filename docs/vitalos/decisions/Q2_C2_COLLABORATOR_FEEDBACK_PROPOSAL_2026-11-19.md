# Decisão pendente · devolutiva da transformação ao colaborador · 19/11/2026

Claude Code · Q2_CONSOLIDACAO · fatia C2 · branch `feat/claude-q2-perfis` · base `1c82d21`. Estado: **aguardando decisão do operador**. Nenhum código escrito.

## Problema

Quem respondeu à FIB-T não vê o que a organização fez com o resultado coletivo. Hoje o colaborador recebe só a recusa da leitura por setor e o caminho para o Diário (`78d39b1`). O ciclo Mensurar → Transformar não fecha para ele.

## Fatos (código em `1c82d21`)

- O plano vive no ledger FIB-T (`action_plans`, `action_items`); toda ação nasce de um setor **publicado** (k≥5, lote protegido) e carrega setor, fator e versão de origem (`FibtActionView.source`).
- Campos de texto livre escritos pelo RH: `title`, `description`, `ownerRoleLabel`, conteúdo das evidências. Nenhum foi escrito sabendo que seria lido por colaboradores.
- O colaborador não tem vínculo com setor (respostas anônimas por link); qualquer recorte "do seu setor" seria inferência.
- `/devolutiva` existente mistura motores e mocks legados (IVO, COPSOQ, VIA-T) e não lê o ledger FIB-T.

## Onde mostrar (ToT, 0–10, maior = mais favorável)

| Opção | Valor | Privacidade | Custo | Coerência de lente | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| **A. Seção "O que a organização está fazendo" na recusa Q2 + no Diário**, servida por um endpoint de membro | 8 | 9 | 8 | 9 | **34** |
| B. Rota nova `/ivo-integral/devolutiva` para membros | 9 | 9 | 6 | 9 | 33 |
| C. Dentro de `/devolutiva` legada | 7 | 6 | 5 | 3 | 21 |

Recomendação: **A**. Reaproveita os dois pontos onde o colaborador já chega, sem nova rota na navegação; B fica como evolução se o conteúdo crescer.

## O que o colaborador vê (proposta mínima)

| Campo | Mostrar? | Motivo |
| --- | --- | --- |
| Ciclo e situação do plano (ativo / encerrado) | sim | contexto, sem risco |
| Setor de origem e fator FIB-T | sim | já publicado com k≥5 |
| Título da ação | **sim, com aviso ao RH** | dá sentido; é texto livre (ver D2) |
| Estado da ação (planejada, em execução, concluída, em vigilância, interrompida) | sim | mostra movimento |
| Prazo (mês/ano) | sim | compromisso verificável |
| "Há registro de execução" (sim/não) | sim | prova de que aconteceu, sem conteúdo |
| Descrição, responsável, rótulo de função, indicador e valores, conteúdo de evidência, aprendizagem | **não** | texto livre ou dado de pessoa |
| Eficácia | só a frase fixa "Eficácia ainda não avaliada" | não sugerir melhora |
| Planos em rascunho | **não** | ainda não são compromisso |

Microcopy obrigatória: "Estas ações partem de resultados coletivos publicados. Mostram o que está sendo feito, não uma melhora já medida." Nada de "impacto", "resultado alcançado" ou percentual.

## Contrato técnico (após aprovação)

- Endpoint de membro (`resolveOrgMembership`; qualquer papel da org) com projeção fechada: só os campos "sim" acima, montados no servidor; teste de não vazamento (`owner`, `description`, `evidence`, `contentRef`, `metric`, `timeline` ausentes do payload).
- Só planos `active`/`closed` da organização da sessão; módulo Q2 desligado → estado "indisponível"; sem plano → vazio explicativo.
- UI com os 4 estados (vazio, carregando, erro, 320 px) e teclado.
- No formulário do RH, aviso junto do título: "Visível para as pessoas da organização."
- Prova: `colaborador.alfa` vê as ações da Alfa; Beta nada; Gama vê a própria ação de liderança sem responsável; payload inspecionado.

## Decisões pedidas

1. **D1 · Local:** A (recusa Q2 + Diário) ou B (rota nova).
2. **D2 · Título visível:** aprovar mostrar o título, com aviso ao RH no formulário. Alternativa conservadora: só fator e setor, sem título.
3. **D3 · Público:** todos os membros da organização (colaborador, liderança, embaixador) ou só COLABORADOR.
4. **D4 · Ações já criadas:** os títulos existentes passam a ser visíveis sem revisão, ou só ações criadas depois do aviso.

Responsável: operador (produto e privacidade). Se a microcopy tocar método, João Paulo Brandão Barboza.
