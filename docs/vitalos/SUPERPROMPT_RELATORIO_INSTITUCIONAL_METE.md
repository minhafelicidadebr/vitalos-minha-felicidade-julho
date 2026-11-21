# Superprompt — relatório institucional VitalOS × Instituto Felicidade para Todos

Estado: especificação orientadora; execução local autorizada posteriormente pelo operador em 2026-11-15. Blueprint, componentes e protótipo sintético entregues; integração completa de fontes reais e validação com clientes permanecem pendentes. Ver [registro da implementação](RELATORIO_METE_IMPLEMENTACAO.md). Não declara dados consolidados, conformidade ESG, aprovação metodológica ou prontidão comercial. Criado a partir da inspeção local até `685881e` e das referências abaixo; este prompt não concede autorização para operações remotas.

## Escolha de caminho — síntese ToT

Notas de julgamento, não métricas observadas. Escala 0–10, sempre 10 favorável: em custo/risco/complexidade/tempo significa econômico, seguro, simples e rápido.

| Alternativa | Valor | Segurança | Custo | Risco | Tese | Reuso | Simplicidade | Escala | Rapidez |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Melhorar apenas a impressão atual | 6 | 8 | 9 | 8 | 6 | 5 | 9 | 5 | 9 |
| B. Novo gerador completo de imediato | 8 | 5 | 3 | 4 | 8 | 8 | 3 | 8 | 3 |
| C. Protótipo editorial com fixtures explícitas | 8 | 10 | 8 | 9 | 9 | 8 | 8 | 7 | 8 |
| D. Esperar todos os dados reais | 3 | 9 | 10 | 8 | 4 | 3 | 10 | 3 | 2 |
| E. Integrar plataforma externa de relatórios | 6 | 5 | 4 | 5 | 6 | 6 | 4 | 7 | 4 |
| F. Modelo editorial + projeção autorizada + renderizador | 10 | 9 | 7 | 9 | 10 | 10 | 6 | 10 | 7 |

Recomendação: F em incrementos, começando por C e reutilizando o que for adequado de A. Trade-off: exige contrato editorial inicial, mas evita acoplar narrativa a mocks ou criar um gerador paralelo aos contratos institucionais. Não aguardar Q1 para desenvolver estrutura e capacidades independentes de Q2. Primeiro passo: blueprint do documento e inventário de campos/fontes, antes de refatorar a rota.

---

## Prompt pronto para uso

Atue como responsável técnico e editorial pela evolução do relatório institucional VitalOS, com perspectiva integrada de engenharia, design de informação, acessibilidade, aprendizagem de adultos, avaliação organizacional, pesquisa e relato de sustentabilidade. Use raciocínio estruturado e comparação de alternativas. Entregue decisões, critérios e evidências; não exponha cadeia de pensamento privada nem alegue credenciais profissionais pessoais.

### 1. Missão

Criar uma arquitetura de relatório institucional que, quando houver dados autorizados e consolidados, consiga narrar com clareza e rigor o ciclo **Mensurar → Educar → Transformar → Evoluir**, articulado ao IVO **EU, NÓS, LIDERANÇA e ORGANIZAÇÃO** e às lentes anuais **Q1 COPSOQ, Q2 FIB-T, Q3 PERMA+V e Q4 VIA-T**.

O produto precisa ajudar o leitor a compreender o contexto, interpretar evidências, reconhecer limites e tomar decisões. Qualidade premium significa precisão, legibilidade, coerência de marca e utilidade; não adjetivação, excesso de gráficos ou resultados sempre positivos. O relatório deve funcionar também quando os resultados forem inconclusivos, desfavoráveis ou incompletos.

Não invente dados atuais para preencher o futuro. Prepare estados, contratos e layouts com fixtures sintéticas explicitamente identificadas. Não confunda trimestre/lente com etapa METE: educação, transformação e evolução podem ocorrer ao longo de diferentes lentes e períodos.

### 2. Reconhecimento e fronteiras

