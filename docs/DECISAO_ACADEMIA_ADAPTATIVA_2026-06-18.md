# Decisão: Academia adaptativa, explicável e multissetorial

Data: 18 de junho de 2026

## Problema

A Academia já filtrava trilhas por papel e destacava coincidências nominais com pilares frágeis,
mas ainda tinha três lacunas: dependia de nomes em vez de identificadores estáveis, não usava
afinidades VIA-T e não oferecia catálogo próprio para Estudante, Educador e Família.

## Lentes usadas

- Ciência da aprendizagem: necessidade e afinidade cumprem funções diferentes; lacuna coletiva
  define prioridade, força percebida oferece uma porta de entrada motivacional.
- Ética e privacidade: IVO/IEV só entram como agregado protegido; VIA-T é opcional,
  exploratório e não pode alimentar julgamento ou decisão de RH.
- UX e acessibilidade: a pessoa precisa entender por que uma trilha apareceu, operar no celular e
  concluir módulos com alvos de toque adequados.
- Arquitetura SaaS: o ranking deve ser um motor puro, com conteúdo e vocabulário injetados por
  pack.
- Estratégia: uma Academia adaptativa fecha o eixo Educar do M.E.T.E. e aumenta a coerência do
  produto sem antecipar backend.

## Ramos avaliados

| Ramo                                                         | Valor | Risco | Custo | Tese | Reuso | Decisão       |
| ------------------------------------------------------------ | ----: | ----: | ----: | ---: | ----: | ------------- |
| A. Manter catálogo estático por papel                        |     4 |     8 |    10 |    4 |     5 | Rejeitado     |
| B. Hardcodar regras IVO/VIA-T na rota                        |     7 |     4 |     7 |    6 |     2 | Rejeitado     |
| C. Simular recomendações com texto de IA                     |     6 |     2 |     6 |    5 |     4 | Rejeitado     |
| D. Esperar dados e perfis reais da Fase 2                    |     5 |     8 |     8 |    7 |     8 | Adiado        |
| E. Integrar um LMS externo agora                             |     6 |     5 |     3 |    4 |     6 | Desnecessário |
| F. Motor genérico + catálogo por pack + explicação de fontes |    10 |     8 |     7 |   10 |    10 | Escolhido     |

## Escolha

O `academia-engine` passou a receber dois tipos explícitos de sinal:

- prioridade coletiva, derivada dos pilares visíveis e agregados do IVO/IEV;
- afinidade pessoal, derivada das forças percebidas do VIA-T demonstrativo.

Prioridade coletiva tem precedência sobre afinidade. O peso interno serve apenas para ordenação
determinística e nunca aparece como score de pessoa. A interface mostra os sinais correspondentes
em linguagem natural.

O catálogo foi separado por `packId`. A escola agora possui trilhas próprias para Estudante,
Educador, Família e gestão escolar. Antes de selecionar pilares frágeis, a rota limita o universo
aos alvos autorizados para o papel. Assim, um estudante não recebe como contexto principal uma
fragilidade docente apenas porque ela está baixa no IEV geral.

## Guardrails

- Nenhuma resposta individual é lida ou persistida pela Academia.
- IVO/IEV aparecem somente como agregados protegidos.
- VIA-T só personaliza afinidade em papéis individuais do pack Empresa.
- O disclaimer completo do VIA-T permanece visível quando há afinidade de forças.
- Pontos celebram aprendizagem; nunca alimentam avaliação, nota, promoção, remuneração ou ranking.
- O pilar escolar de ambiente livre de violência não aciona pontos ou trilhas gamificadas; sinais
  sensíveis permanecem fora da economia de aprendizagem.
- Conteúdo NR-1 foi retirado da Academia de florescimento; papéis exclusivos do Domínio B seguem
  para o módulo SST/NR-1, sem mistura de superfícies.
- Progresso de conclusão é apenas de sessão no mock atual.
- Conteúdo escolar evita infantilização e não gamifica sofrimento ou violência.

## Critérios de aceite

- Engine sem import de `domain/`, React ou mocks.
- Correspondência por ids, não por nomes.
- Prioridade coletiva vence afinidade; ambas permanecem explicáveis.
- Catálogos Empresa e Escola não vazam vocabulário entre setores.
- Estudante, Educador e Família têm trilhas próprias.
- Navegação escolar expõe a Academia pelo pack.
- Estados carregando, erro, vazio e mobile funcionam.
- Testes, typecheck, lint e build verdes.
