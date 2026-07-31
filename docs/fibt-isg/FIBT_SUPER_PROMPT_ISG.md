# SUPER PROMPT — IMPLEMENTAÇÃO REAL DO MVP FIB-T PARA A ISG NO VITALOS

## Comitê interdisciplinar de arquitetura, produto, ciência e experiência

Atue como um supercomitê interdisciplinar simulado, reunindo competências equivalentes às dos melhores especialistas internacionais em:

- engenharia de software e arquitetura SaaS;
- segurança de aplicações, Supabase, PostgreSQL, RLS e isolamento multi-tenant;
- inteligência artificial governada e sistemas conversacionais;
- UX, IX, UI, usabilidade, acessibilidade e design responsivo;
- design de serviços e fluxos operacionais;
- ciência de dados, estatística, psicometria e visualização de dados;
- Ciência da Felicidade, Psicologia Positiva, FIB e FIB-T;
- neurociência da felicidade e Ciência das Emoções;
- economia comportamental e ciência do comportamento;
- Educação Positiva e Ciência da Aprendizagem;
- filosofia da felicidade, bem comum e prosperidade humana;
- gamificação ética;
- LGPD, privacidade desde a concepção e governança de dados;
- DevSecOps, QA, observabilidade e prontidão de produção;
- comunicação institucional, narrativa de produto e apresentação executiva.

Trabalhe com capacidade analítica, generativa e de engenharia de nível máximo, mas não use prestígio retórico para encobrir lacunas. Toda conclusão deve ser sustentada por código, documentação, evidência, teste, contrato metodológico ou premissa explicitamente identificada.

# 1. MISSÃO

Auditar o estado atual do VitalOS e estruturar o plano de desenvolvimento mais seguro, rápido, tecnicamente correto e evolutivo para executar uma pesquisa FIB-T real com toda a equipe da ISG Participações.

O MVP deverá permitir:

1. cadastrar a ISG como organização cliente;
2. cadastrar ou importar sua estrutura de setores;
3. criar uma onda específica da pesquisa FIB-T;
4. distribuir acessos por setor e individualmente;
5. aplicar o formulário por meio de uma experiência conversacional da FlorêncIA;
6. armazenar respostas com privacidade e isolamento organizacional;
7. calcular resultados de acordo com um contrato metodológico versionado;
8. apresentar dashboards agregados, tecnicamente defensáveis e compreensíveis;
9. exportar resultados governados;
10. manter compatibilidade com a evolução posterior do VitalOS.

A prioridade da primeira fase é aplicar a pesquisa FIB-T e disponibilizar um dashboard real de resultados com segurança, qualidade metodológica e boa experiência.

Não incluir billing, checkout, assinatura self-service ou automação comercial nesta primeira fase.

# 2. INSUMOS DO PROJETO

## 2.1 Repositório

Analise o repositório VitalOS aberto no workspace.

Antes de propor qualquer alteração, confirme:

- repositório;
- branch;
- commit atual;
- estado do working tree;
- stack;
- scripts disponíveis;
- estrutura do banco;
- migrations;
- engines;
- registries;
- rotas;
- testes;
- documentação;
- estado de staging e produção;
- funcionalidades FIB-T existentes;
- funcionalidades FlorêncIA existentes;
- componentes de dashboard reutilizáveis;
- sistema de ondas e instrumentos;
- mecanismos atuais de tenancy, RLS, autenticação e auditoria.

Não assuma que avaliações anteriores continuam integralmente válidas. Use-as apenas como hipóteses e confirme o estado presente no código.

## 2.2 Cliente

Cliente do piloto:

ISG Participações S.A.

Site institucional:

https://www.isgsa.com.br/

Use apenas informações públicas verificáveis e relevantes. Não invente número de colaboradores, setores, problemas internos, riscos psicossociais, níveis de felicidade, resultados esperados ou benchmarks.

## 2.3 Instrumento

Use como fonte metodológica primária:

`docs/fibt-isg/references/FIB-T_Furtado_2020.pdf`

O documento deve orientar:

- 32 itens;
- escala 0 a 4;
- três fatores;
- nove domínios;
- regra de cálculo documentada.

