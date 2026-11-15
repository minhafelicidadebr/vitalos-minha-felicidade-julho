# Matriz METE × perfis × drivers × contribuição ESG — execução local

Base preservada: `1e801f14bd1301d871fac6c5a2ab3cc16411f617`, branch `feat/ivo-fibt-platform-foundation`. Sem alterações rastreadas no início. .q.out/.q.sql não abertos ou incluídos. Execução do primeiro incremento A/B previsto no superprompt, com verificações sintéticas da parte D. Integração de dados reais (C), estudo avaliativo e validação com clientes (E) não executados nem presumidos.

## Entrega

- `src/lib/reports/mete-esg-matrix.ts`: modelo puro e cinco casos sintéticos independentes. Eventos guardam etapa METE, papel e estado registrado/planejado; vínculos E/S/G são propostos ou sem sustentação. Não há aprovação automática, peso, nota ESG ou novo critério de eficácia.
- `projectMatrixCase`: projeção por lista explícita; o caso protegido retorna conteúdo genérico sem ID interno, ação, driver, eventos, papéis, vínculos, fonte, observação ou comparação recebidos. Proteção é distinta de ausência de medida. Este código não substitui autorização/RLS: seus únicos consumidores atuais usam fixtures, não entradas reais.
- `countVisibleExecutionEvents`: conta referências únicas de evento registrado de Transformar nos casos visíveis. Mais perfis, temas ou linhas não duplicam o evento. É contagem operacional, não impacto ou taxa sobre população. Não é contrato de deduplicação multi-tenant para produção.
- `describeObservedChange`: subtração determinística na unidade original. Exige valores finitos, versão/unidade iguais e direção declarada; resultado incompatível não é calculado. Sem normalização, percentual, causalidade, IC, p-valor ou transferência de tamanho de efeito da literatura. Mudanças pequenas não são arredondadas a zero por fixar duas casas decimais.
- `MeteEsgMatrixPreview.tsx`: tabela resumida com facetas operacional/contribuição e fichas de avaliação, sem comando de emissão. Rótulos de papéis são legíveis; não concedem capabilities. A matriz está no preview editorial sintético existente, separado dos fluxos reais.
- `render-editorial-prototype.py --matrix`: acrescenta duas páginas ao documento, usando a projeção JSON produzida pelo mesmo módulo do app; cria outro PDF e preserva o anterior.

## Casos e afirmações permitidas

| Caso | Evidência ilustrativa | Relação proposta | Limite |
| --- | --- | --- | --- |
| Segurança psicológica | Encontro registrado | S; G condicionado a processo verificável | Não demonstra segurança ou ausência de retaliação |
| Autonomia | Revisão de fluxo e médias sintéticas 10 → 12 horas/demanda | S/G propostos | Δ +2 horas/demanda, contrário ao objetivo; sem efeito atribuível/IC estimável |
| Inclusão | Conteúdo protegido | Não exibida | Ocultar detalhes, não transformar em zero ou ausência |
| Crescimento | Oferta educativa parcial | S proposto | Sem avaliação de retenção/transferência; sem nota individual |
| Futuro/bem comum | Planejamento apenas | E sem sustentação | Sem baseline físico; não inferir energia/emissões de vitalidade humana |

Os casos são unidades ilustrativas independentes. Não representam totais da organização fictícia do corpo editorial, dados de clientes, estudos científicos ou relações causais aprovadas. Os papéis registrados/planejados são eventos de fixture, sem correspondência a usuários reais. Nenhum `study_id` fictício foi criado para cumprir o schema canônico. A matriz é proposta de revisão; não satisfaz por si o contrato de rastreabilidade ESG para emissão.

## Estatística e ciência

A única operação numérica nova é a diferença descritiva em mesma unidade/versão. O exemplo não dispõe de comparador/variância/desenho que permita atribuir efeito ou emitir intervalo. Métodos DiD, séries temporais, modelos hierárquicos e análise causal continuam opções do protocolo proposto, sem implementação ou validação automática. Testes de software não dão validade científica aos vínculos.

