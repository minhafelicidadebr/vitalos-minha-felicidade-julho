# Q1 · Conferência da fonte brasileira da COPSOQ

**Base do produto** `9759e8d`. A adoção da versão brasileira foi aprovada por João Paulo Brandão Barboza em 18/11/2026. A conferência trata da identificação da edição, da forma e das regras efetivamente servidas. [Registro da aprovação](decisions/Q1_COPSOQ_BRAZIL_APPROVAL_2026-11-18.md).

## O que as fontes estabelecem

| Referência | Evidência para o Q1 |
| --- | --- |
| Manifesto atual | `br-medio.estrutural.1`, 41 itens autorais, 14 dimensões, opções uniformes de frequência de 1 a 5, identidade demonstrativa. [Manifesto](../../src/domain/survey/copsoq-instrument-manifest.json). |
| COPSOQ II-Br, forma curta | A forma publicada por Gonçalves e colegas tem 40 questões e 23 dimensões. O Quadro 3 dos autores também distingue grupos com quatro e cinco alternativas e direções de pontuação. A tese reúne o instrumento completo nas pp. 78–81. [Artigo de 2021](https://revistas.usp.br/rsp/pt_BR/article/view/192716) · [Tese](https://repositorio.ufscar.br/items/ed9cde3b-9d06-4c2f-8d74-c419c265a479/full) · [Texto dos autores de 2026](https://doi.org/10.1590/2317-6369/30925pt2026v51e21). |
| COPSOQ II, forma média estudada no Sul | O modelo final de Lima e colegas contém 70 itens e 13 fatores. As contagens de outras formas chamadas “média” se referem a materiais diferentes. [Estudo de 2019](https://www.copsoq-network.org/assets/pdf/2025/lima-et-al-2019-psychometric-properties-of-a-medium-version-of-the-copenhagen-psychosocial-questionnaire-copsoq-ii.pdf). |
| Manual operacional NCOPSII local | Relaciona 41, 76 e 119 questões para curta, média e longa. O histórico do ADR menciona “41 itens NCOPSII”, e o documento de risco menciona nove dimensões na apresentação histórica. Isso identifica os registros e suas superfícies. A equivalência ao instrumento servido continua por demonstrar. [ADR-001](../ADR/ADR-001-sector-survey-links.md) · [Referência histórica](../instrumentos/COPSOQ_NR1.md). |
| COPSOQ III, forma padrão estudada por Bounassar | O Anexo 3 da dissertação contém o questionário brasileiro do estudo. Foram observados blocos com opções de frequência e de intensidade. A opção única para todos os itens no aplicativo atual diverge desse formato. A contagem do resumo da dissertação ficou fora da comparação do anexo. [Repositório da Universidade Lusófona](https://recil.ulusofona.pt/items/3d8b5e75-7434-448b-9423-e0aa0e6fc2d8/full). |

O guia local `VitalOS_Q1_COPSOQ_Fonte_e_Prompt_NotebookLM_2026-10-06.md`, seção 4, prevê a identificação da edição e da extensão antes da coleta. Nenhum registro consultado vincula a aprovação de novembro a um desses artefatos específicos. Usar uma das contagens, adotar a edição mais recente ou atualizar apenas o nome deixaria lacunas diferentes de equivalência. A escolha de engenharia foi comparar uma referência explícita antes de substituir a bateria.

## Verificador implementado

[Comando local](../../scripts/check-copsoq-source.ts) de leitura com saída JSON. A ficha independente pode começar pelos fatos demonstrados e depois declarar o vínculo esperado com o manifesto. O teste do próprio manifesto agora compara também os valores e rótulos da escala de frequência, na ordem servida.

```sh
bun --no-env-file scripts/check-copsoq-source.ts <ficha.json> <artefato-fonte>
```

| Entrada | Conferência |
| --- | --- |
| `artifactSha256`, `edition`, `sourceForm`, `sourceLocator` | Hash SHA-256 dos bytes do documento, edição declarada, forma e localização de origem. Para a triagem, `itemCount` e `uniformOptions` são opcionais. |
| `target` | `version`, `form`, `locale` e `attributionSha256` no manifesto servido. |
| `items` | Lista em ordem de aplicação. Cada registro contém `sourceId`, `id` servido, `dimensionId`, `kind`, `reverse`, `textSha256` e `optionsSha256`. Hash de texto em UTF-8/NFC. O hash das opções usa o JSON da sequência de pares `[valor, rótulo NFC]`. |
| `scoring` | `rulesLocator` e `cases` sintéticos com `id`, `responses` e `expected`. Cada linha de respostas segue a ordem de `items`, com `null` para ausência. O esperado é um mapa de dimensão para `{mean,n}`, ou `null` para recusa. Incluir um caso completo e um com ausência. Os casos usam a validação e o cálculo já chamados pelo aplicativo. |

`CASOS_COMPATIVEIS` (saída 0) significa que a ficha fornecida coincide com o instrumento e com os casos executados. `DIVERGENTE` ou `INCOMPLETO` (saída 1) lista a evidência incompatível ou faltante. Entrada inválida retorna saída 2. A referência e os resultados esperados vêm do instrumento e do manual, transcritos de forma independente do runtime. As médias verificadas são as do motor de agregação. Classificação de risco, publicação e habilitação empresarial têm contratos próprios.

## Provas desta etapa

| Documento consultado localmente | SHA-256 do arquivo | Resultado da execução |
| --- | --- | --- |
| Manual atualizado do NCOPSII, seção 2, quadro “Três Versões Disponíveis” | `b3efa89295dc7326739349a015ad54d42f5d0b577dc7a0ecf9d3710e547a4bba` | `INCOMPLETO`. A forma curta de referência e a demonstração têm 41 itens. Ficam por conferir o vínculo com o manifesto, os itens e os casos. |
| Bounassar 2024, Anexo 3, pp. 59–67 | `6ce1fa7a4bb3cca3a3626eeb772b551c16e57021ec042e19e44c1515ce27adc6` | `DIVERGENTE` em edição e opções por item. Nenhum escore oficial foi calculado com a bateria demonstrativa. |

As fichas de triagem foram usadas localmente, com os documentos acima em leitura. Os casos sintéticos de controle exercitaram comparação positiva, alteração de opções e inversões, versões divergentes, cálculo, denominador, ausência, dados inválidos e ids duplicados. [Testes do verificador](../../scripts/check-copsoq-source.test.ts) · [Paridade do manifesto](../../src/domain/survey/copsoq-instrument-manifest.test.ts).

**Verificações** · 41 testes em cinco arquivos, 187 asserções e zero falhas. TypeScript estrito nos arquivos alterados e diff aprovados. O Bun registrou `EPERM` ao enumerar a pasta do usuário no sandbox, com todas as cinco suítes concluídas e saída zero. Lint completo nos dois scripts novos e lint semântico no teste legado, que já tinha três desvios de formatação. A evidência do gate integrado e do build de `9759e8d` foi reutilizada para o aplicativo, pois o diff acrescenta verificação offline, testes e documentação.

## Próximo marco

Identificar por arquivo ou DOI a forma exata da aprovação e montar a ficha a partir desse instrumento, do manual correspondente e de casos calculados independentemente. É necessário conferir a versão por onda na adaptação futura: o agregador atual seleciona por código de instrumento e usa a escala única da definição. Com a forma exata, o verificador apontará as mudanças necessárias em coleta e cálculo antes do ensaio da Alfa. A permissão empresarial Q1 continua em preparação. Q2 segue independente. [Contrato da coleta](../../src/engine/survey/survey-engine.ts) · [Agregador](../../src/lib/api/capsule-aggregator.server.ts) · [Habilitação](../../src/lib/identity/module-access.server.ts).
