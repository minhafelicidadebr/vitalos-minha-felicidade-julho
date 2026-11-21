# Relatório institucional METE — execução local

Base preservada: `685881e`, branch `feat/ivo-fibt-platform-foundation`. O superprompt antes não rastreado foi preservado e passa a integrar esta entrega. Sem outras alterações rastreadas no início. .q.out e .q.sql não abertos nem incluídos.

## Decisão e arquitetura

Executadas as partes independentes: blueprint, contrato editorial puro, fixture sintética, componentes de apresentação, ativos oficiais inspecionados, protótipo acessível pela rota existente e PDF estático com páginas inspecionadas. Não há novo endpoint, dependência do app, LLM/RAG, banco ou ledger. HTML e PDF usam o mesmo modelo de conteúdo, com renderizadores distintos; o PDF de referência não é a impressão do navegador nem uma emissão do backend.

`src/lib/reports/institutional-editorial.ts`: estado explicitamente sintético, versão, organização fictícia, período/corte, blocos METE e continuidade proposta. Evidências têm estados distintos (disponível, parcial, histórico, protegido, ausente, pendente, indisponível e não aplicável). A projeção seleciona campos explícitos; estados retidos não carregam texto, fonte, valor ou contagem extras. Isso não substitui autorização/RLS: labels e textos interpretativos continuam sendo conteúdo editorial autorizado, não um sanitizador de dados arbitrários.

`InstitutionalEditorialPreview.tsx`: capa com logos, apresentação, guia, síntese, quatro análises (observação/fonte/limite/interpretação/revisão), limites ESG, tabela de continuidade e expediente. Os exemplos incluem barreira organizacional e conclusão inconclusiva. Não há índice, escore ou impacto inventado. A sequência METE não cria relação causal ou mapeamento lente→dimensão.

`relatorio-global.tsx`: seção expansível “Explorar o protótipo editorial METE · dados sintéticos”, separada do corpo legado e do anexo institucional. Ela não recebe sessão ou dados reais e fica fora da impressão padrão (`print:hidden`), evitando inserir outra fixture na emissão da página. Capa da impressão existente reutiliza a marca oficial VitalOS e o logo do Instituto, sem mudar handlers, payloads ou permissões. Snapshot e impressão continuam operações distintas. Para avaliar o documento novo, usar o PDF sintético separado desta entrega.

## Identidade

Os dois arquivos do Instituto enviados pelo operador foram obtidos dos URLs oficiais e inspecionados. Hashes e procedência em `public/brand/instituto/README.md`. Completo 1198×481: usado sem alteração sobre branco. Horizontal 223×55: texto branco, preservado como fonte, não ampliado para impressão. Logos VitalOS reutilizados do repositório, sem redesenho ou recoloração.

Instituto identificado como organização idealizadora conforme informação do operador. Titularidade jurídica e redação definitiva da emissão não são presumidas. Missão e contatos estão em objeto versionado e no expediente; não são dados de cliente nem evidência de resultado. A marca não recebe selo de acreditação inexistente.

## Inventário fonte → bloco

| Bloco | Situação atual deste protótipo | Integração futura permitida / limite |
| --- | --- | --- |
| Identidade da organização/período | Fixture explícita | Projeção de sessão e período autorizados, nunca persona demonstrativa como fallback |
| Mensurar | Exemplo protegido sem contagem | Leitura publicada Q2 já autorizada; respeitar supressão/versão/escala. Q1 depende da correspondência à fonte aprovada |
| Educar | Oferta parcial sintética | Catálogo/curadoria e registros autorizados; não usar nota privada ou participação como prova de retenção |
| Transformar | Execução e barreira sintéticas | PI-13 e ledger existentes, com fonte e papel; sem duplicar organização/armazenamento |
| Evoluir | Método pendente/inconclusivo | Protocolos e observações autorizados, comparabilidade e decisão metodológica vigente |
| ESG | Ausência de impacto demonstrado | Revisão humana de vínculos e materialidade; sem pontuação/conformidade automática |
| Anexo institucional legado | Preservado; não executado | Sessão/capability e serviços existentes; fórmula COPSOQ histórica não aprovada por esta entrega |
| Snapshot | Preservado; não executado | Contrato de emissão/versionamento deve ser definido antes de incluir o modelo editorial em payload |

Não foi criada adaptação automática da fixture a dados reais. A indisponibilidade de uma fonte futura deve produzir estado explícito, sem reutilizar mocks. Conectar o relatório completo exige contrato de emissão aprovado e decisões metodológicas aplicáveis; o trabalho editorial de Q2 não depende de destravar Q1.