Preservados schema `esg-trace`, governança D1–D10/M1–M6, índices/mappings pendentes, motores legados, fórmulas COPSOQ e handlers de snapshot. Não houve migration, nova dependência, banco de grafos, RAG/LLM ou envio de dados a terceiros. Fonte COPSOQ segue dependência específica de Q1; o desenho editorial e trabalho independente Q2 não a reabrem.

## PDF e reprodução

Artefato: `docs/vitalos/artifacts/RELATORIO_METE_MATRIZ_PROTOTIPO.pdf`, nove páginas A4 com marcas oficiais VitalOS/Instituto, avisos sintéticos, paginação, matriz de cinco casos e leitura crítica do exemplo desfavorável. Todas as nove páginas foram renderizadas e inspecionadas; após ajustar a frase do estado protegido, a página afetada foi renderizada e reinspecionada. O PDF anterior de sete páginas foi preservado por hash. Não é impressão HTML do navegador, snapshot ou emissão com dados reais.

O export do modelo-base segue `RELATORIO_METE_IMPLEMENTACAO.md`. Antes de executar o renderizador com `--matrix`, exportar também a projeção:

```javascript
import { buildSyntheticMatrix } from './src/lib/reports/mete-esg-matrix';
await Bun.write('.institutional-admin.local/editorial-esg-matrix.json', JSON.stringify(buildSyntheticMatrix(), null, 2));
```

Depois: `python scripts/render-editorial-prototype.py --matrix`, seguido de Poppler e inspeção visual. Usar runtime de artefatos com reportlab/pypdf/Pillow e fontes Windows já descritos no registro anterior, respeitando o contrato da skill de PDF. `--matrix` exige modo sintético e cinco casos; o script confere nove páginas e aviso sintético por página. Não aumentar o limite esperado para encobrir paginação ruim. JSON e PNGs intermediários permanecem ignorados no harness local.

## Verificação

Sete testes direcionados aprovados (matriz e preview); cobertura de deduplicação, retenção, mudança desfavorável/zero/pequena, versões/unidades incompatíveis, valores não finitos, papéis, vínculo ambiental sem medida e ausência de comando de emissão. Teste anterior passou a identificar a tabela de continuidade por nome acessível, pois agora há duas tabelas. Sem alteração de regra para fazê-lo passar.

Gate integrado final: **4.294 pass / 0 fail / 334 arquivos**, paridade, TypeScript e secret-scan. Primeiro gate passou antes do refinamento de copy/projeção do estado protegido; foi repetido porque esse refinamento alterou a saída. Logs ignorados: `matrix-mete-tests.log`, `matrix-mete-gate.log`, `matrix-mete-gate-final.log`.

Build inerte isolado aprovado em `module-build-1794772044885`, varredura de 675 fontes/303 artefatos sem credencial ou identificador de projeto real; `.output` original preservada. O refinamento posterior foi restrito ao texto da projeção protegida e sua asserção: gate final executado; sem mudança de importação/configuração, o build não foi repetido. Log `matrix-mete-build.log`; metadados genéricos locais atualizados, diretórios anteriores preservados. Sem deploy.

Mobile: tabela em região nomeada/focável com rolagem própria; fichas quebram texto e empilham antes de `sm`; títulos/ícones preservam rótulos. Sem prova visual em viewport mobile, impressão HTML, avaliação assistiva ou estudo com clientes. Não declarar acessibilidade homologada, efeito pedagógico medido ou ganho de design percentual.

## Revisão humana concreta e próximo marco

Revisar as cinco relações apresentadas: adequação do driver/mecanismo, natureza do vínculo E/S/G, evidência necessária e linguagem permitida. Definir separadamente os desfechos e desenhos que merecem avaliação estatística; não definir pesos pelo número de atividades. A matriz já permite decisão concreta mesmo sem magnitude causal.

Próximo marco único: aprovar ou rejeitar essas relações como propostas de uso definido e o contrato de emissão correspondente; depois conectar uma prática Q2 autorizada em fatia própria, com isolamento, supressão e curadoria verificados. Nenhum desses gates é declarado satisfeito por este protótipo.
