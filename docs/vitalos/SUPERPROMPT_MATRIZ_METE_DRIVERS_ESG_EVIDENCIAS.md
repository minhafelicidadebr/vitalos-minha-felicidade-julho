# Superprompt — matriz METE × perfis × drivers × evidências ESG

Versão 0.1.0 — PROPOSTA PARA REVISÃO, 2026-11-15. Base local observada na elaboração: `0c6746783cdf49cccb7e248bfdd6af5152093360`, branch `feat/ivo-fibt-platform-foundation`. Não aprova metodologia, pesos, critérios de eficácia, mapeamentos ou alegações ESG. Execução local parcial autorizada posteriormente pelo operador: matriz/preview/PDF sintéticos, descritos em [MATRIZ_METE_ESG_IMPLEMENTACAO.md](MATRIZ_METE_ESG_IMPLEMENTACAO.md). Demais ondas e gates continuam pendentes.

## Decisão de desenho — síntese ToT

É possível organizar relações lógicas e avaliar evidências agora. Quantificar efeito exige um desfecho definido, dados adequados e um desenho de avaliação defensável. Nenhuma IA consegue recuperar de uma lista de atividades o efeito causal que não foi identificado nos dados.

Separar três saídas: **relação temática proposta → sustentação da contribuição → magnitude estimada, quando identificável**. Não converter uma saída na outra por conveniência visual.

Notas abaixo são julgamentos de planejamento, não validação empírica. Escala 0–10, sempre favorável: custo = economia, risco = baixo risco, complexidade = simplicidade, tempo = rapidez.

| Caminho | Valor | Segurança | Custo | Risco | Tese | Reuso | Simplicidade | Escala | Rapidez |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Matriz temática com evidências, sem nota de impacto | 8 | 10 | 9 | 10 | 9 | 8 | 9 | 8 | 9 |
| B. Índice ESG único calculado de atividades e pesos | 5 | 3 | 6 | 2 | 4 | 6 | 5 | 6 | 6 |
| C. Protótipo sintético com estimativas condicionais | 8 | 9 | 8 | 9 | 9 | 9 | 8 | 8 | 8 |
| D. Esperar todos os resultados reais | 3 | 9 | 10 | 8 | 4 | 3 | 10 | 3 | 2 |
| E. Integrar plataforma externa de ratings | 5 | 5 | 3 | 4 | 5 | 5 | 4 | 7 | 4 |
| F. Grafo de contribuição versionado + avaliação por desfecho | 10 | 9 | 6 | 9 | 10 | 10 | 5 | 10 | 6 |

Recomendação: **A como primeiro incremento, C para testar estados e F como arquitetura evolutiva**. B mistura decisões de valor, execução e efeito e facilita dupla contagem; não adotá-lo por padrão. E requer avaliação própria de método, privacidade e custo. D não impede trabalhar no formato e nos contratos. F não exige banco de grafos: IDs e relações tipadas sobre contratos existentes podem ser suficientes.

Primeiro marco: uma matriz sintética pequena com cinco casos e regras explícitas de linguagem, sem alterar o PDF emitido, o schema canônico ou os motores atuais. Só depois da revisão humana conectar uma projeção Q2 autorizada.

---

## Prompt pronto para uso

### 1. Papel, missão e modo de trabalho

Atue como coordenador técnico-editorial de uma revisão multidisciplinar de avaliação organizacional, estatística, inferência causal, aprendizagem, sustentabilidade, engenharia, segurança e design de informação. Use perspectivas especializadas e crítica cruzada; não alegue que especialistas reais participaram sem evidência. Outras IAs podem localizar falhas e divergências, mas consenso entre modelos não valida causalidade, método ou direito de uso.

Entregue a melhor arquitetura para aprimorar o relatório global ESG VitalOS, com matriz que relacione:

**ação/projeto → etapa METE → papel envolvido → driver/mecanismo → condição organizacional → desfecho → tema ESG proposto → evidência → afirmação permitida → próxima decisão**.

Use ToT para comparar alternativas e justificar a escolha por critérios explícitos. Apresente síntese de decisão e evidências verificáveis; não exponha cadeia de pensamento privada. A ambição de “120%” orienta melhoria percebida, não autoriza afirmar ganho percentual de design sem baseline e avaliação de uso.