## Artefato e reprodução

`docs/vitalos/artifacts/RELATORIO_METE_PROTOTIPO.pdf`: sete páginas A4, texto selecionável, fontes embutidas, logos originais, margens e paginação. Todas as páginas foram renderizadas por Poppler e inspecionadas visualmente. Sem captura de navegador, dados reais ou consulta de serviço. O renderizador é específico de fixture e rejeita `mode` diferente de `synthetic`; não é o gerador institucional de produção. Sem alegação PDF/UA/PDF/A ou teste assistivo.

Reprodução no runtime de artefatos com Python + reportlab/pypdf/Pillow e fontes Arial/Georgia do Windows; não adicionar essas bibliotecas ao app. Exportar primeiro o modelo projetado para `.institutional-admin.local/editorial-mete-model.json`:

```javascript
import { SYNTHETIC_EDITORIAL, REPORT_INSTITUTION, projectEditorialEvidence } from './src/lib/reports/institutional-editorial';
await Bun.write('.institutional-admin.local/editorial-mete-model.json', JSON.stringify({
  ...SYNTHETIC_EDITORIAL, institution: REPORT_INSTITUTION,
  blocks: SYNTHETIC_EDITORIAL.blocks.map(b => ({...b, projected: projectEditorialEvidence(b.evidence)})),
}, null, 2));
```

Depois executar `python scripts/render-editorial-prototype.py` e renderizar com `pdftoppm -scale-to 1000 -png ...`. Seguir o contrato da skill de PDF para operações de autoria. PNGs intermediários e JSON estão ignorados no harness. O script confere sete páginas, extração de texto e marcação sintética; qualquer mudança de conteúdo exige nova revisão visual, não apenas atualizar a contagem esperada.

## Verificação e limites

40 testes direcionados aprovados (projeção/editorial, contexto global e engines do relatório/anexo), TypeScript sem erros. Teste malformado confirma omissão de campos extras em estados retidos; teste DOM confirma METE, marcação sintética e ausência de comando de emissão no preview. Testes não equivalem a validação científica ou prova de isolamento institucional do novo formato, que ainda não consulta dados reais.

Gate integrado: **4.289 pass / 0 fail / 333 arquivos**, paridade de schema, TypeScript e secret-scan aprovados. Log ignorado `editorial-mete-gate.log`. Build inerte isolado aprovado em `module-build-1794769985061`: varredura de 673 fontes/302 artefatos sem credencial ou identificador real; `.output` original preservada pelo helper, sem deploy. Log ignorado `editorial-mete-build.log`; metadados genéricos locais atualizados, diretórios anteriores preservados. Documentação de fechamento não altera os inputs dessas provas; não repetidas.

Renderização/inspeção das sete páginas concluída. Navegador mobile/desktop, impressão HTML real, leitor de tela, cenários de muitas páginas e clientes reais permanecem pendentes. Um documento estático legível não comprova qualidade de todos os possíveis dados futuros.

Fechamento: metadados intrínsecos dos logos ajustados às dimensões PNG efetivas (1198×481 e 223×55), após gate/build. Ajuste restrito a dimensões de imagem, documentação e renderizador estático: 2 testes do preview repetidos e aprovados; PDF regenerado, capa reinspecionada com proporção correta, sete páginas/texto/avisos conferidos. Sem repetição de gate/build por esse ajuste de metadados. `.gitattributes` declara somente os PDFs desta pasta de artefatos como binários, evitando tratar a estrutura interna PDF como texto sujeito a whitespace.

## Decisões humanas agrupadas e próxima ação

1. Redação institucional definitiva de coassinatura/titularidade e circulação.
2. Contrato de emissão: público, escopo, versões, corte, retenção e permissão de cada bloco, reutilizando controles existentes.
3. Curadoria e interpretação permitida por instrumento; método/comparabilidade e vínculos ESG que continuarem pendentes.
4. Autorização/desenho de futura avaliação com leitores representativos. Perguntas: localizar fonte; distinguir participação de aprendizagem; execução de eficácia; reconhecer dado protegido e apontar próxima decisão. Registrar compreensão, erros e ajuda necessária; pactuar critérios antes do piloto, sem contatos/coleta real nesta etapa.

Próximo marco único: validar o blueprint editorial e o contrato de emissão com os responsáveis, usando o protótipo para uma decisão concreta. A partir disso, conectar uma projeção Q2 autorizada em fatia separada, com testes negativos de organização/recorte/supressão, sem alterar método ou preencher lacunas Q1.
