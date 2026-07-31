# Decision Ledger — MVP FIB-T ISG

## Status inicial

- Implementação autorizada somente em staging.
- Utilizar somente dados sintéticos.
- Produção real permanece bloqueada.
- Não enviar convites reais.
- Não importar colaboradores reais.
- Não fazer deploy, push ou merge sem autorização.
- Não usar LLM externo para processar respostas.
- FlorêncIA será inicialmente uma experiência conversacional determinística.
- O instrumento deverá seguir o documento FIB-T de Furtado (2020).
- Divergências metodológicas devem ser corrigidas antes do dashboard real.

## Decisões pendentes

1. ~~Autorização ou licença formal de uso da FIB-T.~~ **Resolvida na FIBT-1** —
   ver seção abaixo. `instrument_usage_authorization.status = confirmed`
   (Instituto Feliciência). A pendência que resta é **operacional**, não de
   licença: `operational_real_collection_status = blocked_until_release_gate`.
2. Manual complementar, normas e missing data.
3. Quantidade de participantes e setores da ISG.
4. Modalidade de distribuição dos convites.
5. Papéis de controlador, operador e responsáveis.

## Onda FIBT-0 — verdade metodológica (executada)

Fonte de verdade: `src/domain/instruments/fibt/fibt-instrument.v1.json`, validado
em runtime por loader fail-closed. PDF de origem registrado por SHA-256.

### Como o mapeamento de domínios foi estabelecido

O documento define item → Fator por lista textual, mas item → **Domínio por
codificação de cor**. Extração de texto perde a cor: por isso o mapeamento
anterior errava 5 itens. Os operadores de cor foram lidos direto do content
stream do PDF, tornando o mapeamento medido, não inferido.

Cobertura por cor: Fator 1 = 5+4+3; Fator 2 = 4+4+2, mais dois domínios de 1
item; Fator 3 = 8 itens em Governança. Total 32.

### Correções aplicadas

| Divergência | Antes | Agora |
|---|---|---|
| Item 5 no Fator errado (P0) | Fator 2 (13 itens) | Fator 3 · Governança (12/12/8) |
| Item 2 | Padrão de Vida | Educação |
| Item 6 | Cultura | Educação |
| Item 18 | Cultura | Padrão de Vida |
| Item 9 | Saúde | Uso do Tempo |
| Item 24 | Bem-Estar Emocional | Saúde |
| Índice 0–1000 | exibido | removido — não existe na fonte |
| Faixas frágil/…/florescente | exibidas | removidas — não existem na fonte |
| Resposta ausente | imputada como 0 | recusada (fail-closed) |
| Enunciados | parafraseados | transcrição literal |
| Âncoras da escala | ausentes do código | registradas (0–4) |

O item 5 no Fator errado alterava o divisor de dois Fatores: **o escore bruto
exibido antes desta onda estava incorreto.**

### Decisões metodológicas registradas

1. **Não corrigir o instrumento por intuição.** O item 5 ("rede de apoio social
   e afetivo") aparece no Fator 3 nas duas seções do documento. É semanticamente
   atípico e foi mantido como documentado, com a observação registrada no
   manifesto para o autor.
2. **Erros tipográficos da fonte preservados** (item 21 sem "meses"; item 22 com
   "como" repetido). Enunciado de instrumento é normativo; correção silenciosa
   alteraria o estímulo apresentado ao respondente.
3. **Nome do domínio** — a fonte usa "Bem-Estar Emocional" e "Bem-Estar
   Psicológico". Ambos registrados; nenhum escolhido por nós.
4. **Média por Domínio é leitura descritiva, não escore.** O documento agrupa
   itens por domínio mas não define fórmula de subíndice. A tela declara isso.
5. **Lacuna ≠ zero.** Tudo que a fonte não define é `NOT_DOCUMENTED` explícito e
   o loader recusa o carregamento se alguém ligar — normalização, faixas,
   imputação, itens reversos e pesos.

### Bloqueios que permanecem

- `license_status = NOT_CONFIRMED` → `authorized_for_real_collection = false`.
  O loader recusa liberar coleta real sem licença **e** aprovação humana registrada.
- Psicometria (validade, confiabilidade, normas) ausente do PDF fornecido — não
  afirmada em lugar nenhum.
- Sem fórmula autorizada de subíndice por domínio.
- Produção, backup e restauração seguem fora de escopo e bloqueados.

### Perguntas abertas ao responsável metodológico

1. ~~Licença/autorização formal de uso e digitalização.~~ Resolvida — ver Onda FIBT-1.
2. Manual com regra de missing data e interpretação.
3. Confirmar item 5 no Fator 3 (Governança).
4. Confirmar os erros tipográficos dos itens 21 e 22.
5. Nome canônico: Bem-Estar Emocional ou Psicológico.
6. Existe fórmula autorizada de subíndice por domínio?

## Onda FIBT-1 — corte vertical sintético (executada)

Prova completa contra o staging isolado `xttj...xuab` (`shlm...akol` =
produção, nunca tocada). Detalhes operacionais nos runbooks de
`docs/fibt-isg/FIBT1_MANUAL_*.md`; aqui só as decisões.

### Autorização de uso — separada de prontidão operacional

Colapsar "temos direito de aplicar o instrumento" e "a plataforma está
pronta para coletar dado real" em um único booleano (`authorized_for_real_collection`,
removido) fazia bloqueio de engenharia parecer pendência de licença. Agora
dois campos, dois donos, dois motivos de mudança —
`src/domain/instruments/instrument-usage-authorization.json`:

- `instrument_usage_authorization.status = confirmed` — Instituto Feliciência,
  formação oficial FIB-T, confirmado pelo responsável do projeto em 2026-07-30.
- `operational_real_collection_status = blocked_until_release_gate` —
  bloqueio operacional (produção, backup, restauração, segurança, privacidade,
  release), não de licença. O loader recusa `released` sem os dois.

### Arquitetura de submissão anônima (genérica, não exclusiva da FIB-T)

`wave_responses.invite_token` — e a FK para `wave_invites` — permitiam, no
schema, o caminho resposta → convite → e-mail. Removidos em duas migrations
com EXPAND → PROVE → CONTRACT:

1. **Migration A** (`20260730150000`, aplicada) — aditiva: `wave_cohorts`
   como entidade relacional (FK composta coorte↔onda↔organização), coluna de
   versão do instrumento em `waves`, submissão que já não grava o token.
2. **Privacy hardening** (`20260730155000`, aplicada, entre A e B) —
   `aggregate_cohort_responses` deixa de devolver a contagem exata abaixo de
   k_min: `response_count = NULL`, só `response_count_label = "<5"`.
   Contagem exata para acompanhamento operacional vive em
   `count_cohort_participation`, função e permissão separadas
   (`RH_ADMIN`/`DIRETOR` da própria organização, nunca `anon`).
3. **Migration B** (`20260730160000`, aplicada) — `DROP COLUMN invite_token`
   sob 8 preconditions fail-closed (contagem exata, UUID exato das duas orgs
   autorizadas, e-mails controlados, ausência de dependentes). Prova
   pós-aplicação: `join wave_responses ⋈ wave_invites ON invite_token`
   falha por coluna inexistente — a junção não existe mais no schema.

### Prova dinâmica

Contra JWT real (não `service_role`) de usuário sintético: coorte n=6
visível com escore/Fatores/Domínios; coorte n=4 suprimida sem revelar o
número exato em nenhum campo do payload nem da tela; `count_cohort_participation`
nega `anon` e usuário de outro tenant; replay/token inválido/expirado
recusados; admin da organização sem `SELECT` em resposta bruta.

### Cleanup

Dados sintéticos (2 organizações, 2 usuários, 1 onda, 2 coortes, 11
convites, 10 respostas) removidos do staging em 2026-07-31, sob
preconditions que abortam se a contagem ou a identidade divergirem do
inventariado. Baseline restaurado exatamente: 15 organizações, 16
`wave_responses`, 16 `wave_invites`, 3 `waves` — idêntico ao estado
anterior à onda. Schema, funções e tipos regenerados preservados.

### Achados de ferramental corrigidos nesta onda

- `staging-guard.ts` tratava `VITE_SUPABASE_URL` como sinal de produção;
  a validação visual desta onda apontou essa variável para staging de
  propósito (é o que o navegador real lê), gerando falso positivo. Corrigido
  para depender só de `SUPABASE_URL` (nunca sobrescrito). Movido de
  `scripts/` para `src/lib/staging/` — só `src/` entra no gate
  (`bun test src`); o teste de regressão desse bug ficaria invisível ao CI
  se permanecesse em `scripts/`.
- O painel `/fibt-piloto` só renderizava os 3 Fatores; as 9 leituras de
  Domínio — já calculadas pelo engine — nunca chegavam à tela. Corrigido,
  com teste de renderização contando exatamente 9 `<li>`.