Confirme caminho, branch, HEAD e status local; preserve trabalho posterior. Leia AGENTS.md e documentos canônicos de modo seletivo. Não abra .q.out, .q.sql, secrets ou .env. Não reinicie auditoria completa nem repita testes sem invalidação.

Inspecione especialmente:
- `src/routes/relatorio-global.tsx`, `src/styles.css` e os componentes de contexto do relatório;
- engines de relatório ESG/anexo, serviços de snapshot, autorização e políticas de privacidade;
- contratos de leitura publicada Q2, PI-13, ação/aprendizagem e governança;
- componentes de marca e ativos oficiais em `public/brand/vitalos` e `docs/brand/vitalos`;
- registro de auditoria de design e checkpoint mais recente.

Separe implementado, documentado, demonstrativo, persistido, aspiracional e não confirmado. Não use comentário histórico ou nome de variável como prova de validade científica. Preserve decisões confirmadas da COPSOQ; correspondência à fonte exata e demais pendências específicas de Q1 não autorizam inventar método. Não aprove mapeamentos lente→dimensão, índice composto, equivalências ESG, critérios de eficácia ou validade temporal.

Sem push, publicação, deploy, e-mail externo, migração remota, contas reais ou alteração de dados reais. O uso futuro deste prompt autoriza apenas o escopo expressamente aprovado pelo operador. Registre decisões humanas necessárias em um único conjunto e continue as partes independentes. Não use o adiamento da prova de navegador como motivo para afirmar que ela ocorreu.

### 3. Identidade institucional e marca

Use a marca oficial **VitalOS**, sem substituir por variações de transcrição. Reutilize seus ativos originais, proporções e tokens. Não redesenhe logos com IA ou recoloração automática.

Referência institucional fornecida pelo operador:
- **Instituto Felicidade para Todos**.
- Missão: “ativar e animar ecossistemas sustentáveis de felicidade humana, socioambiental e organizacional”.
- Endereço informado: Impact HUB Brasília — SGAN 601, Lote H, Ed. Íon, Ala Amarela, Asa Norte, Brasília/DF.
- Telefone informado: (61) 3550-8779.
- Site: https://www.felicidadeparatodos.com.br/
- Instagram: https://instagram.com/felicidadeparatodosbr
- Logo completo: https://felicidadeparatodos.com.br/assets/logo-full-BcruAUmu.png
- Logo horizontal: https://felicidadeparatodos.com.br/assets/logo-horizontal-DkxgTxXi.png

Esses dados foram fornecidos pelo operador; não presumir verificação externa. Os URLs de logo não puderam ser inspecionados na elaboração desta especificação. Na implementação, tentar obtê-los pelo meio autorizado, conferir conteúdo, formato, transparência e legibilidade antes de incorporar. Falha de acesso não autoriza fabricar logo; reservar espaço identificado no protótipo.

Propor coassinatura: VitalOS como plataforma/framework e Instituto como organização idealizadora, conforme informação do operador. A redação exata sobre titularidade/detenção da tecnologia e direitos deve ser validada pelo responsável institucional antes da emissão final; a interface não prova titularidade jurídica. Não inventar CNPJ, endereço complementar, assinatura, registro, parceiros ou selo de acreditação.

Criar lockup institucional com hierarquia, área de proteção e versões adequadas a fundo claro/escuro. Não deformar ou equalizar artificialmente logos com proporções distintas. Contatos ficam no expediente final, sem sobrecarregar cada página. Dados de contato configuráveis/versionados para evitar desatualização silenciosa. Destacar a empresa destinatária sem confundi-la com a realizadora da tecnologia.

### 4. Arquitetura narrativa e editorial

Criar documento modular, com extensão proporcional à evidência disponível. Não impor número fixo de páginas nem preencher capítulos sem dados. Propor três níveis de leitura: síntese executiva, análise explicada e anexos verificáveis.