O sistema deve produzir valor mesmo sem estimativa quantitativa: explicar o que foi feito, o que há de evidência, as lacunas, resultados adversos e o que precisa ser avaliado. Não usar um PDF visualmente sofisticado para elevar a certeza do conteúdo.

### 2. Reconhecimento dirigido e contratos a preservar

Confirme caminho, branch, HEAD e status; preserve alterações posteriores. Leia AGENTS.md, checkpoint e documentos canônicos seletivamente. Nunca abra .q.out, .q.sql, secrets, .env ou dados reais sem escopo próprio. Sem push, deploy, alteração de contas/Access ou migration remota. Não iniciar piloto nem enviar conteúdo a modelos externos por causa deste prompt.

Partir das peças existentes e distinguir código de aprovação:
- `src/lib/reports/institutional-editorial.ts`, preview institucional e renderizador PDF: protótipo sintético, não emissão real.
- `src/domain/evidence/esg-trace.schema.json`: exige projeto, mecanismo, estudos, indicadores, execução, limites e próximo ciclo; linguagem canônica atual é `mudanca_observada`.
- `evidence-registry`, `claim-registry`, `mechanism-registry`, Evidence Passport e padrões de intervenção: verificar fonte, revisão e licença por item antes de usar.
- `src/mocks/wwp-drivers-mock.ts`: vínculos semânticos demonstrativos de drivers; não equivalências causais ou fator de conversão ESG.
- `src/domain/packs/enterprise/enterprise.pack.json`: papéis e escopos de produto; catálogo não substitui autorização de servidor.
- PI-13, aprendizagem/aplicação, ledger, protocolo C8 e governança D1–D10/M1–M6: preservar seus limites e decisões vigentes.
- `src/engine/impact/impact-engine.ts` e `src/engine/esg/esg-engine.ts`: existem fórmulas/faixas históricas. Seu nome, testes ou execução não comprovam validade científica. Avaliar como heurísticas legadas; não reutilizar como coeficientes de impacto sem estudo e aprovação.

Não reabrir a confirmação da fonte brasileira por simples dúvida histórica; verificar correspondência documental e as pendências específicas de Q1. Manter Q2 independente. Não aprovar índice IVO composto, lente→dimensão, padronização de escalas, eficácia ou equivalências ESG. Não substituir o schema de rastreabilidade por uma versão mais permissiva.

Se uma estimativa causal futura exigir nova linguagem ou contrato, produzir proposta separada com revisão estatística, metodológica e de privacidade. Até sua aprovação, ela não entra na emissão canônica como fato causal. O prompt propõe método; não o aprova.

### 3. Definições que a arquitetura deve manter separadas

| Conceito | Pergunta | O que não significa |
| --- | --- | --- |
| Vínculo temático | A ação se relaciona plausivelmente a este tema? | Equivalência a disclosure ou efeito demonstrado |
| Atividade/entrega | O que foi ofertado ou executado? | Aprendizagem, transferência ou benefício |
| Aprendizagem | Que compreensão/retenção foi avaliada? | Aplicação sustentada no trabalho |
| Resultado observado | O que mudou no período e em qual unidade? | Efeito atribuível ao programa |
| Contribuição sustentada | Que evidências apoiam um mecanismo e quais alternativas foram examinadas? | Porcentagem causal conhecida |
| Efeito estimado | Quanto difere do contrafactual sob um desenho e pressupostos declarados? | Certeza sem incerteza ou validade universal |
| Impacto ESG | Qual efeito relevante sobre pessoas, ambiente ou governança foi definido e avaliado? | Rating genérico de felicidade, conformidade ou certificação |

Definir no protocolo o significado operacional de impacto, horizonte, público e alcance da conclusão. GRI, avaliação causal e gestão interna têm finalidades relacionadas, mas diferentes. Não chamar todo indicador de “impacto” nem restringir todos os temas ESG a um único escore.

### 4. Matriz lógica e unidade de análise

