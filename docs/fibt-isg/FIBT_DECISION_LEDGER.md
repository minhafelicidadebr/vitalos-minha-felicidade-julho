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

1. Autorização ou licença formal de uso da FIB-T.
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

1. Licença/autorização formal de uso e digitalização.
2. Manual com regra de missing data e interpretação.
3. Confirmar item 5 no Fator 3 (Governança).
4. Confirmar os erros tipográficos dos itens 21 e 22.
5. Nome canônico: Bem-Estar Emocional ou Psicológico.
6. Existe fórmula autorizada de subíndice por domínio?
