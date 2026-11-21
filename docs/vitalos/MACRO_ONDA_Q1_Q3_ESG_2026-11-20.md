# Macro-onda · Q1 fonte COPSOQ, Q3 por ambiente, revisão ESG · 20/11/2026

Branch `feat/claude-ciclo-relatorio` (base `6c61564`). Nenhum código de produção alterado nesta onda: só este registro. Codex, `.q.out`, `.q.sql` e arquivos de ambiente preservados.

## 0 · Estado real

| Referência | HEAD conferido |
| --- | --- |
| `origin/main` | `7338ebf` (Vitalidade 001 na demo Q3) |
| `feat/claude-ciclo-relatorio` | `6c61564` (relatório e PDF) |
| `feat/claude-q3-fundacao` | `33d92d5` (aprovação D10) |
| `feat/q3-vitalidade-integrada` | `7338ebf` = `origin/main` |
| `codex/q4-pratica-forcas` | `9bbfa92` + trabalho Q4 não comitado (não tocado) |

## 1 · Decisão (árvore)

Q1 cai no ramo **fonte/edição ambígua**: manter a coleta bloqueada e formular uma única decisão humana. Não há erro de código a corrigir — o manifesto servido declara ser redação autoral demonstrativa, e a aprovação de 18/11 não vincula uma forma brasileira publicada específica. Q2: reaproveitar a prova (nada compartilhado foi alterado). Q3: verificar por ambiente. ESG: parecer pronto para o responsável.

## 2 · Q1 COPSOQ

### Fluxo efetivo (onde a coleta para)

1. Criação de onda → `src/lib/api/wave-admin.server.ts:42` chama `checkInstrument(orgId, instrument)`.
2. `src/lib/identity/module-access.server.ts` → `checkModule`: para `Q1` habilitado retorna sempre `method_pending` (linhas 41–46). **Coleta e resultados bloqueados aqui.**
3. Manifesto consumido: `src/domain/survey/copsoq-instrument-manifest.json` via `getCopsoqManifest` (`copsoq-instrument-manifest.ts`); consumidores: `CopsoqPreparationNotice.tsx`, `mocks/instrument-registry-mock.ts` (derivado), `mocks/executivo-mock.ts`. `docs/instrumentos/COPSOQ_NR1.md` (9 dimensões) é histórico, não consumido.
4. Cálculo: `src/lib/api/capsule-aggregator.server.ts:210` — reversão `min+max−v` com uma escala única da definição.

### Identidade do instrumento servido (contagem por critério)

| Critério | Servido (`br-medio.estrutural.1`) | COPSOQ II-Br curta (Gonçalves 2021) | Mesmo critério? |
| --- | --- | --- | --- |
| Questões de contexto | 0 no manifesto | não contadas nas 40 | sim |
| Itens pontuados | 41 | 40 questões | sim (itens respondidos) |
| Agrupamentos | 12 exposição + 2 desfecho | 23 dimensões (várias de item único) | **não**: o servido agrupa por categoria NR-1 |
| Escala | uniforme 1–5 frequência (Nunca…Sempre) | grupos de 4 e de 5 alternativas, frequência e intensidade (Quadro 3) | — diverge |
| Texto | "redação autoral demonstrativa", `validation_status: demonstrativo`, `norm_reference: null` | enunciados publicados | — por construção não coincide |

Observação: 41 coincide com a contagem da forma curta portuguesa no manual NCOPSII local (SHA-256 `b3efa892…a4bba`), mas os textos servidos são autorais; a coincidência de número não é correspondência.

### Matriz por dimensão (código → fonte)

Sem forma-fonte identificada, nenhum item tem identificador de fonte; estado de todos: **sem evidência**. Polaridade conforme `reversed_items` do manifesto.

| Dimensão (código) | Tipo | Itens | IDs no código | Polaridade | Estado |
| --- | --- | --- | --- | --- | --- |
| demands_quant | exposure | 3 | cop-dq-1, cop-dq-2, cop-dq-3 | reversos: 3 | sem evidência |
| work_pace | exposure | 2 | cop-wp-1, cop-wp-2 | reversos: 2 | sem evidência |
| demands_emotional | exposure | 2 | cop-de-1, cop-de-2 | reversos: 2 | sem evidência |
| influence | exposure | 3 | cop-inf-1, cop-inf-2, cop-inf-3 | diretos | sem evidência |
| meaning | exposure | 3 | cop-mng-1, cop-mng-2, cop-mng-3 | diretos | sem evidência |
| predictability | exposure | 2 | cop-prev-1, cop-prev-2 | diretos | sem evidência |
| role_clarity | exposure | 3 | cop-role-1, cop-role-2, cop-role-3 | diretos | sem evidência |
| leadership_quality | exposure | 4 | cop-lead-1, cop-lead-2, cop-lead-3, cop-lead-4 | diretos | sem evidência |
| social_support | exposure | 3 | cop-supp-1, cop-supp-2, cop-supp-3 | diretos | sem evidência |
| recognition | exposure | 3 | cop-recog-1, cop-recog-2, cop-recog-3 | diretos | sem evidência |
| community | exposure | 3 | cop-comm-1, cop-comm-2, cop-comm-3 | diretos | sem evidência |
| insecurity | exposure | 2 | cop-insec-1, cop-insec-2 | reversos: 2 | sem evidência |
| burnout | outcome | 4 | cop-burn-1, cop-burn-2, cop-burn-3, cop-burn-4 | reversos: 4 | sem evidência |
| offensive_behaviors | outcome | 4 | cop-off-1, cop-off-2, cop-off-3, cop-off-4 | reversos: 4 | sem evidência |