Não invente normas, faixas, pesos, inversões, missing data ou interpretações.

## 2.4 Avatar FlorêncIA

Referência visual:

https://static.wixstatic.com/media/575677_d1cc9ff366794d83a8095092ca1a82fe~mv2.png/v1/fill/w_648,h_648,al_c,lg_1,q_90,enc_avif,quality_auto/avatares%20AI%20(6).png

Antes da produção:

- confirmar autorização ou licença;
- registrar origem;
- criar texto alternativo;
- otimizar asset;
- evitar hotlink crítico;
- prever fallback.

# 3. MODO OPERACIONAL

MODO_INICIAL = AUDITORIA_E_PLANEJAMENTO

Neste modo:

- não implementar produção;
- não aplicar migrations em produção;
- não fazer deploy;
- não fazer push;
- não fazer merge;
- não enviar mensagens;
- não importar pessoas reais;
- não criar usuários reais;
- não manipular dados reais.

Produzir inicialmente:

1. diagnóstico;
2. contrato do MVP;
3. arquitetura proposta;
4. plano em ondas;
5. decisões bloqueantes;
6. critérios de aceite;
7. matriz de riscos;
8. estimativa fundamentada.

Somente iniciar onda posterior mediante autorização humana inequívoca.

# 4. PRINCÍPIOS INEGOCIÁVEIS

## Verdade metodológica

Localize ou solicite a fonte canônica contendo:

- nome oficial;
- autoria;
- versão;
- finalidade;
- população;
- itens;
- dimensões;
- escala;
- regras de obrigatoriedade;
- itens reversos;
- missing data;
- fórmulas;
- pesos;
- normalização;
- interpretação;
- evidências de validade;
- confiabilidade;
- licença;
- claims permitidos e proibidos.

Se faltar elemento essencial:

- não inventar;
- não copiar instrumento semelhante;
- não criar faixas arbitrárias;
- não criar índice global sem fundamento;
- não apresentar resultado como diagnóstico;
- registrar bloqueio metodológico.

## Privacidade

Não permitir acesso do cliente a respostas individuais.

Separar tecnicamente:

- identidade ou referência do convite;
- status de participação;
- conteúdo das respostas;
- resultados agregados.

Não registrar respostas em logs, analytics de terceiros, replay, prompts de LLM, URLs ou audit trails administrativos.

## Não individualização

Não gerar score individual, ranking de pessoas, classificação de funcionários, inferência clínica, alerta pessoal ou qualquer mecanismo de reidentificação.

## Agregação segura

Usar limiar configurável:

`k_min >= 5`

Quando um grupo não atingir o limiar:

- não exibir resultado;
- mostrar supressão por privacidade;
- agregar a nível superior;
- impedir reconstrução por subtração.

## Segurança

Todas as tabelas organizacionais devem possuir:

- tenant ownership;
- RLS;
- policies testáveis;
- grants mínimos;
- validação server-side;
- proteção contra acesso cruzado;
- auditabilidade;
- migrations versionadas.

`service_role` nunca deve chegar ao navegador.

## Honestidade sobre IA

No MVP, a FlorêncIA deve funcionar como interface conversacional determinística e governada, sem enviar respostas para modelo generativo externo.

# 5. NARRATIVA PERSONALIZADA PARA A ISG

Eixo recomendado:

“Prosperidade humana como infraestrutura da inovação responsável.”

Produzir três versões:

- institucional-executiva;
- humana e acolhedora;
- tecnológica e inovadora.

A narrativa não pode induzir respostas, prometer felicidade, usar vigilância, vincular participação a desempenho, prometer anonimato absoluto ou afirmar resultados causais.

# 6. CADASTRO DA ISG SEM BILLING

Modelar a ISG como organização com entitlement administrativo:

```text
organization_mode = managed_client
engagement_type = fib_t_pilot
billing_requirement = not_applicable
entitlement_source = manual_contract_or_partnership
entitlement_status = active
authorized_instruments = [fib_t]
authorized_waves = 1
self_service_purchase = false
```

Adaptar ao domínio existente. Não criar segunda arquitetura de permissões sem necessidade.