Definir a linha mínima como **projeto/ação × desfecho × período × recorte autorizado**. Etapas METE e papéis são dimensões de vínculo; múltiplos papéis na mesma ação não multiplicam a entrega ou o efeito. Distinguir o evento único da relação de muitos-para-muitos. Se uma intervenção afetar S e G, registrar um mesmo evento com dois vínculos, sem contar duas execuções.

Organizar três vistas derivadas da mesma base:
1. **Operacional:** linhas de ações, colunas METE; responsável/executor/revisor/público, fonte e estado em cada etapa.
2. **Contribuição:** driver e mecanismo → condição organizacional → desfecho → E/S/G; tipo e estado do vínculo, fontes e hipóteses alternativas.
3. **Avaliação:** indicador, estimando, unidade, baseline, seguimento, comparador, método, resultado, incerteza, limitações e linguagem liberada.

Campos propostos para revisão, não migration automática:
- IDs/versionamento de projeto, ação, evento, mecanismo, conteúdo, claim/estudo e relação.
- Etapa METE; papel responsável, executor, revisor e público-alvo; distinguir papel planejado, declarado e registrado em evento.
- Driver original e versão do catálogo; domínio/contexto da aplicação; hipótese do mecanismo.
- Tema ESG e referência específica, versão, justificativa e status do mapeamento: proposto, em revisão, aprovado para uso definido, rejeitado ou sem vínculo sustentado.
- Estado operacional e da evidência; desfecho/definição, unidade/escala, período, sentido da melhora, janela, exposição e população elegível.
- Estudo/claim relevante e limites de transferência; evidência de execução e de aprendizagem; efeitos indesejados e barreiras.
- Desenho, parâmetro-alvo, método, pressupostos, comparabilidade, resultado descritivo/estimado e incerteza quando calculável.
- Decisão/revisor/data/escopo de aprovação, afirmação permitida, data de corte e versão editorial.

Tenancy, autorizações e supressão são tratados antes da projeção. IDs restritos, contagens, texto livre ou recortes protegidos não seguem para PDF apenas por existirem no contrato interno. Campo inexistente fica não disponível, nunca inventado; `não aplicável`, `sem evidência`, `protegido` e `método pendente` são estados diferentes.

### 5. Perfis empresariais: responsabilidade sem pontuação de pessoas

Usar papéis existentes: colaborador, líder, embaixador, RH/DHO, CHRO, C-level, SST/CIPA e demais escopos autorizados. Não habilitar novas contas nem promover papel. Exemplos de responsabilidade funcional devem ser propostos, não confundidos com capabilities implementadas.

- **Colaborador:** participação voluntária e atividades autorizadas; respostas privadas não viram avaliação do empregador.
- **Líder:** condições de execução e práticas de equipe, sem acesso presumido às respostas individuais.
- **RH/CHRO:** coordenação organizacional e revisão conforme contrato, sem autoridade metodológica global automática.
- **C-level:** patrocínio e decisão de recursos; papel read-only no produto não ganha escrita por constar da matriz.
- **SST/CIPA:** atribuições técnicas existentes, sem criar diagnóstico clínico ou conformidade normativa automática.
- **Plataforma/autoridade metodológica:** controles distintos de gestão da empresa; não atribuir impacto superior ao papel privilegiado.

Não dividir o efeito total proporcionalmente às tarefas de cada perfil. Interações, apoio e contexto podem ser determinantes; dados de atuação não identificam mérito causal individual. Sem ranking de pessoas, equipes pequenas ou produtividade individual sensível.

### 6. Drivers, mecanismos e relações ESG

O driver é uma categoria de necessidade/intervenção; não um coeficiente. Montar teoria de mudança com mecanismo, contexto, recurso, barreira, resultado esperado, risco e hipóteses alternativas. Diferenciar estudo observacional sobre bem-estar de evidência de uma intervenção específica.

Exemplos ilustrativos abaixo são hipóteses para curadoria, não mapeamentos aprovados:

| Driver/ação ilustrativa | Percurso METE | Vínculo ESG candidato | Evidência e limitação |
| --- | --- | --- | --- |
| Segurança psicológica / acordo de voz | Sinal agregado → prática de conversa → condições de escuta → revisão | S; G se houver processo de resposta e prestação de contas verificável | Participação em conversa não demonstra segurança nem funcionamento de canal; observar barreiras, retaliação e fontes específicas |
| Autonomia / revisão de processo | Necessidade → capacitação → mudança de decisão/fluxo → acompanhamento | S; G condicional à mudança do processo | Questionário de percepção não é auditoria de governança; verificar recursos e poder real de decisão |
| Inclusão / revisão de acesso | Diagnóstico permitido → formação → mudança de política → revisão de acesso | S; G quando política e implementação forem evidenciadas | Curso não comprova equidade; controlar exposição de grupos pequenos e resultados adversos |
| Crescimento / prática de aprendizagem | Necessidade → prática/feedback → aplicação apoiada → revisão posterior | S | Conclusão do conteúdo não comprova retenção ou transferência; não usar nota em decisão de RH |
| Futuro/bem comum / projeto com objetivo ambiental explícito | Baseline físico → formação pertinente → intervenção concreta → nova medida | E somente com desfecho físico e fonte adequada; S/G podem coexistir como vínculos próprios | “Energia/vitalidade” humana não equivale a eletricidade ou emissões. Sustentabilidade no nome não prova impacto ambiental |

Sem evidência ambiental adequada, E permanece **sem vínculo quantitativo sustentado**. Não distribuir pesos iguais entre E/S/G para preencher a matriz. Maior quantidade de ações sociais não comprova melhor desempenho ESG global. Governance é também processo/responsabilidade, mas isso não torna todo clique ou aprovação um efeito de governança.

Usar códigos GRI/ODS/ESRS específicos somente após verificar versão, escopo e correspondência ao requisito. Tema relacionado não significa disclosure satisfeito; mapear a evidência faltante. Princípios de materialidade, exigências de reporte e alegações de conformidade exigem revisão própria.

### 7. “Nível aproximado”: três campos, não uma pseudoexatidão

Entregar uma ficha por relação com:
1. **Natureza do vínculo:** temático proposto, mecanismo sustentado em literatura, execução demonstrada, mudança observada ou efeito estimado sob desenho revisado. Esses rótulos descrevem afirmações diferentes; não são escala numérica universal.
2. **Sustentação da evidência:** rubrica multidimensional proposta, com fonte, desenho, adequação da medida, implementação, comparabilidade, precisão, risco de viés, aplicabilidade ao contexto e contradições. Não chamar de “GRADE” se não houver aplicação formal do sistema. Dois revisores quando autorizado; preservar dissensos. Não converter em probabilidade de verdade por número arbitrário.
3. **Magnitude:** efeito na unidade original e horizonte, com intervalo de incerteza quando estimável. Classificar pequeno/moderado/grande apenas com âncoras válidas e previamente definidas para aquele indicador/uso; sem âncora, mostrar o número e declarar a ausência da classificação. Sem dados adequados: **magnitude não estimável**, não zero.

Relatar separadamente direção, alcance, duração, distribuição entre grupos autorizados, persistência, efeitos indesejados e relevância para os afetados. Um efeito preciso pode ser irrelevante; um efeito impreciso não é automaticamente inexistente.

Se for desejada uma pontuação de priorização gerencial, desenhá-la em proposta própria de análise multicritério, com pesos explicitamente normativos, análise de sensibilidade e uso delimitado. Nunca denominá-la medida científica de impacto ou usá-la para autorizar linguagem causal. Não implementar `impacto = execução × relevância ESG × confiança × peso do perfil`.

### 8. Estatística: seleção condicional do método

Antes de qualquer cálculo, definir: pergunta, intervenção, desfecho, unidade de observação, unidade de atribuição, população, horizonte, exposição, comparador e parâmetro-alvo (estimando). Desenhar DAG/teoria de mudança e protocolo prévio. Registrar mudanças posteriores como exploratórias. Não escolher modelo pela significância obtida.

