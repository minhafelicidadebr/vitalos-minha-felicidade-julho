# Apresentação empresarial VitalOS — implementação e prova local

Data da etapa: 16/11/2026 (artefatos UTC podem registrar 17/11). Base: `0b35b8f`, branch `feat/ivo-fibt-platform-foundation`. Sem alterações rastreadas prévias; o superprompt desta apresentação já existia como documento novo e foi preservado/integrado. `.q.out` e `.q.sql` não foram abertos, alterados ou incluídos.

## Entrega

Página `/apresentacao/empresas`, com 15 slides, índice de capítulos, leitura contínua, navegação por teclado, aprofundamentos em modais, tela cheia opcional e contato institucional. A identidade usa os ativos locais oficiais VitalOS e Instituto Felicidade para Todos; não foram redesenhados logos. A proposta empresarial é explicada pelo ciclo Mensurar → Educar → Transformar → Evoluir, pelas perspectivas IVO, pelas lentes anuais e por um exemplo educativo Q2 claramente local/sintético.

O usuário solicitou executar o [superprompt](SUPERPROMPT_APRESENTACAO_INSTITUCIONAL_EMPRESAS.md). A resposta sobre PIL-01/02/06 delimitou somente ensaio Alfa/Beta fictício; a apresentação não amplia essa autorização. Este servidor é adicional, descartável e **sem banco**: não inicializa, reinicia ou escreve nos stacks de empresas preservados. As referências Alfa/Beta são copy ilustrativa; nenhum registro dessas empresas é consultado.

Abrir no computador onde o servidor foi iniciado: **http://localhost:8093/apresentacao/empresas**. A senha fornecida foi configurada somente como verificador privado no ambiente local. Seu valor não está neste documento, no código, nos testes ou nos artefatos. Sem a configuração privada no servidor, a API fecha o acesso.

## Arquivos e responsabilidades