Estrutura-base:
1. **Capa e identificação:** título, empresa/escopo, período, estado do documento, versão, data de corte, marcas e classificação de circulação. Não usar “confidencial” sem política aplicável.
2. **Apresentação institucional:** propósito do ecossistema e missão do Instituto; por que este relatório existe, para quem é e o que permite decidir. Separar propósito de evidência de resultado. A introdução é necessária, curta e útil.
3. **Guia de leitura:** METE, lentes anuais, legenda de estados e diferença entre dado, relato, hipótese, resultado e impacto. Explicar escalas sem criar equivalências.
4. **Síntese executiva:** achados sustentados, lacunas, barreiras, decisões e próximos compromissos. Incluir achados negativos/inconclusivos com a mesma visibilidade dos favoráveis.
5. **Mensurar:** instrumento/versão, período, recortes autorizados, cobertura, publicação/proteção, escalas nativas e limites de comparação.
6. **Educar:** necessidades que orientaram a oferta, conteúdo/versão/curadoria, público autorizado, participação, avaliações de aprendizagem quando existirem e limites. Participação não é domínio, retenção ou transferência. Não expor respostas/notas individuais ao empregador.
7. **Transformar:** hipótese da intervenção, responsável por papel, condições de trabalho, apoio, recursos, prazo, execução, barreiras, alterações e efeitos indesejados. Conclusão de ação não demonstra eficácia.
8. **Evoluir:** observações posteriores, revisões, comparabilidade, aprendizados, decisões e próximo ciclo. Melhora temporal não demonstra atribuição causal.
9. **Contribuições ESG:** evidências relevantes e referências permitidas, com limitações e revisão humana. Não forçar indicadores de felicidade a cobrir E/S/G. Declarações de materialidade precisam de autor/papel, data e método; não inferir dupla materialidade automaticamente.
10. **Plano de continuidade:** compromisso, responsável, prazo, dependência, evidência esperada e momento de revisão. Separar recomendação proposta de compromisso assumido.
11. **Metodologia e fontes:** versões, regras aplicadas, recortes, supressões, qualidade, referências e limitações, sem texto científico decorativo.
12. **Anexos e expediente:** tabelas autorizadas, linhagem, decisões metodológicas vigentes, identificação da emissão e contatos institucionais.

Cada unidade analítica responde, quando sustentado: **o que foi observado → de onde vem → o que permite compreender → o que não permite concluir → qual decisão/revisão cabe agora**. Uma relação mensuração→conteúdo→ação deve ser persistida ou declarada como não estabelecida; não criar ligação causal pela proximidade visual.

### 5. Princípios instrucionais e de visualização

Usar segmentação, hierarquia, sinalização e proximidade entre explicação e figura para reduzir esforço de interpretação. Aplicar como hipóteses de design sustentadas por referências, sem prometer efeito de aprendizagem em executivos a partir de estudos de outro contexto. Não inferir “estilos de aprendizagem”.

- Uma pergunta principal por figura; título descritivo ou conclusão estritamente apoiada nos dados.
- Rótulos próximos dos valores, unidade/escala/data/recorte/fonte visíveis; distinguir porcentagem de pontos percentuais.
- Barras para comparação categórica; linhas para séries comparáveis; tabelas para valores exatos e auditoria; matriz de estados para cobertura; linha do tempo para execução. Sem 3D, radares decorativos ou medidores que sugiram maturidade aprovada.
- Barras quantitativas com origem adequada e escalas comparáveis; não truncar eixo para exagerar mudanças. Se houver exceção analítica, explicá-la. Sem bandas de confiança ou benchmarks sem método/fonte.
- Ausente, indisponível, protegido, não aplicável, desatualizado e pendente são estados distintos; nenhum vira zero.
- Ícones com função consistente e rótulos; não substituir termos técnicos por símbolos ambíguos. Cores de marca não são classes de risco.
- Glossário próximo do primeiro uso; resumo de interpretação sem repetir literalmente toda a tabela. Não adicionar quiz obrigatório ao documento executivo.
- Permitir percurso rápido e aprofundamento. Limitações essenciais não ficam escondidas em rodapé minúsculo.

### 6. Modelo de dados e emissão