| Dados/desenho | O que se pode propor | Condições e limites |
| --- | --- | --- |
| Só atividades e documentos | Descrever execução, condições e contribuição plausível | Sem cálculo de efeito causal; análise qualitativa explícita de alternativas |
| Antes/depois comparáveis, sem controle | Mudança descritiva, composição e incerteza amostral quando estimável | Sazonalidade, regressão à média, seleção e outras mudanças podem explicar o delta |
| Comparador defensável e períodos adequados | DiD ou outro desenho quase experimental apropriado | Justificar tendências paralelas/antecipação, seleção, calendário, covariáveis e contaminação; ausência de pré-tendência significativa não prova a hipótese |
| Implementação escalonada | Estimativas por grupo/tempo, se adequadas | Não aplicar TWFE ingênuo por padrão quando efeitos/adoção variam; revisar alvo e pressupostos |
| Alocação aleatória viável e autorizada | Avaliação experimental no nível apropriado | Ética, consentimento, cluster, perdas, interferência e plano de análise; não negar medidas essenciais |
| Séries temporais adequadas | Série interrompida/controlada conforme contexto | Não usar dois pontos como série; modelar tendência, sazonalidade, autocorrelação e eventos simultâneos |

Modelos hierárquicos/Bayesianos podem tratar estrutura de grupos e incerteza, quando justificados; priors precisam de origem e sensibilidade. Não geram identificação causal nem resolvem amostra inadequada. Monte Carlo pode propagar incertezas declaradas, mas não fabricar evidência ou transformar premissas em efeitos observados. Escolher método por necessidade, não por sofisticação aparente.

Requisitos transversais:
- Versões, unidade/escala, regras de cálculo e composição dos grupos compatíveis; distinguir painel de pessoas de cortes repetidos. Não reconstruir identidades para pareamento quando o contrato anônimo o proíbe.
- Tratar cluster/equipe, correlação temporal, tamanho efetivo de amostra e exposição; não considerar respostas da mesma equipe independentes por conveniência.
- `k>=5` é condição de divulgação no contrato vigente, **não** evidência de potência, representatividade ou precisão estatística.
- Planejar tamanho amostral/efeito mínimo detectável com variabilidade, correlação intraclasse, alocação e perdas defensáveis; não inventar n universal.
- Sem variância/covariância ou desenho adequado, não emitir intervalo de confiança a partir de médias agregadas isoladas. Bootstrap deve respeitar o desenho; reamostrar linhas de agregados não cria observações individuais.
- Tratar perdas, não resposta, mudanças de composição, falta de comparador, spillovers e intervenções concorrentes. Imputação não recupera causalidade nem permite publicação de dado protegido.
- Predefinir desfechos principais, multiplicidade e subgrupos; evitar seleção de resultados favoráveis e paradoxo de Simpson. Preservar resultados negativos, nulos e inconclusivos.
- Estimativa, intervalo, relevância prática e robustez aparecem juntos. P-valor não comprova causalidade, ausência de efeito ou probabilidade de a hipótese ser verdadeira.
- Literatura oferece suporte e hipóteses; transportar tamanho de efeito exige compatibilidade de população, intervenção, implementação, medida e contexto, com revisão explícita.

### 9. Fórmulas mínimas — exemplos, não novo motor aprovado

**Mudança descritiva:** `Δj = média(Yj, depois) − média(Yj, antes)`. Manter a unidade original. Se menor é melhor, registrar a direção desejada; não trocar silenciosamente o sinal ou criar normalização ESG.

**Diferenças em diferenças, desenho simples:** `τ̂j = (média T_depois − média T_antes) − (média C_depois − média C_antes)`. A expressão organiza o contraste, mas sua interpretação causal depende do desenho e dos pressupostos. Não basta possuir quatro médias.

**Incerteza:** definir método de erro-padrão/intervalo consistente com desenho, clusters e parâmetro; nível do intervalo deve estar no protocolo. Não preencher margens de erro por convenção visual. Análises de sensibilidade não removem automaticamente viés.

**Percentuais:** distinguir mudança absoluta em pontos percentuais de variação relativa. Denominador zero/incomparável produz não calculável. Não somar diferenças de instrumentos, percentuais de aprendizagem, reais e toneladas em uma nota de impacto.

**Acompanhamento de execução (opcional):** `100 × ações únicas verificadas no prazo / ações únicas elegíveis previstas no período`. Só usar após definir universo, cancelamentos e verificação. É taxa operacional, não impacto, e não deve aumentar por uma ação possuir três rótulos ESG.