### Causa das divergências

| Divergência | Causa | Evidência | Menor ajuste |
| --- | --- | --- | --- |
| Texto dos itens | edição diferente (bateria autoral, não publicada) | `adaptation`, `validation_status` no manifesto | substituir a bateria pela forma escolhida, com hashes por item |
| 14 × 23 agrupamentos | edição diferente + critério de agrupamento NR-1 | `dimensions` no manifesto × Quadro 3 | mapear dimensões da forma escolhida; NR-1 vira camada de leitura |
| Escala uniforme | regra incorreta para qualquer forma publicada observada | `scoring` no manifesto; aggregator:210 | escala por item na definição e no agregador (já mapeado em Q1_COPSOQ_SOURCE_PARITY) |
| "41 itens NCOPSII" em ADR/docs | documentação desatualizada | ADR-001, COPSOQ_NR1.md | corrigir após a escolha |

Nenhuma correção é inequívoca sem a forma escolhida: não alterei código. Preparação, comunicado, delegação e revisão técnica (provados em `f8cabb9`) intactos.

**Estado da coleta: bloqueada.** Insumo exato: a forma brasileira adotada (arquivo ou DOI + página/tabela dos itens e das regras de cotação e ausências) e a licença de uso. Com isso, `scripts/check-copsoq-source.ts` gera o diff item a item.

## 3 · Q2 e Q3

**Q2:** prova de `Q1Q2_INTEGRACAO_LOCAL_2026-11-19.md` reaproveitada; nada em identidade, autorização ou habilitação mudou. Execução documentada ≠ eficácia avaliada (não avaliada).

**Q3 `/q3-demo` por ambiente (20/11/2026):**

| Ambiente | URL | Resultado |
| --- | --- | --- |
| GitHub | `origin/main` | `7338ebf` contém a rota e a unidade |
| Local (dev) | `http://localhost:8097/q3-demo` | `7338ebf`, persona colaborador: cartão "Educar · prática de Vitalidade aprovada", "versão 0.2.0", "Participar é voluntário", questionário ilustrativo marcado como demo; checagem funciona; 320 px sem estouro |
| Prévia Lovable | `id-preview--aea36b4a….lovable.app/q3-demo` | HTTP 401 sem login Lovable; com login, o app redireciona para `/entrar` (link mágico). Chunk servido `q3-demo-mWYQiGBf.js` contém o cartão, o id da unidade, a data 2026-11-20 e o texto de participação voluntária → **prévia sincronizada com `7338ebf`**. Tela não renderizada: contornar o login do app foi negado (correto). |
| Produção | `vitalos.com.br/q3-demo` (e `…lovable.app` → 302 para lá) | **404**; `/ivo` 200. Produção não foi publicada após `8d30023`. Evidência sobre a URL, não sobre o código. |

A aprovação editorial cobre só a unidade versionada; não libera mensuração, escore, ranking nem coleta PERMA.

**Q4:** sem commit do Codex; dependência registrada. Visão coletiva depende de decisão própria.

## 4 · Parecer ESG (para o responsável)

| Vínculo | Origem | Evidência disponível | O que sustenta | Frase mais forte publicável | Recomendação |
| --- | --- | --- | --- | --- | --- |
| Q2-03 → **S** | atividade `Q2-pratica-aprendizagem-equipe-001` v0.1.0 | aprovação D10 (15/11) e oferta ao setor; nenhum registro de participação | **disponibilidade** apenas | "Uma prática educativa revisada ficou disponível para o setor no ciclo." | **Ajustar**: vínculo S como contribuição temática de disponibilidade. Muda com contagem coletiva de participação (k≥5) ou execução registrada da prática. |
| Q2-05 → **G** | ação 1 do plano 2026-T4 | RH ativou o plano e designou a liderança (Q2-04); log `status_change` e `evidence_recorded` por `LIDER_EQUIPE` | **responsabilidade formal + acompanhamento registrado**; não há decisão de revisão documentada | "A ação teve responsável designado formalmente e acompanhamento registrado no plano." | **Ajustar**: ancorar G em Q2-04+Q2-05 (designação e trilha), não na execução. Muda para "decisão documentada" quando a revisão do plano (manter/ajustar/encerrar) for registrada. |

PDF não regenerado: modelo e layout não mudaram nesta onda; o parecer acima aguarda decisão antes de alterar o texto dos vínculos.