Separar três camadas: **projeção de dados autorizada → modelo editorial tipado → renderização HTML/print/PDF**. Reutilizar contratos existentes; não criar ledger paralelo ou puxar mocks para completar dados reais. Mock somente em fixtures/preview inequivocamente marcados, inclusive em todas as saídas exportadas.

Definir, sem assumir schema atual, contrato proposto para cada bloco: identificador, eixo METE, período, organização/escopo permitido, estado, origem/linhagem, versão do instrumento/conteúdo/cálculo, unidade/escala, publicação, supressão, comparabilidade, classe da afirmação, limitações e referência às decisões autorizadoras. Separar payload público do metadado restrito; linhagem não autoriza divulgar UUID, contagem ou recorte protegido.

Planejar estados: sintético; dado autorizado disponível; parcial; protegido; sem evidência; método pendente; falha de consulta; referência histórica. Falha não pode produzir fallback demonstrativo silencioso. Não misturar versões/períodos nem somar pessoas sem deduplicação contratada. Datas, timezone e regras de arredondamento explícitos.

Narrativa inicial determinística por templates e campos validados. Não introduzir LLM/RAG apenas para tornar o texto elegante. Se uma etapa futura aprovar IA generativa, exigir política própria de fontes, dados permitidos, citações, validação de saída e revisão humana; nunca enviar dados pessoais a serviço externo sem autorização específica.

Separar prévia, impressão e snapshot. Não alterar significado de estados de emissão nem criar alegação de imutabilidade/assinatura pela presença de hash. Snapshot existente e dados históricos permanecem preservados. Um relatório emitido precisa registrar a versão editorial e a data de corte; a forma de congelar conteúdo depende de contrato técnico aprovado.

### 7. HTML, impressão e PDF

Reutilizar inicialmente HTML semântico e o fluxo atual de impressão, se atender aos requisitos demonstráveis. Comparar com gerador dedicado somente após identificar limitações concretas. Evitar refactor amplo como condição para melhorar capa, metadados e narrativa.

Definir grade editorial A4, margens, escala tipográfica legível, ritmo vertical, cabeçalhos/rodapés, legenda e numeração. Repetir cabeçalhos de tabelas longas; permitir divisão de tabelas, evitando linhas cortadas. Não aplicar `break-inside: avoid` universalmente a blocos maiores que uma página. Garantir avisos de demonstração em capa e páginas relevantes, inclusive se um trecho for compartilhado sozinho.

Texto selecionável/pesquisável, fontes apropriadas e figuras nítidas. Sem transformar páginas inteiras em screenshot. Testar logos no tema de impressão, preto e branco, valores extensos e nomes longos. HTML acessível não garante PDF marcado: verificar tags, ordem de leitura, títulos, idioma, links e alternativas textuais antes de alegar acessibilidade do PDF. Nenhuma alegação PDF/UA ou PDF/A sem validação específica.

Web responsiva não é miniatura do A4: testar 360/390px, tablet, desktop e zoom 200%; tabela pode ter região rolável nomeada no HTML, mas precisa de solução de paginação no papel. Validar foco, contraste e uso sem cor. Navegador adiado significa prova pendente, não dispensa permanente de renderização e inspeção do artefato final.

### 8. Plano incremental e entregáveis

Antes de implementar, apresentar plano curto e mapa de dependências. Não encerrar apenas com planejamento quando houver implementação autorizada.

Onda A: blueprint editorial, tokens de coassinatura, inventário fonte→bloco e fixtures para situações favoráveis, desfavoráveis, inconclusivas, protegidas e incompletas. Entregar introdução-modelo com placeholders, uma síntese executiva e um exemplo de página analítica.

Onda B: componentes de capa/expediente, guia de leitura, blocos METE, cartões de evidência e tabelas; narrativa determinística, layouts web/A4 e avisos persistentes. Protótipo sintético não depende de dados oficiais prontos.

Onda C: conectar somente as projeções institucionais autorizadas e disponíveis; omitir ou declarar pendências nos blocos restantes. Não bloquear toda a estrutura pela fonte Q1, nem preencher Q1 com conteúdo de outro instrumento.