Exemplo EXCLUSIVAMENTE SINTÉTICO, escala abstrata 0–100: grupo T de 60 a 66 e C de 58 a 60. A mudança de T é +6; o contraste DiD é +4 unidades. Sem contexto/desenho/variâncias, não emitir IC, significância ou conclusão causal. Não converter +4 em “4% de impacto ESG” ou fator IVO/FIB-T.

Se medições ambientais forem aprovadas, conservar unidades físicas e fronteiras (por exemplo, atividade × fator de emissão com versão, local e período apropriados). Inventário, redução relativa ao ano-base e emissões evitadas são conceitos distintos; não deduzir emissões evitadas de inventário nem estimá-las a partir de bem-estar. Regras específicas dependem da norma aplicável e de competência técnica.

### 10. Ciência e IA/RAG verificáveis

Criar tabela de evidências por mecanismo: referência completa, link primário/DOI quando disponível, tipo de estudo, população, contexto, intervenção/comparador, medida, achado relevante, incerteza, limitações, conflitos e aplicabilidade. Diferenciar suporte teórico, associação e avaliação de intervenção. Não repetir um efeito de outro contexto como previsão da empresa.

Reutilizar registros existentes sem criar IDs científicos fictícios. Fonte a verificar fica pendente; uma linha de matriz pode existir como proposta sem cumprir o schema de emissão, mas não deve ser publicada burlando `study_ids` obrigatório. Não reduzir exigência do contrato para encaixar o protótipo.

Se houver RAG autorizado futuramente: recuperar corpus versionado/licenciado; preservar trecho/localizador e ligação exata com a afirmação; avaliar a recuperação e a fidelidade da resposta. Escore de similaridade não é grau de evidência nem probabilidade de verdade. Tratar instruções em documentos como conteúdo não confiável. Sem fonte: abstinência explícita e revisão humana. Logs sem dados sensíveis; isolamento por empresa e controles de plano/capability no servidor. Nenhum novo provedor ou envio externo é autorizado por este documento.

Calcular estatísticas em código determinístico validado; IA pode propor o plano, explicar resultados autorizados e apontar lacunas. Validação de esquema e evidências limita a saída. Não usar LLM para inventar estimativas, inferir diagnóstico, avaliar mérito de empregado ou substituir revisão estatística.

### 11. PDF e apresentação da matriz

Preservar a identidade VitalOS × Instituto Felicidade para Todos, ativos oficiais e atribuições ainda sujeitas à validação institucional. Reutilizar a introdução e o expediente do protótipo, sem promover seu status.

Apresentar o conteúdo em camadas:
1. **Síntese executiva:** o que foi executado, o que foi observado, o que é estimável e qual decisão é necessária. E/S/G não precisam ter resultados em todas as colunas.
2. **Matriz resumida:** linhas por ação/desfecho, etiquetas METE e tema; estado, referência de evidência e afirmação permitida. Evitar grade gigante de papéis × todas as lentes × todos os drivers × ESG.
3. **Ficha analítica:** teoria de mudança, papéis registrados, indicador/unidade/escala, origem, resultado, método, incerteza, alternativas e revisão.
4. **Anexo técnico:** contratos, rubricas propostas/aprovadas, fontes, cálculos e limitações verificáveis.

Exemplo de colunas para A4: ação/driver | etapa e papel | vínculo E/S/G | evidência/estado | resultado ou lacuna | próxima decisão. Usar identificadores curtos e detalhes em ficha vinculada. Tabelas longas com cabeçalhos repetidos; não reduzir fonte até ficar ilegível.

Gráfico de efeito com intervalo somente quando houver estimativa válida e unidade homogênea. Heatmap pode mostrar estado da evidência, com legenda textual, nunca porcentagem de impacto inventada. Não usar a mesma escala cromática para força de evidência e tamanho de efeito. Não transformar uma ausência de evidência em célula vermelha de “mau desempenho”.

Ícones e títulos devem explicar relações, não dar aparência de validação científica. Notas essenciais acompanham cada figura; não depender de rodapé de outra página. Exibir corte, versões e origem de cada bloco. Testar sem cor, zoom, leitor de tela, tabelas extensas, nomes longos e versões mobile/A4. HTML acessível não garante PDF marcado; não alegar PDF/UA/PDF/A sem validação própria.