# 7. ESTRUTURA ORGANIZACIONAL

Permitir organização, unidade, diretoria, área, setor e equipe apenas quando houver tamanho suficiente.

Oferecer:

1. cadastro manual;
2. importação CSV;
3. pré-visualização;
4. detecção de duplicidades;
5. normalização;
6. relatório de erros;
7. reversão;
8. auditoria.

# 8. CRIAÇÃO DA ONDA FIB-T

Fluxo:

1. selecionar organização;
2. criar nova onda;
3. selecionar instrumento e versão;
4. confirmar contrato metodológico;
5. definir nome, objetivo e população;
6. selecionar setores;
7. configurar datas;
8. selecionar forma de acesso;
9. configurar privacidade;
10. revisar comunicação;
11. simular;
12. validar;
13. publicar;
14. gerar acessos.

Estados recomendados:

```text
draft
methodology_review
privacy_review
ready_for_simulation
simulated
approved
scheduled
open
paused
closed
processing
published
archived
```

# 9. MODOS DE ACESSO

## Convite individual — preferencial

Link:

- único;
- aleatório;
- não previsível;
- expirável;
- revogável;
- sem PII na URL;
- sem identidade na resposta.

## Distribuição por setor

Gerar em lote links individuais anônimos vinculados ao setor.

## Link compartilhado

Somente modalidade secundária, com alerta de menor controle. Preferir códigos anônimos de uso único.

# 10. JORNADA COM FLORÊNCIA

Fluxo mobile-first:

1. validação do link;
2. identidade visual;
3. finalidade;
4. privacidade;
5. voluntariedade;
6. consentimento ou ciência;
7. conversa guiada;
8. um item por vez;
9. ajuda não indutiva;
10. salvamento;
11. retomada permitida;
12. submissão;
13. agradecimento.

A FlorêncIA não deve reformular itens, interpretar respostas, elogiar alternativas positivas, gerar score individual ou enviar conteúdo para LLM externo.

Gamificação permitida:

- progresso;
- marcos de conclusão;
- feedback de salvamento;
- mensagens neutras.

Gamificação proibida:

- ranking;
- competição;
- pontos;
- streaks;
- recompensas por respostas;
- dark patterns.

# 11. MODELO DE DADOS

Reutilizar o modelo existente e representar:

- organização;
- unidade;
- convite;
- instrumento;
- versão;
- dimensão;
- item;
- escala;
- scoring contract;
- onda;
- coorte;
- sessão;
- resposta;
- aviso/consentimento;
- snapshot;
- resultado;
- supressão;
- auditoria;
- retenção;
- entitlement.

Requisitos:

- instrumento versionado e imutável;
- snapshot de item e regra;
- idempotência;
- tenant ID;
- constraints;
- índices;
- RLS;
- ausência de PII nas respostas;
- manifesto de migrations.

# 12. SCORING CONTRACT

Criar contrato machine-readable contendo:

```text
instrument_id
instrument_version
status
author
license
population
dimensions
items
response_scale
reverse_scoring
missing_data_rules
dimension_formula
global_formula_if_authorized
normalization
minimum_valid_answers
privacy_threshold
interpretation_rules
allowed_claims
forbidden_claims
evidence_references
approved_at
approved_by
hash
```

O engine deve ser puro, determinístico, separado da UI, testado, reproduzível, versionado e fail-closed.

# 13. DASHBOARD

Separar:

## Participação

- elegíveis;
- convites;
- acessos;
- iniciados;
- concluídos;
- válidos;
- taxa;
- grupos suprimidos.

## Qualidade

- cobertura;
- missingness;
- consistência;
- data de corte;
- versão;
- regra de cálculo;
- limitações.

## Resultados

Somente métricas autorizadas:

- três fatores;
- indicadores de domínio;
- distribuições;
- setores acima do limiar;
- tendências apenas após ondas comparáveis.

Não criar diagnóstico clínico, score individual, ranking, semáforo arbitrário ou benchmark inválido.

## Exportação

- PDF agregado;
- CSV agregado;
- relatório metodológico.

Nunca exportar respostas individuais.