Onda D: testes de contrato/permissão/redação, testes proporcionais de renderização, PDF sintético e inspeção de páginas. Não iniciar stack preservado, nova migração ou publicação sem escopo autorizado. Reutilizar evidências válidas.

Onda E: preparar validação futura autorizada com leitores representativos — conselho, RH/DHO, liderança e responsáveis técnicos. Medir se localizam origem, distinguem execução de eficácia, reconhecem limites e identificam a decisão seguinte. Comparar erros, ajuda necessária e compreensão antes/depois; não inventar metas percentuais.

Entregar arquivos editados, screenshots/artefatos sanitizados quando disponíveis, testes/comandos, lacunas, decisões humanas agrupadas e próximo marco único. Não incluir dados sensíveis ou links de autenticação nas evidências.

### 9. Critérios de aceite

- Capa e expediente aplicam marcas oficiais e atribuições validadas, sem inventar titularidade ou certificação.
- Introdução explica propósito, público, escopo e limites; linguagem institucional clara, sem triunfalismo.
- Toda afirmação factual possui fonte autorizada ou identificação sintética inequívoca.
- Execução, participação, aprendizagem, mudança observada, eficácia e impacto permanecem distintos.
- Sem índice, mapping, benchmark ou regra metodológica pendente apresentado como aprovado.
- Estado protegido não revela contagem/dado por figura, texto, tabela ou exportação.
- Layout funciona com dados ausentes, adversos, longos e com várias páginas.
- Emissão não mistura corpo demonstrativo com anexo institucional sem identificação explícita por seção.
- Testes de software não são descritos como validação científica; aprovação visual não vira homologação ESG.
- Relatório prepara decisões e revisão do ciclo; não usa estética para prometer resultado.

### 10. Introdução-modelo para o protótipo

> Este relatório apresenta o acompanhamento do ciclo de desenvolvimento organizacional de [ORGANIZAÇÃO], no período [PERÍODO], no ecossistema VitalOS. Organiza as evidências disponíveis em Mensurar, Educar, Transformar e Evoluir, para apoiar compreensão, prestação de contas e decisões de continuidade. Cada seção identifica suas fontes, seu estado e seus limites. A execução de ações e a participação em atividades não são, por si, comprovação de aprendizagem, eficácia ou impacto. [ESTADO DO DOCUMENTO: PROTÓTIPO SINTÉTICO / DADOS AUTORIZADOS PARCIAIS / EMISSÃO REVISADA — selecionar pelo contrato, sem promover automaticamente].

A missão do Instituto pode compor a apresentação institucional em parágrafo separado, identificada como propósito, não como achado do período. Redação de coassinatura e titularidade exige aprovação institucional. Não imprimir alternativas ou placeholders como se fossem dados de uma emissão final.

## Referências e limites da fundamentação

- [IES/WWC — Organizing Instruction and Study to Improve Student Learning](https://ies.ed.gov/ncee/wwc/PracticeGuide/1): referência de organização instrucional. Transferência de recomendações para leitura de relatório executivo é hipótese de design, não eficácia comprovada para esse público.
- [W3C/WAI — Page Structure](https://www.w3.org/WAI/tutorials/page-structure/): estrutura, regiões e títulos para orientação e acessibilidade HTML. Não certifica PDF.
- [ONS — Data visualisation guidance](https://service-manual.ons.gov.uk/data-visualisation/guidance): títulos, anotações, eixos, ordenação e clareza de gráficos.
- [GRI — Standards](https://www.globalreporting.org/standards/): referência de relato de impactos e temas materiais. Citar GRI/ODS não torna o relatório conforme; escopo, requisitos vigentes e uso permitido precisam de análise específica antes de qualquer alegação.
- Identidade do Instituto: dados/URLs fornecidos pelo operador; acesso web indisponível na elaboração. Identidade VitalOS: ativos e mapa de marca existentes no repositório. Não foram baixados, redesenhados ou incorporados logos nesta entrega.