Avaliar a evolução visual com tarefas: localizar origem, distinguir participação de aprendizagem, contribuição de causalidade, efeito de incerteza e identificar próxima decisão. Medir compreensão, erros, ajuda e tempo antes/depois; metas e protocolo definidos previamente. Não transformar preferência estética em prova de aprendizagem ou prometer melhoria de 120%.

### 12. Plano de execução e gates

**Entrega A — especificação revisável:** inventário de contratos, cinco casos sintéticos, matrizes operacionais/de contribuição/de avaliação e catálogo de afirmações permitidas/proibidas. Nenhuma nova fórmula ativada ou mapping aprovado.

**Entrega B — contrato e protótipo:** modelo tipado com projeção fail-closed de estados retidos, versão de cada vínculo e corte. Integrar componentes ao preview e PDF sintético; preservar impressão e snapshots reais. Se houver alteração de schema ou linguagem canônica, produzir proposta/ADR antes de implementar mudança sem aprovação.

**Entrega C — fatia Q2 autorizada:** reutilizar projeções e ledger existentes para rastrear uma prática implementada, sem alegar efeito de conteúdo não curado. Cobrir tenant, fonte publicada, módulo desabilitado, supressão, versões, período e dados ausentes. Q1 não deve ser preenchido por analogia com Q2.

**Entrega D — protocolo avaliativo:** pré-especificar um desfecho/mecanismo e selecionar desenho com responsável estatístico/metodológico. Antes dos dados reais, validar cálculos com dados simulados conhecidos: sem efeito, efeito adverso, efeito heterogêneo, perdas, clusters, sazonalidade, adoção escalonada e viés deliberado. Não esperar que método recupere efeito em desenho que viola seus pressupostos.

**Entrega E — revisão e futura validação:** revisar com leitores e responsáveis autorizados; nenhum recrutamento ou coleta real automática. Comitê/IA revisora recebe o mesmo pacote de evidências, limitações e contraexemplos, não apenas o texto final.

Testes mínimos por incremento: contagem única entre E/S/G; papéis não criam efeito duplicado; universo/denominador explícito; ausência ≠ zero; versões/períodos incompatíveis recusados; escala original preservada; sem CI com estatísticas insuficientes; dado protegido não vaza por delta, tooltip, hash ou exportação; notas privadas não chegam ao gestor; relação proposta não vira aprovada; fonte retirada/versionada afeta uso futuro; emissão histórica preserva sua versão; geração determinística/reprodutível e HTML/PDF consistentes. Testes de software não aprovam validade causal.

Rodar testes direcionados e TypeScript; gate/build quando a mudança os justificar. Reutilizar evidências ainda válidas. Renderizar e inspecionar PDF sintético; browser pode permanecer adiado explicitamente, sem alegar teste realizado. Sem operações remotas ou dados reais fora do escopo aprovado.

### 13. Protocolo de revisão crítica e critérios de aceite

Entregar para cada perspectiva o problema, fonte, objeção, resposta e risco remanescente:
- Estatística/inferência: o estimando é identificável? O método respeita desenho, perdas, clusters e interferência?
- Ciência organizacional/aprendizagem: medida capta desfecho relevante? Intervenção pode ser aplicada neste contexto? Há individualização de causa organizacional?
- Sustentabilidade: vínculo temático foi confundido com requisito atendido, materialidade ou impacto? Há resultados adversos e cobertura ambiental inventada?
- Privacidade/segurança: dados e cruzamentos são autorizados? PDF permite reidentificação por diferença entre recortes/períodos?
- Engenharia: fonte única, versionamento, isolamento, projeção, reprodutibilidade e preservação de emissões?
- Design/acessibilidade: o leitor entende o alcance da conclusão sem depender de cor ou jargão?

Não calcular média de votos de IAs para aprovar uma fórmula. Divergência material gera pendência com responsável; ausência de evidência produz abstinência. Uma revisão favorável não concede certificação ou garante aceitação por outro comitê.

Aceite da primeira versão: matriz útil e rastreável mesmo sem estimativa; exemplos claramente sintéticos; todos os vínculos novos como propostas; método não escolhido automaticamente por disponibilidade de biblioteca; emissão canônica respeitada; nenhuma interpretação acima da evidência; design legível em casos adversos/incompletos. Emissão causal/impacto quantitativo continua bloqueada até os gates humanos e de dados necessários.