| Arquivo/grupo                                                    | Mudança                                                                                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/apresentacao.empresas.tsx`                           | Rota e metadado noindex; SSR entrega somente a composição de entrada                                                                                          |
| `src/routes/api.apresentacao.ts`                                 | GET/POST/DELETE delegam ao controlador do servidor                                                                                                            |
| `src/routes/__root.tsx` e `src/features/presentation/path.ts`    | Composição exata da apresentação, com A11yProvider e sem iniciar providers de empresa/demo. Demais rotas conservam o caminho anterior                         |
| `src/routeTree.gen.ts`                                           | Gerado pelo plugin do stack; duas rotas novas e registros de tipos preservados                                                                                |
| `src/features/presentation/EnterprisePresentation.tsx`           | Entrada, navegação, fragmentos, leitura, sessão, expiração, modais e saída                                                                                    |
| `PresentationVisual.tsx`, `types.ts`, `presentation.css`         | Contrato leve e layouts: composição de capa, cards, fluxo, perspectivas, lentes, papéis e relatório demonstrativo; estilos responsivos e redução de movimento |
| `src/lib/presentation/access.server.ts`                          | Verificador scrypt com salt, tokens opacos aleatórios, sessões em memória com hash do token, validação de origem, expiração e orçamento de tentativas         |
| `src/lib/presentation/content.server.ts`                         | Conteúdo servido após autorização; nenhuma importação do conteúdo protegido no código cliente                                                                 |
| Testes de `src/features/presentation/` e `src/lib/presentation/` | Acesso, expiração, concorrência, conteúdo, fronteiras de composição e interação                                                                               |
| `scripts/presentation-local.ts`                                  | Cópia isolada do app; configuração inerte ci/test validada pelo preflight; lê apenas seu próprio verificador privado                                          |
| `scripts/presentation-http-proof.ts`                             | Prova HTTP no localhost fixo; credencial recebida apenas pelo ambiente do processo; resultados sanitizados                                                    |

Não foram alterados dependências, migrations, registry de claims, unidades/atividades, regras COPSOQ, permissões institucionais ou contatos. O `AuthGate.tsx` final não possui diferença em relação à base.

## Conteúdo e evidências utilizadas

| Tema apresentado           | Origem                                                            | Limite explícito                                                                             |
| -------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Marca e atribuição         | Ativos em `public/brand/` e seus READMEs; `VitalOSBrand`          | Atribuição institucional informada; não é prova jurídica ou endosso externo                  |
| Ciclo METE e perspectivas  | Landing e documentos canônicos IVO                                | Perspectivas conceituais; nenhuma relação lente→dimensão ou nota composta aprovada pelo deck |
| Autoridade e administração | `Q2_PILOT_REVIEW_2026-11-16.md` e provas anteriores referenciadas | Prova local; personas de marketing não recebem acesso por aparecer no slide                  |
| Unidade/atividade Q2 0.1.0 | D10 de 15/11; artefatos canônicos Q2                              | Síntese explicativa, não exercício completo ou extensão de liberação a clientes              |
| Execução/aprendizagem      | Plano Q2 e registros locais anteriores                            | Execução, aprendizagem relatada, transferência e eficácia continuam distintas                |
| Q1                         | Fila metodológica e checkpoint                                    | Correspondência da fonte exata ainda pendente; não se reabre a confirmação informada de uso  |
| Q3/Q4                      | Arquitetura anual                                                 | Evolução prevista; não se equipara à operação Q2 demonstrada                                 |
| ESG                        | Contratos/editorial demonstrativo existentes                      | Não há impacto auditado, causalidade, certificação ou vínculo automático E/S/G               |
| Saúde mental               | Ficha primária OMS vinculada no painel                            | Contexto global; não é dado da empresa, ROI ou resultado da VitalOS                          |

**Claims numéricos:** a nova superfície `marketing.presentation.enterprises.context` é conferida pelo resolver canônico. O claim de baseline econômico da home não tem autorização para ela e é recusado. A apresentação usa contexto qualitativo com link à fonte OMS; não imprime estatísticas não autorizadas nem modifica o registry para conceder aprovação. A inclusão futura de números na narrativa exige a revisão específica por superfície existente no projeto. Não foram copiados recordes, clientes ou números institucionais não verificados da landing.

## Acesso e limites operacionais

- A senha só abre o deck; não cria conta, sessão Supabase, vínculo ou papel empresarial.
- Verificador privado em `.presentation.local/access.json`, ignorado pelo Git. O launcher projeta `VITALOS_PRESENTATION_VERIFIER`, `VITALOS_PRESENTATION_ORIGIN` e `VITALOS_PRESENTATION_STORE=single-process` apenas para o processo. Não foi aberto `.env`; a presença de `.env.example` foi conferida sem ler seu conteúdo.
- Sessão de 30 minutos, cookie HttpOnly, SameSite=Strict, Path restrito à API; Secure quando a origem usa HTTPS. HTTP só é aceito em loopback. Origem configurada é comparada com a requisição; mutações exigem Origin correspondente e recusam cross-site.
- GET privado/no-store, conteúdo carregado após sessão válida, payload limitado, nenhuma senha em query/localStorage/registry. O logout remove a sessão no servidor. Reinício do processo ou troca do verificador invalida sessões anteriores.
- Há orçamento global de 12 tentativas por minuto por processo, reservado antes da KDF para proteger concorrência. Ele pode limitar visitantes legítimos em conjunto. **Não é uma solução distribuída de produção.**
- Estado de sessão e limite são locais ao processo. Um destino com múltiplas instâncias, persistência após reinício, política própria de acesso ou revogação mais abrangente exige infraestrutura apropriada e validação antes de publicação. O modo single-process precisa ser configurado explicitamente; não há default permissivo.
- Uma senha compartilhada pode ser repassada e não identifica o visitante. O conteúdo usa somente informação institucional e exemplos sintéticos, sem dados reais de clientes.

## Verificações efetivamente executadas

1. **Direcionados:** 22 testes/125 asserções de apresentação, acesso e estado do gate, aprovados. Após a composição independente e a restauração do AuthGate, 26 testes/207 asserções incluindo o pacote Q2 congelado, aprovados. Não somar essas execuções como quantidade de testes únicos.
2. **Gate integrado:** **4.406 pass, zero fail; 350 arquivos; 13.817 asserções**. Paridade de schema, TypeScript e secret-scan aprovados. Depois da correção final do nome acessível do botão mobile, os cinco testes da interface foram executados e aprovados novamente; o build abaixo contém essa correção. O amplo conjunto de provas Q2 HTTP/DB não foi repetido.
3. **Lint dirigido:** arquivos novos, componentes, rotas e scripts sem erros/avisos na execução final. Não se declara lint global verde. Prettier aplicado somente aos novos arquivos e componentes desta etapa; raiz legada não foi reformatada. Typecheck final também passou com a árvore gerada completa do plugin.
4. **Build inerte:** aprovado em `.institutional-admin.local/module-build-1794875419174`; credenciais da apresentação ausentes do build; `.output` preservada pelo harness. **Dez fontes finais idênticas por SHA-256 à cópia compilada**. Inspecionados 316 arquivos públicos JS/HTML/JSON/map: marcadores específicos do conteúdo protegido e da KDF ausentes. É prova desses marcadores e dessas fontes, não garantia universal contra qualquer vazamento.
5. **HTTP independente:** onze verificações aprovadas contra localhost:8093: acesso anônimo, SSR sem conteúdo protegido, senha incorreta, origem indevida, host alternativo, login normal/cookie, leitura dos 15 slides, logout, replay de cookie antigo, cookie forjado e concorrência limitada. Sem navegador simulado, banco, e-mail ou serviço externo.
6. **Navegador real:** senha errada recusada; senha configurada aceita; 15 slides e 15 painéis percorridos; Escape retorna ao micro-CTA; índice acionado por Enter foca o título correto; leitura contínua preserva conteúdo; recarga mantém acesso/capítulo; sair retira o deck; link direto depois de sair continua bloqueado; novo login retoma o fragmento solicitado.
7. **Responsividade:** quinze artigos renderizados em modo contínuo, sem transbordamento de documento, slide ou card nas larguras CSS medidas **320, 360, 391, 768, 1024 e 1440 px**. A ferramenta aceita dimensões inteiras e o navegador usa escala existente; por isso a aproximação de 390 mediu 391, sem mudar o zoom do usuário. Painel mobile com foco contido e sem transbordamento horizontal; nome acessível de saída corrigido.
8. **Integridade anterior:** pacote Q2 de `517c206` continua conferindo os 31 arquivos de seu escopo, sem regeneração. Não cobre esta apresentação nem todo o checkout atual. Candidato Q2 anterior `2e9df54` não foi promovido silenciosamente a uma edição remota.

Falhas encontradas e resolvidas: fixtures happy-dom removiam Origin/Set-Cookie na construção; passaram a representar cabeçalhos de servidor sem enfraquecer a validação. O primeiro gate integrado encontrou divergência do pacote Q2 quando a composição dependia da edição do AuthGate; a arquitetura final separa o deck da inicialização de empresa/demo e preserva os arquivos da prova congelada. O preflight recusou uma configuração local declarada como test; corrigida para URL inerte `ci.invalid`, sem contornar o preflight. Execução do servidor/build fora da restrição de rede/cwd do sandbox passou pela revisão normal de ferramenta. Aviso EPERM do Bun e avisos legados de route/test, chunk size e plugin foram preservados, com saída final zero. Aviso de hidratação do navegador aponta atributo de extensão `cz-shortcut-listen`, sem supressão de proteção ou alteração no produto para escondê-lo.

Capturas iniciais tiveram timeout/transição incompleta; foram substituídas por capturas estáveis inspecionadas. A inspeção por pixels é representativa em desktop/mobile; não se declara auditoria completa de leitor de tela, de todos os dispositivos ou conformidade WCAG certificada. A ferramenta de captura mobile inclui margem/canvas além do viewport em alguns arquivos; a medida de reflow vem do DOM e é reportada separadamente.

## Evidências

- [Navegador e medidas](artifacts/PRESENTATION_BROWSER_2026-11-16.json)
- [Onze verificações HTTP](artifacts/PRESENTATION_HTTP_2026-11-16.json)
- [Build, hashes e varredura pública](artifacts/PRESENTATION_BUILD_2026-11-16.json)
- [Capa desktop](artifacts/PRESENTATION_DESKTOP_2026-11-16.jpg)
- [Framework desktop](artifacts/PRESENTATION_CYCLE_DESKTOP_2026-11-16.jpg)
- [Framework mobile](artifacts/PRESENTATION_CYCLE_MOBILE_2026-11-16.jpg)
- [Painel mobile](artifacts/PRESENTATION_MODAL_MOBILE_2026-11-16.jpg)

## Retomar e próximo marco

O servidor local iniciado nesta etapa usa a configuração privada já preparada. Para iniciar novamente no mesmo computador: `bun --no-env-file scripts/presentation-local.ts`, com a pasta do Bun no PATH. O comando não instala dependências nem reinicializa banco. Não copiar o verificador privado para documentação ou para configuração pública. Em outro computador, preparar configuração privada adequada ao servidor; o aplicativo permanece fechado na ausência dela.

**Maturidade alcançada:** apresentação funcional implementada e demonstrada localmente, com acesso separado verificável e sem dados reais. Não há confirmação nova de CI, homologação remota, publicação, conversão comercial, eficácia científica ou prontidão de SaaS.

**Próximo marco único:** revisão editorial da apresentação local pela equipe institucional, incluindo eventual autorização de claims numéricos para esta superfície. Uma futura homologação/publicação depende de autorização específica e da adequação do armazenamento de sessão/limite ao runtime escolhido. Sem push, deploy, migration remota ou contato externo nesta entrega.