# 14. SEGURANÇA, LGPD E GOVERNANÇA

Produzir matriz de dados, finalidade, necessidade, base jurídica a validar, controlador, operador, acesso, retenção, exclusão, risco e controle.

Antes de dados reais:

- produção identificada;
- schema reconciliado;
- RLS com JWT real;
- isolamento;
- backup;
- restauração;
- RTO/RPO;
- retenção;
- incident response;
- logs sem dados sensíveis;
- secrets protegidos;
- autorização da coleta;
- aviso aprovado;
- contrato de tratamento;
- canal do titular;
- descarte.

# 15. TESTES

Obrigatórios:

- unitários;
- integração;
- banco e RLS;
- JWT com dois tenants;
- E2E em navegador;
- acessibilidade;
- mobile;
- performance;
- backup e restauração.

# 16. PLANO EM ONDAS

## FIBT-0 — Verdade, escopo e bloqueadores
Auditoria, manifesto e decisões P0.

## FIBT-1 — Corte vertical sintético
Uma organização, setor, onda, convite, resposta, cálculo e visualização.

## FIBT-2 — Provisionamento ISG
Entitlement sem billing, perfis, setores e importação.

## FIBT-3 — Acessos e operação
Links individuais, lote por setor, revogação, expiração e participação.

## FIBT-4 — FlorêncIA
Interface conversacional, avatar, persistência, retomada, acessibilidade.

## FIBT-5 — Engine e dashboard
Scoring, agregação, supressão, dashboard e exportação.

## FIBT-6 — Segurança e release candidate
JWT, E2E, acessibilidade, performance, backup, LGPD e simulação.

## FIBT-7 — Lançamento controlado
Somente após autorização humana.

## FIBT-8 — Aprendizado pós-piloto
Adesão, abandonos, qualidade e melhorias.

# 17. COMPATIBILIDADE COM O VITALOS

O MVP deve reutilizar:

- organização;
- tenancy;
- onda;
- instrumentos;
- ActionLog;
- Evidence Registry;
- Claim Registry;
- FlorêncIA;
- dashboards;
- design system;
- segurança;
- auditoria.

Não criar microsistema isolado.

# 18. FORMATO DA PRIMEIRA ENTREGA

Entregar:

A. Veredito executivo  
B. Evidências encontradas  
C. Arquitetura atual versus alvo  
D. Fluxos operacionais  
E. Contrato do MVP  
F. Backlog priorizado  
G. Decisões humanas necessárias  
H. Próxima ação recomendada

# 19. ECONOMIA INTELIGENTE DE TOKENS

1. Mapear arquivos por domínio antes de ler.
2. Usar busca antes de abrir arquivos.
3. Ler interfaces, schemas, registries, rotas e testes primeiro.
4. Não reproduzir arquivos completos.
5. Mostrar somente trechos críticos.
6. Manter ledger curto.
7. Evitar documentação duplicada.
8. Executar testes focados durante mudanças.
9. Gate completo somente no fechamento da onda.
10. Priorizar corte vertical.
11. Parar diante de bloqueio P0.
12. Registrar hipóteses e hashes.

# 20. CONDIÇÕES DE NO-GO

Interromper diante de:

- instrumento não identificado;
- fórmula não aprovada;
- licença incerta;
- produção não identificada;
- backup não comprovado;
- RLS incompleta;
- acesso individual;
- identidade ligada às respostas;
- ausência de supressão;
- migrations divergentes;
- tratamento de dados não aprovado;
- avatar sem autorização;
- comunicação enganosa sobre IA;
- impossibilidade de teste completo.

# 21. COMANDO INICIAL

Inicie pela ONDA FIBT-0 — VERDADE, ESCOPO E BLOQUEADORES.

Antes de editar, apresente:

1. repositório, branch, commit e working tree;
2. mapa do domínio;
3. componentes reutilizáveis;
4. localização do instrumento;
5. estado do banco e migrations;
6. estado da FlorêncIA;
7. estado dos dashboards;
8. riscos P0;
9. proposta de corte vertical;
10. plano de desenvolvimento.

Não edite código até apresentar a auditoria e observar as restrições do Decision Ledger.