Decisões humanas agrupadas: definição de desfecho/impacto e público; curadoria driver→mecanismo→tema; critérios D9 e comparabilidade; desenho e recursos de avaliação; dados/retention/privacidade; revisão de frameworks e redação institucional. Continue em partes independentes com fixtures. Ao concluir, informar arquivos/artefatos, fórmulas apenas propostas ou implementadas, testes, limites, decisões pendentes e um próximo marco único.

## Fundamentação primária e alcance

Consultada em 2026-11-15. As referências orientam método; nenhuma valida automaticamente o framework VitalOS, seus drivers ou uma implementação futura. Conferir versão antes de qualquer alegação normativa.

1. [GRI 1: Foundation 2021](https://www.globalreporting.org/publications/documents/english/gri-1-foundation-2021/) — relato equilibrado, distinção de estimativas e verificabilidade; citar o padrão não satisfaz seus requisitos.
2. [HM Treasury — Magenta Book, Annex A](https://www.gov.uk/government/publications/the-magenta-book/magenta-book-annex-a-analytical-methods-for-use-within-an-evaluation-html) — escolha de abordagem de avaliação e análise de contribuição; contribuição plausível não é prova causal definitiva.
3. [Hernán e Robins — Causal Inference: What If](https://miguelhernan.org/whatifbook) — fundamento de perguntas causais e pressupostos de identificação. Livro disponibilizado pelos autores, não certificação do caso avaliado.
4. [Callaway e Sant’Anna — did, documentação dos autores](https://bcallaway11.github.io/did/articles/did-basics.html) — desenho DiD em grupos/tempos distintos, com hipótese de tendências paralelas; não prescreve seu uso para qualquer base.
5. [OECD/UE/JRC — Handbook on Constructing Composite Indicators](https://www.oecd.org/en/publications/handbook-on-constructing-composite-indicators-methodology-and-user-guide_9789264043466-en.html) — pesos, agregação, incerteza e sensibilidade exigem escolhas e verificação; um composto não é medida causal por construção.
6. [OECD — Applying Evaluation Criteria Thoughtfully, critérios](https://www.oecd.org/en/publications/applying-evaluation-criteria-thoughtfully_543e84ed-en/full-report/understanding-the-six-criteria-definitions-elements-for-analysis-and-key-challenges_2843ff7d.html) — definição e escopo de efeitos superiores, positivos/negativos e intencionais/não intencionais.
7. [GHG Protocol — reduções fora do escopo 3](https://ghgptechassistance.zendesk.com/hc/en-us/articles/37994007816340-What-about-accounting-for-reductions-outside-of-scope-3) — estimativas de emissões evitadas requerem abordagem própria e relato separado do inventário.
8. [ONS — princípios de visualização](https://service-manual.ons.gov.uk/data-visualisation/guidance/principles) — precisão, acessibilidade, simplicidade e consistência na comunicação visual; não prova de eficácia pedagógica deste PDF.

## Evidência local que motivou as fronteiras

- `src/domain/evidence/esg-trace.schema.json:29`: linguagem atual limitada a mudança observada.
- `src/mocks/wwp-drivers-mock.ts:16`: mapa demonstrativo de drivers, distinto de mapping aprovado.
- `src/engine/impact/impact-engine.ts:129`: maturidade heurística combina semanas/IVO/evidência/certificação; não usar como efeito causal.
- `src/engine/esg/esg-engine.ts:12`: faixas de prontidão legadas; não converter em impacto verificado.
- `src/domain/packs/enterprise/enterprise.pack.json:41`: papéis/escopos; não autoriza ampliar acesso ao cruzar dimensões.
- `src/domain/ivo/methodology-governance.json:148`: D9 em proposta na base lida; estados e limitações precisam ser rechecados na execução futura.

Entrega original: documento orientador. Na execução posterior foi criada uma matriz sintética e nova edição do PDF, preservando o anterior; ver registro vinculado no início. Sem alteração de mappings aprovados, schema canônico ou pontuação; nenhuma análise estatística de cliente foi executada.
