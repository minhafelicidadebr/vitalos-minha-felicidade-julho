# SUPER PROMPT · Proposta do Instituto à ISG · V2 Master Plus

**Para:** Claude Opus 5.5 (Claude Code) · **Repositório:** `minhafelicidadebr/vitalos-minha-felicidade-julho` · **Base:** `main` `cd3feae` (PR #70 mesclado)
**Status deste documento:** `AGUARDANDO APROVAÇÃO DO SUPERCOMITÊ`. **Nenhuma implementação começa antes do portão da seção 6.**
**Revisão 2 · 23/11/2026:** incorpora as decisões do fundador no chat (seção 4.0): dados do Instituto confirmados, Playbook liberado como "ancorado em", bios resumidas e fotos da equipe autorizadas. O portão do comitê **continua** valendo para a implementação da página.
**Natureza:** prompt de execução em duas fases (planejar com Tree of Thoughts, parar no portão, só então construir).

> Cole este arquivo inteiro como primeira mensagem de uma sessão nova do Claude Code aberta num worktree limpo a partir da `main`. Ele é autocontido; os anexos (A–G) trazem os fatos, as cores, os briefs de imagem e os modelos.

---

## 0. Como ler este prompt

| Marca | Significado |
|---|---|
| **FATO** | Verificado numa fonte, com data. Pode ser usado conforme a seção 5 |
| **PEDIDO** | O que o fundador quer (P1 a P13), na ordem em que ele pediu |
| **PARECER** | Opinião preliminar do autor do prompt. É hipótese para a sua árvore, nunca decisão |
| **PORTÃO** | Ponto em que você para e espera aprovação explícita |
| **VETO** | Condição que reprova o trabalho inteiro, qualquer que seja a nota |

---

## 1. Seu papel e a barra de qualidade

Você é o arquiteto-chefe e o desenvolvedor sênior desta proposta. O padrão a atingir é **Master Plus**: o resultado precisa resistir à avaliação simultânea de um supercomitê (seção 9) formado por especialistas com mais de 40 anos de agência, de apresentação institucional e de pesquisa em ciência do bem-estar, além de revisores de IA com perfis adversariais.

Obrigações de postura, nesta ordem:

1. **Leia antes de agir:** `CLAUDE.md` (inteiro), `docs/SKILL_MESTRA_FABLE5.md`, e as skills do projeto `nr1-copsoq-defensibility-guard`, `ux-ix-premium-accessibility-guard`, `surgical-implementation-guard`, `token-context-economy-guard`. As regras de lá valem aqui, inclusive as regras científicas permanentes (Evidence Registry congelado).
2. **Verdade antes de brilho.** Uma página deslumbrante com uma afirmação que não se sustenta é pior que uma página sóbria. Quando a ideia do fundador esbarrar numa regra, você não obedece cegamente nem recusa em silêncio: aplica o tratamento permitido da seção 5 e explica.
3. **Fonte única.** Conteúdo, preço, calendário, equipe e claims vivem em dados tipados no servidor. Visão de rolagem, modo apresentação e impressão leem os mesmos dados. Nunca digite um número ou um status científico à mão em componente.
4. **Menor mudança que prova a tese.** Reaproveite o que existe (seção 2). Não reescreva o que já passou no gate.
5. **Nada de efeito presumido.** A proposta descreve uma implantação acompanhada com entregas verificáveis. Ela não promete resultado de bem-estar, produtividade, retorno financeiro, conformidade legal nem endosso de terceiros.

---

## 2. Estado atual (FATO, conferido em 23/11/2026)

**O que já está na `main` e não deve ser recriado**
- Rota `/proposta` (+ `/api/proposta`), senha no servidor (scrypt, cookie HttpOnly, `no-store`, limite de tentativas), conteúdo só depois da senha. Segredos: `VITALOS_PROPOSAL_VERIFIER` e `VITALOS_PROPOSAL_ORIGIN`. Em `vitalos.com.br` a página abriu em "indisponível" até os segredos serem cadastrados no Lovable (ação do fundador, não sua).
- Arquivos: `src/features/proposal/{ProposalPage.tsx,proposal.css,types.ts}`, `src/lib/proposal/{isg-content.server.ts,proposal-access.server.ts}`, `src/routes/{proposta.tsx,api.proposta.ts}`, `src/features/presentation/path.ts` (a rota usa shell próprio, sem provedores da demo), `scripts/proposal-local.ts` (prévia isolada em `http://localhost:8094/proposta`).
- Conteúdo atual: abertura, "Em dois minutos", pergunta de abertura, por que Instituto e ISG, exemplo fictício de passagem de turno (Q2), jornada Q1–Q5 com marcas **Disponível na plataforma / Conduzido pelo Instituto / Condicionado à liberação**, validação operacional × efeito, investimento (R$ 60.000 = 5 × R$ 12.000, preço com fonte única `PROPOSAL_TOTAL`) e contribuição de 40 horas lado a lado, responsabilidades em tabela, "Reunião de implantação" (CTA ancora na própria página, sem link externo), fontes e classificação.
- Documentos: `docs/vitalos/proposta-isg/` (ficha de revisão, roteiro de 5 minutos, capturas e PDF). **Leia a ficha, seção 7 (termos pendentes) e seção 11 (CTA).**
- Motor de apresentação existente e protegido por senha: `/apresentacao/empresas` (`src/features/presentation/*`, conteúdo em `src/lib/presentation/content.server.ts`). Ele já tem capítulos, painéis "explore a ideia", `PresentationVisual`, números animados resolvidos pelo **Commercial Claims Registry** e quatro imagens geradas com procedência registrada (`docs/vitalos/artifacts/PRESENTATION_V4_IMAGES_2026-11-17.json`).
- Governança de claims que você **deve** reutilizar: `src/domain/commercial-claims/` (registry, resolver por superfície, scanner de termos) e `src/domain/evidence/` (`evidence-registry.json` congelado, `buildPassport()`).

**Maturidade real de Q1–Q5 (não pode ser inflada em nenhum slide, imagem ou cronograma)**
Q1 só preparação (coleta bloqueada até ficha oficial e permissão de uso). Q2 jornada provada em banco descartável; convite de ponta a ponta no app publicado **não testado**. Q3 só prática educativa, sem mensuração. Q4 prática de forças fora da `main`, sem painel coletivo. Q5 só síntese descritiva; o relatório da plataforma é extrato demonstrativo. Fontes: `docs/vitalos/piloto/` (`MO3_LENTES`, `CHECKLIST_LIBERACAO_PILOTO_Q2`, `CONTINUIDADE`).

**Limites operacionais**
- `bun` fica em `C:\Users\FIB2030\.bun\bin\bun.exe`. Gate: `bun run gate` (testes + paridade + `tsc` + secret-scan). `gh` não está autenticado.
- **Nunca** faça push, abra PR, publique, altere o Lovable ou envie mensagem à ISG sem um "sim" explícito do fundador, a cada vez. O merge na `main` sincroniza com o Lovable.
- Trabalho novo entra em branch própria (`feat/proposta-v2-*`). Não toque em alterações não commitadas de outros worktrees.

---

## 3. O que o fundador pediu (PEDIDOS) e o parecer preliminar

Cada pedido vira uma **decisão** na sua árvore (seção 7). O parecer é só ponto de partida.

| # | PEDIDO (palavras do fundador, resumidas) | PARECER preliminar |
|---|---|---|
| **P1** | Trocar a frase de abertura "Da escuta das equipes às decisões que a empresa consegue acompanhar" por algo sobre crescimento, ciência da felicidade, sistema operacional da vitalidade organizacional, bem-estar e felicidade para ESG | **Viável, com disciplina.** Quatro ideias numa frase só diluem. Uma tese forte, um subtítulo que ancora o resto. "ESG" só como direção, nunca como "relatório ESG entregue" (Q5 hoje é demonstrativo). O título tem de ser legível sem a imagem |
| **P2** | Ver a apresentação como slides, na horizontal | **Viável e útil para a reunião ao vivo.** Risco: duplicar conteúdo e quebrar acessibilidade. Resolva com modo derivado da mesma fonte, nunca como segunda página escrita à mão |
| **P3** | Imagens hiper-realistas, cinematográficas, luz de estúdio de Hollywood; faixas de seção com imagem + título + resumo; transições entre blocos | **Pode ficar muito bom**, se houver direção de arte única e rótulo honesto de ilustração gerada. Risco: vale-do-estranho, peso, e parecer banco de imagem para quem avalia SST e compras. Nunca sugerir pessoas reais da ISG |
| **P4** | Cronograma de 3 meses por etapa (cada Q é um processo de 3 meses), pedagógico, tipo infográfico | **Viável e é a maior lacuna da proposta atual**: hoje não há tempo na página. Confirmar durações antes de desenhar (Q5? sequencial ou sobreposto?) |
| **P5** | Estratégia de preço: não pôr R$ 60.000 em destaque; mostrar 5 × R$ 12.000 e "por mês" (cerca de R$ 4.000) | **Viável e honesto se o total continuar visível sem abrir painel.** Destaque menor não é esconder. O "mês" é equivalente derivado, nunca cobrança mensal |
| **P6** | Bio e foto de quem implementa (equipe executora) e do Instituto | **Desbloqueado em 23/11.** Textos e fotos recebidos; bios **resumidas** no Anexo H, só com o que está nos textos. Pendente: confirmar quem é quem em cada foto; decidir cargo público e nomes de instituições (seção 4.4) |
| **P7** | Intervenções em Q2 e Q3 ancoradas em ciência: Playbook (Oxford, "mais de 3 mil artigos"), PERMA, FIB, VIA, instrumento de Copenhague no Q1 | **Liberado como "ancorado em"** com a edição (Guia Prático, 3.000+); **segue vetado como "chancelado por Oxford"** (seção 5) |
| **P8** | Caso "Haiku" (leia-se **Heineken**: confirmar) da outra apresentação, para valorizar a proposta de valor | **Viável como caso externo atribuído**, com os limites já aprovados na V4. Sem logo, sem o 50% de absenteísmo |
| **P9** | Cores da marca do Instituto nos quadros, com os códigos reais | **Verificado no CSS do site do Instituto** (Anexo B). Exige tokens oklch e checagem de contraste |
| **P10** | Efeitos numéricos (contadores), números do Instituto (110.000+, 219+, 700+, 1.300+) e números de empresas que investem em bem-estar | **Números do Instituto liberados** (confirmados pelo fundador), **com o escopo que os cofundadores usam** (educação; 700+ **instituições de ensino**; ver tabela 4.2). "Recorde" como declaração com definição (4.3). Números de mercado só os do Registry |
| **P11** | Ícones de destaque para a base científica (Copenhague/Q1; PERMA, FIB, VIA = ciência da felicidade; psicologia positiva; bem-estar no trabalho) | **Viável**, desde que cada ícone aponte para um item do registro e diga o status honesto (referência × coleta condicionada) |
| **P12** | Resumo curto da equipe executora (três pessoas, links do LinkedIn e fotos) | **Feito como rascunho** (Anexo H) para aprovação, e as fotos já estão em `src/assets/proposal/team/`. Falta confirmar o mapa foto → pessoa |
| **P13** | Nível estado da arte: narrativa institucional + marketing de alta conversão + UX + responsividade em todas as telas + benchmark de boas práticas | É o critério de aceitação de tudo. Ver seção 9 |

---

## 4. Fatos verificados nesta sessão (use, cite com data, não estenda)

### 4.0 Decisões do fundador no chat (23/11/2026) · autorização registrada

O fundador respondeu, textualmente, que: (1) **os dados do Instituto são confiáveis e ele os confirma**; (2) a ancoragem nos **números e artigos do Playbook/Movimento do Bem-Estar** pode ser inserida ("a gente se ancora em artigos científicos estruturados dentro desse playbook"); (3) as **bios devem ser resumidas** (o conteúdo da página é mais de números); (4) as **fotos dos cofundadores** (três) foram enviadas e **"está autorizado"** o uso na apresentação; (5) **"desbloqueie essas questões para apresentação"**.

Efeito: os itens 4.2 a 4.5 deixam de ser bloqueios de dado e passam a ser **regras de redação e de escopo**. Isso é uma **autorização editorial do fundador**, não uma revisão científica independente nem aprovação do comitê. Registre-a como tal no Commercial Claims Registry (padrão do `PRESENTATION_V3_USER_NUMBERS_2026-11-17.md`: data, texto da autorização, escopo e vencimento) **sem** abrir o `frozen` do Evidence Registry.

**Ficam de pé, mesmo com a autorização:** os vetos de "chancela/endosso de Oxford", de promessa de efeito/ROI e de pessoa associada a foto errada (seção 4.4 e Anexo H).

### 4.1 Marca do Instituto
Códigos extraídos do CSS publicado em `felicidadeparatodos.com.br` (arquivo `assets/index-B-UhTcj8.css`, consultado em 23/11/2026). Tabela completa, com contraste, no **Anexo B**. Resumo: ciano `hsl(182 98% 40%)`, verde `hsl(104 60% 42%)`, magenta/coral `hsl(336 81% 46%)`, amarelo/ouro `hsl(47 99% 56%)`, escuro `hsl(222 16% 11%)`, ciano profundo `hsl(182 98% 26%)`. O logo oficial já está em `public/brand/instituto/`.

### 4.2 Números do Instituto (confirmados pelo fundador; **escopo exato obrigatório**)
O site exibe "+110.000 pessoas pesquisadas", "+219 municípios", "+700 organizações" e "+1.300 projetos ODS", sob o rótulo "Recorde Mundial de Aplicação FIB", **sem fonte ou nota ao lado**. O fundador os confirmou em 23/11/2026. Os textos de apresentação dos três cofundadores (Anexo H) dão o **escopo real**, e ele é mais estreito que o rótulo do site:

| Número | Como o site diz | Como os cofundadores dizem (própria bio) | Redação segura para a ISG |
|---|---|---|---|
| 110 mil | "pessoas pesquisadas" | "mais de 110 mil **respostas** coletadas em contextos **educacionais e institucionais**"; "maior Pesquisa **FIB Educacional** do Brasil (110 mil **respondentes**)" | "Mais de 110 mil respostas em pesquisas FIB, sobretudo em contextos educacionais" |
| 219 | "municípios mapeados" | "impactando diretamente +219 municípios" | "+219 municípios alcançados" (**uma** só verbalização; não alternar "mapeados/impactados") |
| 700 | "**organizações** que já confiaram na FPT" | "+700 **instituições de ensino**" | **"+700 instituições de ensino"**. "Organizações" levaria a ISG a ler como clientes corporativos. **Pergunte ao fundador qual das duas é a correta** |
| 1.300 | "projetos ODS" | "classificamos +1.300 **projetos escolares** alinhados aos ODS" | "+1.300 projetos escolares classificados segundo os ODS" |

**Regra de ouro desta seção:** o histórico de números do Instituto é **pesquisa e mobilização em larga escala, principalmente em educação e territórios**. A proposta à ISG é **trabalho organizacional**. A página deve dizer isso ("experiência do Instituto, agora aplicada ao trabalho"), **sem sugerir** que essas pessoas ou escolas são casos de empresas nem que esses números predizem resultado na ISG. Rotule: **"Dados do Instituto, confirmados pelo fundador em 23/11/2026"**.

### 4.3 "Recorde mundial" (liberado como declaração, com escopo)
Os cofundadores o descrevem como **"recorde mundial na aplicação da pesquisa FIB"** (mais de 110 mil respostas, contextos educacionais), e a bio de um deles fala em "maior estudo global sobre felicidade educacional"; outra bio fala em "maior pesquisa de felicidade escolar do mundo" (2023, com a Controladoria-Geral de Goiás). **Nenhum órgão certificador aparece em fonte pública.** O fundador autorizou o uso. Portanto:
- Permitido: **"Recorde mundial de aplicação da pesquisa FIB (declarado pelo Instituto)"**, sempre com a definição (pesquisa FIB, contextos educacionais, mais de 110 mil respostas).
- Proibido: omitir a definição; transformar em superlativo geral ("maior do mundo em felicidade"); usar no hero como selo; vincular ao FIB-T ou ao Q2. O comitê pode exigir o documento de comprovação: deixe o campo **"comprovação anexa: sim/não"** na ficha de claims.

### 4.4 Equipe executora (dados recebidos; bios resumidas no Anexo H)
O robô de leitura não conseguiu abrir os três perfis do LinkedIn (HTTP 999). O fundador **colou o texto "Sobre" de cada um** no chat e **enviou as três fotos**. Isso passa a ser a **única fonte** das bios: **proibido acrescentar** cargo, titulação, tempo de carreira ou frase que não esteja nesses textos.
- Pessoas (grafia como no texto colado): **João Paulo Brandão Barboza**, **Ana Paula Daltoé Inglêz Barbalho** (indica "ela/dela"), **Olga Mariano**. Os três se descrevem como cofundadores do Instituto. Pronomes só quando a própria pessoa os indica.
- **Fotos** (arquivos já guardados em `src/assets/proposal/team/`, ver `PROCEDENCIA.md`): `equipe-foto-1.png` (389×389), `equipe-foto-2.png` (400×400), `equipe-foto-3.webp` (800×800). **A correspondência foto → pessoa NÃO está confirmada.** A proposta de correspondência é por tamanho e tipo dos arquivos em relação às URLs de perfil (foto-1 ↔ Olga, foto-2 ↔ João Paulo, foto-3 ↔ Ana Paula), **não por reconhecimento de rosto**. Antes de exibir nome ao lado de rosto, o fundador **confirma por escrito** cada par.
- **Cargo público (alerta de conformidade):** o perfil de uma cofundadora lista cargo atual de **ouvidora em ministério federal** e funções em conselhos e comissões. Usar título de cargo público numa proposta **comercial** a uma empresa privada pode gerar questão de conflito de interesses e de uso do cargo. **Padrão desta revisão: não usar cargo público nem função em conselho, comissão religiosa, rede política ou coalizão em nenhuma bio.** Só entram formação e atuação no Instituto. Se o Instituto e a pessoa decidirem o contrário, registrar a decisão por escrito.
- **Nomes de grandes instituições como "halo"** (Yale, MIT, Harvard) aparecem nos perfis. **Fora das bios da proposta**: sugerem endosso institucional que a regra de vetos proíbe.
- URLs de foto do LinkedIn têm token de expiração e **não podem ser hotlinkadas**; o app usa só as cópias locais.
- **Autorização individual:** o fundador autorizou o uso. Como são dados pessoais de três pessoas, **recomenda-se**, sem bloquear a construção, que cada uma confirme por mensagem (Anexo D, versão curta) **antes de o link ser enviado à ISG**.

### 4.5 Playbook (liberado como "ancorado em", com a edição certa)
- O resumo colado pelo fundador é do **Guia Prático de Bem-Estar no Trabalho** (Movimento Mundial do Bem-Estar, com apoio do Indeed e em colaboração com o Wellbeing Research Centre da Universidade de Oxford; fonte `wellbeing.hmc.ox.ac.uk/publications/work-wellbeing-playbook/`). Ele diz: **revisão sistemática**, **mais de 3.000 estudos acadêmicos** sobre intervenções de bem-estar no trabalho, **12 fatores-chave**, e recomenda combinar intervenções em nível organizacional, de grupo e individual, sem "fórmula mágica".
- **Resolução da divergência 3.000 × 4.000:** os documentos internos citam "mais de 4.000" no lançamento do **Playbook 2.0**. São **edições diferentes**. **Para esta proposta, o número autorizado é 3.000+, atribuído ao Guia Prático**, porque é o texto que o fundador colou. Nunca escreva "Playbook" + número sem a **edição**. Se o fundador quiser o número 4.000+, ele traz a fonte da edição 2.0.
- **Autorização do fundador (23/11/2026):** inserir a afirmação **"nossas intervenções e conteúdos estão ancorados em evidências sistematizadas no Work Wellbeing Playbook"**, com o número da edição citada. Registre o claim (superfície nova, variante, fonte, data de revisão, vencimento conservador).
- **Redação que vale:** "ancorado em", "baseado em evidências sistematizadas por", "apoiado na literatura reunida pelo". **Redação que não vale:** "chancelado/validado/aprovado por Oxford", "parceria com Oxford", "Oxford recomenda a VitalOS".
- Licença do Playbook: CC BY-NC-ND 4.0. Regra permanente do projeto: **não ler o Playbook em tarefa de implementação** (você não abre o documento). Use só o resumo colado e os `safe_claim` do registro. Sem logos de Oxford ou Indeed, sem reproduzir figuras, gráficos ou recomendações extensas, com link e atribuição.
- Precedente: a V2/V3 já tratam a colaboração Oxford/Indeed como atribuída **à obra, não à VitalOS**, sem logos de terceiros e sem anunciar ingestão do corpus. O scanner de claims tem a regressão explícita **"chancela da university of oxford"** como termo proibido.

### 4.6 Instrumentos
- Q1: a forma adotada é a COPSOQ II-Br curta (Gonçalves et al., Rev Saúde Pública 2021). A coleta continua bloqueada por falta de enunciados oficiais e de permissão de uso (`Q1_COPSOQ_FORMA_ADOTADA_2026-11-20.md`). O rótulo comercial **aprovado** é "Mapeamento psicossocial estruturado" (superfície `marketing.nr1.journey.t1-instrument-label`); termos como "bateria COPSOQ II" e "diagnóstico científico" foram removidos e são regressão no scanner.
- "Instrumento de Copenhague, reconhecido internacionalmente": é uma **afirmação nova** (origem do COPSOQ). Precisa ser registrada como claim antes de aparecer, com fonte primária.
- VIA-T: sempre "exploratório, não diagnóstico, nem ranking". PERMA+V (Q3): mensuração bloqueada; só prática educativa.
- FIB (pesquisa de felicidade interna bruta, aplicada pelo Instituto) e **FIB-T** (instrumento do Furtado 2020, usado no Q2) **não são a mesma coisa.** Não misture o "recorde FIB" com o FIB-T.

### 4.7 Caso externo
A V3/V4 já usam o caso **Heineken Brasil** com fontes (`heinekenbrasil.com.br/noticias/felicidade-x-positividade` e Você RH 2026), como relato publicado. **Ficou de fora, por falta de período e base:** a série de adesão e o "50% de absenteísmo". Mantenha de fora.

### 4.8 Números de mercado já liberados
Somente os quatro do Commercial Claims Registry 1.1.0: OMS (US$ 1 tri/ano e 12 bi de dias, depressão e ansiedade) e Gallup (burnout 4× menos provável; rotatividade −59%), cada um com recorte e data. **Os demais percentuais da home (+21% produtividade, +45% adaptabilidade, +300% inovação, −37% absenteísmo, −48% acidentes) foram barrados por falta de fonte primária.** Não os reintroduza.

---

## 5. Conflitos entre o pedido e as regras · tratamento obrigatório

| Ideia do fundador | O que é **permitido** | O que é **proibido** (VETO) |
|---|---|---|
| "Chancela" do Playbook/Oxford para nossas intervenções | "Intervenções e conteúdos **ancorados na literatura sistematizada** pelo Work Wellbeing Playbook (World Wellbeing Movement, com o Wellbeing Research Centre da Universidade de Oxford)", com link, edição e a frase "autoria atribuída à obra" | "chancelado/validado/endossado por Oxford", logo de Oxford ou Indeed, qualquer coisa que sugira parceria, "baseado em mais de N mil estudos" sem edição e sem registro |
| Número de estudos do Playbook | **"Mais de 3.000 estudos", atribuído ao Guia Prático de Bem-Estar no Trabalho**, com a edição, depois de registrado no Registry (`claimId` + superfície). Autorizado pelo fundador em 23/11/2026 | 3.000 ou 4.000 sem a edição; "milhares" soltos; somar edições; usar o 4.000 do Playbook 2.0 sem a fonte da edição |
| Instrumento "reconhecido internacionalmente, de Copenhague" | "Instrumento de referência internacional, desenvolvido em Copenhague" **se** o claim for registrado com fonte primária; ao lado: "coleta nesta proposta condicionada à liberação" | Insinuar que a ISG será medida com ele hoje; nomear a versão brasileira como disponível; "diagnóstico" |
| PERMA, VIA, FIB "são ciência da felicidade" | "Referências da psicologia positiva e da ciência do bem-estar" com autoria e status no projeto (modelo, instrumento, exploratório, condicionado) | Tratar como prova de resultado; chamar o VIA-T de diagnóstico |
| Números do Instituto em destaque (**liberados pelo fundador em 23/11/2026**) | Cada número com a redação segura da tabela 4.2 (educação; "instituições de ensino"; "respostas") e o rótulo "Dados do Instituto, confirmados pelo fundador em 23/11/2026". "Recorde mundial de aplicação da pesquisa FIB (declarado pelo Instituto)" com a definição | Contadores sem escopo; "700 organizações que confiaram" lido como clientes corporativos; "recorde" como selo no hero ou sem definição; atribuir esses números à VitalOS ou a resultado na ISG |
| "Empresas que investem têm mais resultados" | Os quatro números do Registry, em linguagem **correlacional**, com instituição, ano e recorte | Os percentuais barrados; "ROI"; "garantia"; prometer queda de absenteísmo na ISG |
| Caso Heineken como chancela | Caso externo **descrito pela empresa**, atribuído, com as práticas e a participação | Logo, citação inventada, 50% de absenteísmo, sugerir que a Heineken avaliza a VitalOS ou o Instituto |
| Imagens hiper-realistas | Ilustração gerada, **rotulada** ("Ilustração gerada · pessoas fictícias"), com procedência registrada como na V4 | Rostos que lembrem pessoas reais; apresentá-las como equipe da ISG ou do Instituto; logo ou tela legível; foto que pareça cliente |
| Foto e bio da equipe (**autorizado pelo fundador em 23/11/2026**) | Bio **resumida** (Anexo H) feita **só** com os textos colados; foto das cópias locais; nome ao lado de rosto **só depois** de o fundador confirmar o par; recomendação de confirmação individual antes do envio à ISG | Raspar LinkedIn; hotlink do CDN; **cargo público, conselho, comissão religiosa ou rede política nas bios**; nomes de Yale/MIT/Harvard como halo; inferir cargo, titulação, gênero ou história pelo nome; identificar pessoa por reconhecimento de rosto |
| Preço "por mês" | "5 marcos de R$ 12.000 · equivalente a cerca de R$ 4.000 por mês nos 3 meses de cada etapa", **só** depois de confirmadas as durações; total sempre visível sem abrir painel e igual em resumo, detalhamento e impressão | Cobrança mensal; esconder ou diminuir o total a ponto de não ser achado; "apenas", "só R$"; urgência, escassez, desconto inventado |
| ESG na frase principal | ESG como **horizonte** ("registros que podem alimentar o relato de sustentabilidade", linguagem "mudança observada") | "Relatório ESG incluído", "impacto ESG garantido", ODS sem indicador |
| NR-1 | Se citar: apoio educativo e de preparação ao trabalho de SST; consultar orientações oficiais do MTE; passar pela skill `nr1-copsoq-defensibility-guard` | Conformidade automática, escudo jurídico, "evita multa", ranking individual |

---

## 6. Protocolo em fases e o PORTÃO

```
FASE 0  Reconhecimento (somente leitura)
FASE 1  Árvore de Conhecimento (ToT) → Plano de Elevação → "Pacote para o Comitê"
   ⛔ PORTÃO: PARE. Entregue o pacote e espere "APROVADO" explícito, onda por onda.
FASE 2  Implementação por ondas aprovadas (commits locais, gate verde a cada onda)
FASE 3  Verificação e autoavaliação pela rubrica (seção 9) → ficha de revisão V2
   ⛔ Nenhum push, PR, publicação ou Lovable sem "sim" do fundador.
```

**Fase 0 (ritual de abertura, sem editar):** ler a lista da seção 1; abrir a ficha `docs/vitalos/proposta-isg/FICHA_REVISAO_2026-11-23.md`; rodar `git log --oneline origin/main..HEAD` e confirmar a base `cd3feae`; abrir a prévia local e **ver** a página atual em 320 e 1440 px; levantar o que já existe para reaproveitar (seção 2) e listar, em uma tabela curta, o que é novo. Confirme **por escrito** (pergunta única ao fundador, só se necessário) os itens da seção 10 que bloqueiam o desenho.

**Fase 1 (o coração deste prompt):** produzir o **Pacote para o Comitê** (seção 8). Aplique ToT em cada decisão (seção 7). Não escreva código de produção. É permitido prototipar em arquivos descartáveis fora de `src/` para testar uma hipótese visual, desde que não entrem no commit.

**PORTÃO:** ao fim da Fase 1 imprima exatamente `AGUARDANDO APROVAÇÃO DO SUPERCOMITÊ` e pare. A aprovação válida tem a forma `APROVADO: ondas A,B,C` (ou `APROVADO COM AJUSTES: …`). Silêncio, elogio ou "parece bom" não é aprovação. Qualquer mudança de escopo durante a Fase 2 volta ao portão.

---

## 7. Método ToT (Árvore de Conhecimento) · como raciocinar cada decisão

Para **cada** decisão D1–D12 abaixo, produza uma ficha com estes campos, nesta ordem:

1. **Objetivo e restrição inegociável** (uma linha; cite a regra da seção 5 que se aplica).
2. **Ramos:** no mínimo **3 candidatos** genuinamente diferentes (não variações do mesmo). Um deles deve ser "não fazer / versão mínima".
3. **Critérios e pesos** (some 100): Clareza executiva · Fidelidade à verdade e ao escopo · Conversão ética · Acessibilidade · Esforço e risco técnico · Coerência com a marca · Reversibilidade. Ajuste os pesos se a decisão pedir, justificando.
4. **Nota por ramo e critério** (0–5) com **uma frase de evidência** por nota. Evidência é: item do repositório, fonte externa datada, ou teste que você rodou. "Acho" não é evidência.
5. **Poda explícita:** o que cai e por quê (cada ramo podado tem motivo de uma linha).
6. **Escolha + risco residual + como reverter.**
7. **Teste de falsificação:** o que você observaria no navegador ou nos dados que provaria que a escolha está errada.
8. **O que depende do fundador** (pergunta objetiva, com opções).

Regras do método: pense em voz alta nas fichas, não só no resultado; contraponha cada escolha a um **"advogado do diabo"** (o comitê, as perspectivas de direção, RH, SST, tecnologia e compras); se duas escolhas ficarem a menos de 5 pontos de distância, mostre as duas ao comitê em vez de decidir sozinho; registre as hipóteses descartadas, porque o comitê vai querer vê-las.

### As decisões e os ramos-semente (PARECER; expanda, corrija ou descarte com evidência)

**D1 · Tese e frase de abertura (P1).** Ramos-semente: (a) tese de ciência aplicada ("Ciência da felicidade aplicada ao trabalho: do bem-estar que se mede ao bem-estar que se decide"); (b) tese de sistema ("O sistema operacional da vitalidade organizacional, em implantação acompanhada"); (c) tese de crescimento sustentável/ESG ("Pessoas que florescem, empresas que crescem, relatos que se sustentam"); (d) manter o título atual e mudar só o subtítulo; (e) **tese dos quatro pilares do Instituto**: o Instituto descreve sua atuação em **Mensuração, Educação, Transformação e Evolução** (texto de apresentação de um cofundador) e um "Sistema ESG 9.17"; isso **coincide** com o ciclo M.E.T.E. do app e pode dar uma tese própria e verdadeira. Use só se o fundador confirmar que "Sistema ESG 9.17" pode ser citado nesta proposta (**pergunta 10**). Avalie também **2 a 3 variações por ramo**, testando: cabe em 2 linhas a 320 px? Promete algo? Soa a slogan genérico? Usa jargão como drama? "ESG" aparece como horizonte ou como entrega? Entregue um **teste de 5 segundos** por candidata (o que uma pessoa de direção entende?). Mantenha o subtítulo factual e a pergunta de abertura como hipótese. Lista de candidatas de partida no Anexo E.

**D2 · Modo apresentação em slides horizontais (P2).** Ramos: (a) rota irmã `/proposta/apresentar` renderizando o mesmo dado em slides; (b) alternância "Ler / Apresentar" na mesma página, trocando o layout (scroll-snap horizontal) sem recarregar; (c) reaproveitar o motor de `/apresentacao/empresas`; (d) não construir e só melhorar o PDF. Requisitos que valem para qualquer ramo: um slide por ideia; teclado (setas, Home/End, `F` para tela cheia, `Esc`), hash por slide (`#slide-7`), indicador de progresso, foco gerenciado, sem "scroll hijacking" que prenda o leitor; **celular vira vertical** (slide horizontal em 320 px é pior que rolagem); `prefers-reduced-motion` troca transição por corte; impressão continua linear; o conteúdo vem da mesma fonte. Prove o ganho (o fundador pediu): protótipo de dois slides lado a lado com a leitura vertical.

**D3 · Imagens cinematográficas, faixas e transições (P3).** Ramos: (a) imagens **geradas** hiper-realistas com direção de arte única; (b) ilustração editorial vetorial; (c) fotografia licenciada; (d) sistema misto (gerada nas faixas, vetor nos diagramas). Entregue: **inventário de 6 a 8 imagens** com função, posição, proporção, recorte mobile e **brief completo** (Anexo C); modelo de **faixa de seção** (imagem de fundo ou lateral + título + resumo + sobreposição que garante contraste ≥ 4,5:1); catálogo de **transições** (entrada de bloco por fade/translate curtos, ≤ 450 ms, uma única curva; troca de slide; contador). Orçamento de peso (hero ≤ 180 KB em AVIF/WebP, demais ≤ 120 KB, `srcset`, `loading="lazy"` abaixo da dobra, `fetchpriority` só no hero), LCP ≤ 2,5 s e CLS ≤ 0,1 medidos, **nenhum texto essencial dentro da imagem**, fallback quando a imagem falhar. Responda de forma direta à pergunta do fundador ("ficaria bom?") com **um mock** e **os riscos** (vale-do-estranho, banco de imagem, dependência de gerador). Você não tem gerador de imagem nesta sessão: se precisar de pixels, entregue os briefs e declare que as imagens serão geradas por ferramenta aprovada, com procedência registrada no padrão da V4.

**D4 · Cronograma de 3 meses (P4).** Ramos: (a) faixa horizontal de 15 meses (5 × 3) com zoom por etapa; (b) uma linha do tempo de 12 semanas **por etapa**, em abas/acordeão; (c) raias por perfil (Direção, RH, SST, Liderança, Tecnologia, Instituto) × semanas; (d) tabela simples acessível. Confirme antes: duração real de Q5; se as etapas são sequenciais ou sobrepostas; quem está ocupado em cada mês. Regras: calendário **relativo** (Mês 1, Mês 2, Mês 3), nunca datas de calendário; barras tracejadas para o que é **condicionado** (por exemplo, coleta do Q1); marco de aceite e parcela no fim de cada etapa; toda estimativa de encontros e horas marcada como **proposta**; **alternativa em tabela** para leitor de tela e impressão; sem ícone que prometa resultado. Valide a leitura com o "teste do corredor": alguém de RH explica o mês 2 do Q2 olhando 20 segundos.

**D5 · Apresentação do preço (P5).** Ramos: (A) total em destaque (estado atual); (B) **parcela por marco em destaque** ("5 × R$ 12.000", com "cerca de R$ 4.000 por mês" como equivalente) e o total no bloco de investimento e na tabela; (C) total só no fim. Critérios extras: **compras** acha o total em até 10 segundos?; coerência entre resumo, detalhamento, tabela de marcos e PDF (um teste automatizado compara todos os valores à fonte única); linguagem sem "apenas/só". Mostre à direção a conta: 12.000 ÷ 3 = 4.000, **rotulado como equivalente derivado, não preço**. VETO se o total ficar escondido, se aparecer cobrança mensal que não existe, ou se a duração de 3 meses por etapa não estiver confirmada.

**D6 · Equipe executora (P6, P12) · desbloqueada.** Ramos: (a) cartões com foto, nome, papel e **bio resumida de até 45 palavras** (Anexo H); (b) faixa compacta "Quem conduz" só com nome, papel e uma linha; (c) bloco do Instituto em texto, sem fotos, até o fundador confirmar o mapa foto → pessoa. **Como o foco da página são os números, a bio é curta de propósito**: uma linha de credencial + um fato verificável de atuação. Conteúdo **só** do Anexo H (derivado dos textos colados). Os papéis na proposta são três (coordenação científica e análise; educação e facilitação; implantação e engajamento): a ligação pessoa → papel é **proposta para cada pessoa confirmar**. Foto: das cópias locais de `src/assets/proposal/team/`, sem edição do original; versões otimizadas e recortadas em retrato fechado (a foto-3 tem marca de evento de terceiros ao fundo e **precisa de recorte**); `alt` descreve a função ("Cofundador(a) do Instituto"), não a pessoa; sem metadados; **sem nome ao lado do rosto até a confirmação do mapa**. Linguagem neutra quanto a gênero, salvo o que a própria pessoa escreveu. Mostre o cartão com o estado "foto aguardando confirmação" (4 estados do projeto).

**D7 · Base científica (P7, P11).** Ramos: (a) selo "chancelado" (**VETO, ramo morto**: registre a poda e o motivo); (b) faixa "Ancorado na literatura" com cartões por fonte/instrumento e ícone, cada um com status honesto; (c) quadro "Como a ciência entra em cada etapa" (Q1…Q5 → mecanismo → atividade → limite); (d) combinação de (b) e (c). **Liberado pelo fundador em 23/11/2026:** a afirmação "ancorado em evidências sistematizadas no Work Wellbeing Playbook (mais de 3.000 estudos, Guia Prático, 12 fatores)". Mostre os **12 fatores** só se o registro os trouxer com autorização; não reproduza a figura do Playbook (CC BY-NC-ND). Um cartão por referência: Playbook (ancoragem das intervenções de Q2 e Q3), PERMA (modelo de bem-estar), VIA-T (forças, **exploratório, não diagnóstico**), FIB (pesquisa e filosofia que o Instituto aplica; **não confundir com o FIB-T do Q2**), instrumento psicossocial de Q1 (origem em Copenhague, **claim a registrar**; coleta condicionada). Respeite o orçamento de evidência do projeto (atividade = 1 mecanismo + 1 estudo principal + até 2 complementares; trilha = 2 a 6 âncoras; **nada de tela-bibliografia**). Todo status científico sai de `buildPassport()` e todo texto comercial passa pelo Commercial Claims (registrar o claim novo, com `claimId`, superfície, fonte primária, validade e variante, e atualizar os testes do registry e do scanner). Ícones: um por referência (Playbook; PERMA; VIA; FIB; instrumento psicossocial de Q1), sempre com texto, nunca só ícone.

**D8 · Prova e números (P10) · liberada.** Ramos: (a) contadores animados em faixa própria; (b) faixa estática com fonte e data; (c) só números do Registry; (d) nada. Regras: dois blocos **separados** e rotulados — **"O que o Instituto já fez"** (110 mil respostas, 219 municípios, 700 instituições de ensino, 1.300 projetos escolares, com a redação da tabela 4.2 e o rótulo "Dados do Instituto, confirmados pelo fundador em 23/11/2026") e **"O que a literatura mostra"** (os quatro do Registry, correlacionais, instituição e ano); nunca no mesmo quadro nem lado a lado como se um provasse o outro. **Ponte honesta entre os dois:** uma frase "Esta é a experiência do Instituto em pesquisa e mobilização em larga escala; esta proposta a aplica ao ambiente de trabalho". Contagem animada respeita movimento reduzido (mostra o valor final), tem `aria-label` com valor e unidade; sem comparação com concorrente; "recorde" nas condições da seção 4.3. **Teste do leitor cético (RH, SST, compras):** "esses números dizem algo sobre o que a ISG vai receber?" A página tem de responder "não diretamente".

**D9 · Caso externo (P8).** Ramos: (a) faixa de caso com título, resumo e práticas (reuso do conteúdo V4); (b) citação em linha na faixa de ciência; (c) omitir. Reuse **apenas** o que a V3/V4 já aprovou. Rotule "caso externo descrito pela empresa e por publicação". Sem logo. Sem "valida". Confirme com o fundador se "Haiku" é Heineken.

**D10 · Paleta do Instituto (P9).** Ramos: (a) Instituto como identidade primária (tokens FPT nos acentos e faixas, VitalOS mantendo seus tokens nas áreas da plataforma); (b) ponte: usar a paleta do Instituto só em ilustrações e acentos Q1–Q5; (c) manter só verde e dourado atuais. Regra do projeto: **tokens oklch em `src/styles.css`, nunca hex solto em componente.** Converta os valores do Anexo B para oklch, **escopados** a `.proposal` (por exemplo `--fpt-cyan`), em claro e escuro, e registre o contraste medido. **Amarelo, ciano e verde claros não servem como texto sobre branco** (razões 1,5 a 2,9); use-os como preenchimento, borda ou sobre fundo escuro. Para texto sobre branco: ciano profundo (4,81:1) e magenta (5,13:1). Mapeie Q1–Q5 a cinco acentos e prove que a página continua coerente com a VitalOS (comparação lado a lado).

**D11 · Estrutura, UX, conversão e responsividade (P13).** Ramos de **arquitetura de página**: (a) manter a ordem atual e inserir os blocos novos; (b) reordenar para "tese → prova → como → quando → quanto → quem → próximo passo"; (c) dois níveis (resumo de 2 minutos + dossiê). Âncoras da navegação: manter Jornada, Entregas, Investimento, Próxima conversa; avaliar acrescentar Cronograma, Ciência e Equipe sem passar de 6 itens no celular. **Um CTA primário** ("Combinar a reunião de implantação"), repetido em no máximo três pontos, mesmo destino. Breakpoints verificados: **320, 360, 390, 768, 1024, 1280, 1440, 1920, 2560**; paisagem no celular; zoom de 200% e fonte grande; alvo de toque ≥ 44 px; foco visível; contraste AA em claro, escuro e alto contraste; sem rolagem horizontal da página; impressão com todo o conteúdo expansível aberto.

**D12 · Benchmark de boas práticas.** Antes de decidir D1–D11, monte um **quadro de benchmark com fontes reais, abertas e datadas** (não de memória): WCAG 2.2 (nível AA) e WAI-ARIA Authoring Practices (disclosure, tabs, carrossel); Core Web Vitals (LCP, INP, CLS); heurísticas e pesquisa de usabilidade da Nielsen Norman Group (divulgação progressiva, leitura em F, escaneabilidade); orientações de apresentação executiva e de proposta B2B (resumo executivo, clareza de preço, um próximo passo); prática de impressão em CSS. Para cada fonte: o que se adotou, o que se rejeitou e por quê. **Se não conseguir abrir a fonte, escreva "não verificado" e não a cite.** "Neuromarketing" entra só como orientação editorial (familiaridade, contraste entre cenários, exemplo memorável, passo de baixo esforço); **proibido** qualquer alegação sobre cérebro, medo regulatório, urgência artificial, escassez ou prova social inventada.

---

## 8. Entregáveis da Fase 1 · "Pacote para o Comitê"

Um documento único em `docs/vitalos/proposta-isg/V2/PACOTE_COMITE_V2.md`, mais anexos, contendo, **nesta ordem**:

1. **Sumário executivo (1 página):** o que muda, por quê, o que **não** muda, o que depende do fundador.
2. **Mapa de claims** (tabela): cada afirmação nova → classificação (**fato verificado / hipótese para a reunião / condição comercial proposta / exemplo**) → fonte e data → `claimId`/superfície (ou "a registrar") → status. Inclua os itens barrados e o motivo.
3. **Fichas ToT** de D1 a D12 (formato da seção 7), com a matriz de notas e as podas.
4. **Wireframes de baixa fidelidade** (ASCII ou HTML estático descartável) para: faixa de abertura nova; faixa de seção com imagem; cronograma de 3 meses (mobile e desktop); bloco de preço; bloco de equipe (com campos vazios); faixa de ciência; slide-tipo.
5. **Inventário de imagens** e briefs (Anexo C), com orçamento de peso.
6. **Tabela de tokens** da paleta (Anexo B) em oklch, com contraste medido por par.
7. **Plano de ondas** com dependências, esforço relativo e o que cada uma entrega de valor sozinha. Sugestão de partida (ajuste com evidência):
   - **Onda A · Verdade e tese:** D1, D9, D7 (claims registrados e faixa de ciência).
   - **Onda B · Tempo e preço:** D4, D5.
   - **Onda C · Marca, prova e pessoas:** D10, D8, D6 (estrutura, sem conteúdo de pessoa).
   - **Onda D · Imersão:** D3 e D2 (imagens, faixas, transições, modo apresentação).
   - **Onda E · Qualidade:** D11 completo, impressão, medição de performance, ficha V2.
8. **Plano de testes:** o que será automatizado (preço = fonte única; ausência de termos vetados com o scanner; ordem das âncoras; foco; ausência de rolagem horizontal; impressão com detalhes abertos) e o que será manual (leitor de tela, dispositivos reais, impressão).
9. **Registro de riscos** (probabilidade × impacto × mitigação) e **"o que não será feito"** (com o motivo).
10. **Perguntas ao fundador** (seção 10), objetivas, com opção recomendada.
11. **Autoavaliação prévia pela rubrica** (seção 9), **rotulada como simulação editorial**, não como feedback real.

Termine o pacote com a linha `AGUARDANDO APROVAÇÃO DO SUPERCOMITÊ` e **não implemente**.

---

## 9. Supercomitê, rubrica de avaliação e vetos

**Composição simulada** (você a usa para se autoavaliar; o comitê real a usa para aprovar): (1) diretor de criação com 40 anos de agência de comunicação institucional; (2) estrategista de narrativa e marca B2B; (3) pesquisador pós-doutor em psicologia positiva e ciência do bem-estar; (4) especialista em acessibilidade (WCAG 2.2, leitores de tela); (5) designer de UX/IX e pesquisador de usabilidade; (6) responsável de crescimento B2B (conversão ética); (7) engenheiro-chefe de front-end e performance; (8) jurídico/LGPD e compliance de claims; (9) comprador/compras corporativas; (10) RH e SST de uma empresa de tecnologia; (11) revisor-IA adversarial de claims; (12) revisor-IA de acessibilidade e responsividade.

**Rubrica** (0 a 5 por dimensão; aprovação exige **média ≥ 4,3 e nenhuma dimensão < 4,0**):

| Dimensão | O que o comitê procura |
|---|---|
| 1. Estratégia e narrativa | Tese clara, arco de persuasão, pergunta de abertura honesta, tom adulto, sem jargão como drama |
| 2. Clareza executiva | Em 2 minutos: o que recebe, quanto investe, o que o Instituto entrega, qual a contribuição da ISG |
| 3. Conversão ética | Um próximo passo de baixo esforço, preço transparente, zero pressão artificial |
| 4. Veracidade e claims | Toda afirmação classificada, fonte e data; nada barrado; maturidade de Q1–Q5 preservada |
| 5. Base científica | Ancoragem atribuída (sem chancela), orçamento de evidência, status honesto |
| 6. Design e marca | Sistema visual coerente, paleta do Instituto com contraste, hierarquia, ritmo, "premium corporativo humano" |
| 7. UX/IX e usabilidade | Navegação, âncoras, divulgação progressiva, estados vazio/carregando/erro, microcopy de confiança |
| 8. Responsividade | 320 a 2560 px, paisagem, zoom 200%, toque ≥ 44 px, sem rolagem horizontal |
| 9. Acessibilidade | WCAG 2.2 AA: teclado, foco, contraste, movimento reduzido, leitor de tela, alternativa textual a todo gráfico |
| 10. Performance | LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1, orçamento de imagens |
| 11. Imprimibilidade e circulação | PDF legível com o essencial, sem termos comerciais em metadados públicos, acesso restrito íntegro |
| 12. Engenharia | Fonte única, testes, gate verde, diff mínimo, nada de hex solto, nada duplicado |

**VETOS** (qualquer um reprova, independentemente da nota): afirmação inventada ou não registrada; "chancela/validação/endosso" de terceiros; "recorde mundial" **sem a definição** (pesquisa FIB, contextos educacionais) ou usado como selo/superlativo geral; "700 organizações" no lugar de "700 instituições de ensino" sem confirmação do fundador; número de mercado barrado; preço inconsistente entre superfícies ou total não localizável; promessa de ROI, efeito, conformidade ou economia; capacidade condicionada apresentada como pronta; nome ao lado de rosto sem confirmação do par; cargo público ou nome de instituição-halo em bio; foto, nome ou bio de pessoa sem a autorização do fundador; imagem gerada sem rótulo ou sugerindo pessoas reais; logo ou selo de terceiro; falha de acessibilidade AA; rolagem horizontal de página a partir de 320 px; push, PR, publicação ou mudança no Lovable sem "sim" explícito; leitura do Playbook em tarefa de implementação.

---

## 10. Perguntas ao fundador (faça-as uma vez, juntas)

**Já respondidas em 23/11/2026 (não pergunte de novo):** dados do Instituto confirmados (4.2); Playbook liberado como "ancorado em", edição Guia Prático, 3.000+ (4.5); bios resumidas (Anexo H); fotos autorizadas (4.4); "desbloqueie essas questões" (4.0). A senha da proposta também já foi definida pelo fundador, fora do código.

**Ainda abertas** (a resposta muda o desenho; as quatro primeiras bloqueiam a parte de equipe e números na Fase 2):

1. **Mapa foto → pessoa.** Confirmar por escrito: `equipe-foto-1` = Olga Mariano? `equipe-foto-2` = João Paulo Brandão Barboza? `equipe-foto-3` = Ana Paula Daltoé Inglêz Barbalho? (A proposta vem do tamanho dos arquivos, não de reconhecimento de rosto.)
2. **"700 organizações" ou "700 instituições de ensino"?** O site diz "organizações"; os cofundadores dizem "instituições de ensino". Padrão desta revisão: "instituições de ensino".
3. **Cargo público e instituições-halo nas bios.** Confirmar o padrão (ficam fora das bios): cargo atual de uma cofundadora em órgão federal, funções em conselhos e comissões, e nomes como Yale, MIT e Harvard.
4. **Edição do Playbook.** Confirmar que o número citado é "mais de 3.000 estudos, Guia Prático de Bem-Estar no Trabalho". Se quiser o "mais de 4.000" do Playbook 2.0, trazer a fonte da edição.
5. **Frase de abertura:** qual tese-ramo explorar primeiro (a, b, c, d ou **e, dos quatro pilares do Instituto**)? Quer 3 variações de cada?
6. **Durações:** cada etapa dura 3 meses, **inclusive o Q5**? Sequenciais (15 meses) ou sobrepostas? Os R$ 60.000 cobrem todos os meses?
7. **Preço:** autoriza o ramo B (parcela por marco em destaque, equivalente mensal e total visível no bloco de investimento)? Fatura-se por marco aceito?
8. **Caso:** "Haiku" é o caso **Heineken** já usado na outra apresentação?
9. **Imagens:** há ferramenta e permissão para gerar as imagens? Quem aprova? Rótulo "Ilustração gerada" em cada faixa ou nota única?
10. **"Sistema ESG 9.17":** o nome pode aparecer nesta proposta? Quanto de ESG o Instituto quer prometer? (Recomendação: horizonte, não entrega.)

---

## 11. Regras de execução da Fase 2 (só depois do "APROVADO")

- Branch nova por onda (`feat/proposta-v2-<onda>`), commits pequenos e descritivos, **commit local apenas**. Nada de push/PR/publicação/Lovable sem "sim" do fundador. Não use `git stash` simples; não troque a branch de outro worktree.
- Antes de cada commit: `bun run gate` verde, ESLint e Prettier limpos nos arquivos tocados. Se alterar rota, regenere `src/routeTree.gen.ts` pelo plugin.
- **Verifique no navegador de verdade** (não só testes): 9 larguras da seção 7/D11, teclado completo, foco, contraste medido, movimento reduzido, modo escuro, impressão (PDF gerado com Chrome sem interface, como na ficha atual), peso e Core Web Vitals. Capture telas antes/depois.
- Meça, não suponha: registre os números de LCP/CLS/peso por onda. Meça também a **rolagem horizontal** (`scrollWidth` = largura da janela).
- Cada afirmação nova entra no Commercial Claims Registry e passa pelo scanner **antes** de aparecer. Atualize os testes que travam termos vetados.
- Atualize a ficha de revisão (versão V2): fontes e datas, termos pendentes, resultados verificados, o que **não** foi verificado (leitor de tela, Safari/iOS, ambiente publicado).
- Ao terminar cada onda, pare, resuma em 5 linhas, e espere o próximo "APROVADO".

---

## 12. Primeira resposta esperada de você

1. Confirme, em 6 linhas, o que leu e a base (`cd3feae`).
2. Entregue o **quadro de reconhecimento** (o que reaproveita × o que é novo) e as **perguntas da seção 10** em uma única mensagem.
3. Com as respostas (ou com as suposições declaradas, se o fundador mandar seguir), produza o **Pacote para o Comitê** e **pare no portão**.

---

# ANEXOS

## Anexo A · Fontes e datas

| Item | Fonte | Consultado |
|---|---|---|
| Site do Instituto (missão, números, ausência de página de equipe, ausência de fonte do recorde) | `https://www.felicidadeparatodos.com.br/` | 23/11/2026 |
| Cores da marca | `https://www.felicidadeparatodos.com.br/assets/index-B-UhTcj8.css` (variáveis CSS) | 23/11/2026 |
| Perfis LinkedIn | leitura automática **bloqueada (HTTP 999)**; textos "Sobre" **colados pelo fundador** no chat | 23/11/2026 |
| Fotos da equipe | três arquivos enviados pelo fundador; cópias em `src/assets/proposal/team/` (`PROCEDENCIA.md`) | 23/11/2026 |
| Confirmação dos dados do Instituto, liberação do Playbook como "ancorado em", bios resumidas, fotos | declarações do fundador no chat | 23/11/2026 |
| Resumo do Playbook | texto colado pelo fundador (Guia Prático); página `wellbeing.hmc.ox.ac.uk/publications/work-wellbeing-playbook/` **não foi lida** (regra do projeto) | 23/11/2026 |
| Números de mercado liberados | `docs/vitalos/decisions/PRESENTATION_V3_USER_NUMBERS_2026-11-17.md` e Commercial Claims Registry 1.1.0 | 23/11/2026 |
| Termos vetados | `src/domain/commercial-claims/commercial-claims-scanner.test.ts` | 23/11/2026 |
| Maturidade de Q1–Q5 | `docs/vitalos/piloto/*` | 23/11/2026 |
| Instrumento Q1 | `docs/vitalos/decisions/Q1_COPSOQ_FORMA_ADOTADA_2026-11-20.md` | 23/11/2026 |

## Anexo B · Paleta do Instituto (extraída do CSS do site) e contraste

Os valores HSL vêm do CSS; o hexadecimal e os contrastes foram calculados em 23/11/2026 (WCAG, luminância relativa). **Converta para oklch nos tokens; não use hex em componente.**

| Nome no site | HSL | Hex (calc.) | Contraste sobre branco | Sobre escuro `#181a21` | Uso permitido |
|---|---|---|---|---|---|
| `--brand-cyan` | 182 98% 40% | `#02c3ca` | 2,17 | 7,99 | Preenchimento, borda, ilustração; texto **só** sobre escuro |
| `--primary` (cor primária do site) | 182 90% 38% | `#0ab2b8` | 2,60 | 6,68 | Idem |
| `--teal` / primária escura | 182 98% 26% | `#017f83` | **4,81** | 3,61 | **Texto e botão sobre claro** |
| `--brand-green` / `--sage` | 104 60% 42% | `#4dab2b` | 2,93 | 5,94 | Preenchimento e ícone; texto só sobre escuro |
| `--brand-magenta` / `--coral` | 336 81% 46% | `#d41662` | **5,13** | 3,38 | **Texto e destaque sobre claro**; sobre escuro só como preenchimento |
| `--brand-yellow` / `--gold` | 47 99% 56% | `#fece20` | 1,49 | 11,64 | Preenchimento e realce; texto **só** sobre escuro |
| `--gold-dark` | 47 99% 46% | `#e9b701` | 1,87 | 9,30 | Idem |
| `--brand-dark` | 222 16% 11% | `#181a21` | 17,38 | — | Texto e fundo escuro |
| `--brand-ink` | 220 15% 8% | `#111317` | 18,59 | — | Idem |

Observações: o logo do Instituto combina magenta, ciano, verde e amarelo sobre fundo claro; no cabeçalho ele deve ficar sobre superfície branca (já é assim). Para os acentos Q1–Q5 sugere-se começar por: Q1 ciano profundo, Q2 verde, Q3 amarelo (com borda escura para o texto), Q4 magenta, Q5 escuro; **valide** no navegador (contraste de cada par) e justifique a escolha na ficha D10.

## Anexo C · Briefs de imagem (direção de arte única)

**Princípios:** fotografia cinematográfica realista, luz de estúdio suave e direcional (key light grande lateral tipo janela, preenchimento sutil, separação do fundo), paleta quente e neutra com verde profundo e toques de **ciano e dourado** do Instituto, profundidade de campo moderada, pele e mãos naturais, figurino profissional contemporâneo e diverso (idades, tons de pele e corpos variados), expressões engajadas e naturais. **Sem** logotipos, **sem** texto legível, **sem** telas legíveis, **sem** marcas, **sem** rostos que lembrem pessoas conhecidas, **sem** aparência de "banco de imagem", **sem** ficção científica, **sem** hologramas. Pessoas **fictícias**. Enquadre as faces dentro de 65% central para permitir corte vertical no celular. Entregar em 16:9 e 4:5, com área limpa para título.

| # | Função | Cena (resumo) | Observação |
|---|---|---|---|
| 1 | Hero / tese | Equipe diversa de tecnologia em conversa de trabalho, luz natural de janela, mesa com cartões em branco e cadernos | Evitar aparência de "equipe da ISG": ambiente neutro, sem identidade visual |
| 2 | Escuta (Q1) | Pessoas ouvindo uma colega falar, postura aberta, foco no rosto de quem escuta | Sem teclado ou tela legível |
| 3 | Prioridade e ação (Q2) | Duas pessoas organizando cartões numa parede/mesa, mão apontando uma ordem | Cartões sem texto |
| 4 | Devolutiva (Q2) | Líder explicando a uma equipe em círculo informal, quadro branco desfocado | Sem gráficos legíveis |
| 5 | Prática (Q3) | Pausa guiada, pessoas em movimento leve e respiração, ambiente claro | Sem sugerir tratamento ou terapia |
| 6 | Forças (Q4) | Pessoa sozinha anotando em caderno, luz lateral, expressão reflexiva | Reforça privacidade |
| 7 | Consolidação (Q5) | Reunião executiva ao redor de uma mesa, documento em branco | Direção diversa, sem hierarquia caricata |
| 8 | Ciência (opcional) | Mãos folheando um caderno de anotações e cartões sobre madeira, plantas ao fundo | Sem capa de livro ou logo |

**Procedência obrigatória** (padrão da V4): registrar em JSON, por imagem, a ferramenta, o prompt, o arquivo original, as dimensões, a conversão e a data; rótulo visível **"Ilustração gerada · pessoas fictícias"**; `alt` que descreve a função, não identifica ninguém; peso dentro do orçamento da D3.

## Anexo D · Modelo de ficha de pessoa da equipe executora (preenchida pela própria pessoa)

```
Nome como deseja ser apresentado(a): ____________________
Papel na proposta (escolha um ou mais; a ISG verá estes rótulos):
  ( ) Coordenação científica e análise
  ( ) Educação e facilitação
  ( ) Implantação e engajamento
Bio (até 60 palavras, escrita ou aprovada por você; sem superlativos não comprováveis): ____
Formação/instituição que deseja citar (opcional; só o que você pode comprovar): ____
Link público que deseja exibir (opcional): ____
Foto (arquivo enviado por você, mínimo 800×800): ____
Autorizo o Instituto Felicidade para Todos a usar meu nome, minha foto e este texto
na proposta à ISG Participações, por tempo limitado ao ciclo desta negociação, e a
retirar o conteúdo a meu pedido.  Data: ____  Assinatura/confirmação por escrito: ____
```
Regras: base legal e finalidade descritas no termo; prazo; direito de revogação; nenhum dado além dos listados; imagem armazenada localmente; metadados removidos; **nunca** raspar perfil de rede social.

## Anexo E · Frases de abertura candidatas (ponto de partida; teste e melhore)

Critérios: cabe em duas linhas a 320 px; não promete; não usa jargão como drama; traduz ciência, sistema e crescimento sem acumular quatro ideias; ESG só como horizonte.

- **(a) Ciência aplicada:** "Ciência da felicidade aplicada ao trabalho: do que as equipes dizem ao que a empresa decide" 
- **(b) Sistema:** "O sistema operacional da vitalidade organizacional, em implantação acompanhada"
- **(c) Crescimento sustentável:** "Pessoas que florescem, empresas que crescem, decisões que se podem acompanhar"
- **(d) Continuidade:** manter "Da escuta das equipes às decisões que a empresa consegue acompanhar" e deslocar a ciência e o ESG para o **subtítulo** ("Ciência do bem-estar no trabalho, em cinco etapas, com entregas verificáveis e registros que podem alimentar o relato de sustentabilidade").

Subtítulo atual, a manter ou ajustar com justificativa: "O Instituto Felicidade para Todos propõe à ISG uma implantação acompanhada da jornada VitalOS, com cinco etapas, entregas verificáveis e uma contribuição técnica desenhada em conjunto."

## Anexo F · Termos e padrões que devem falhar no scanner

"chancela", "chancelado", "validado por Oxford", "endossado", "garantido", "ROI", "retorno garantido", "diagnóstico científico", "bateria COPSOQ", "conformidade com a NR-1", "evita multa", "blindagem", "recorde mundial" (sem a definição "pesquisa FIB, contextos educacionais"), "700 organizações" (no lugar de "instituições de ensino", sem confirmação), "mais de 3.000/4.000 estudos" (sem a edição "Guia Prático" ou "Playbook 2.0"), "parceria com Oxford", "Oxford recomenda", cargo público ou conselho em bio, "apenas R$", "só R$", "últimas vagas", "oferta por tempo limitado", e qualquer percentual de mercado que não esteja no Registry.

## Anexo G · Checklist de verificação (marque no pacote final)

- [ ] Total (R$ 60.000) localizável em ≤ 10 s; igual em resumo, marcos, bloco de investimento e PDF; equivalente mensal rotulado como derivado
- [ ] Cronograma tem alternativa em tabela e marca o que é condicionado
- [ ] Nenhum claim novo sem `claimId`, fonte e data; scanner verde
- [ ] "Ancorado na literatura" (nunca "chancelado"); edição e número de estudos do Playbook conferidos
- [ ] Números do Instituto com a redação da tabela 4.2 (educação; "instituições de ensino"; "respostas") e o rótulo "confirmados pelo fundador em 23/11/2026"; "recorde" só como declaração **com definição**
- [ ] Ponte honesta entre "o que o Instituto já fez" e "o que a literatura mostra" presente; os dois blocos separados
- [ ] Equipe só com as bios do Anexo H; nome ao lado de rosto **somente** depois da confirmação do mapa foto → pessoa; nada raspado; sem cargo público nem instituições-halo
- [ ] Playbook: "ancorado em" + "mais de 3.000 estudos (Guia Prático)" registrado no Registry; zero "chancela"
- [ ] Imagens geradas rotuladas; procedência em JSON; pesos dentro do orçamento
- [ ] Tokens oklch da paleta; contraste medido por par; claro e escuro
- [ ] 9 larguras sem rolagem horizontal; paisagem; zoom 200%
- [ ] Teclado completo, foco visível, movimento reduzido, leitor de tela (manual)
- [ ] PDF com todo o conteúdo expansível aberto; metadados públicos neutros
- [ ] `bun run gate` verde; capturas antes/depois; ficha V2 atualizada
- [ ] Nada enviado, publicado ou mesclado sem "sim"

## Anexo H · Equipe executora: bios resumidas para aprovação (derivadas só dos textos colados em 23/11/2026)

**Regras desta seção:** cada frase abaixo existe nos textos "Sobre" colados pelo fundador; nada foi acrescentado. O texto das pessoas foi **encurtado**, não reescrito com novos fatos. Cargo público, funções em conselhos e comissões, redes políticas e religiosas e nomes de instituições-halo (Yale, MIT, Harvard) **ficaram de fora** (seção 4.4). Cada bio tem até 45 palavras. Pronomes só os que a própria pessoa indicou (uma indicou "ela/dela"); os demais textos usam o rótulo que cada pessoa usa para si.

| Pessoa | Rótulo (como se apresenta) | Bio resumida (rascunho) | Papel proposto* | Foto (a confirmar) | Fonte |
|---|---|---|---|---|---|
| **João Paulo Brandão Barboza** | Cofundador do Instituto · Cientista da Felicidade | Atua há mais de 12 anos entre Felicidade Interna Bruta (FIB), ODS e práticas ESG. Gestor de inovação no Instituto, lidera a estruturação do Sistema ESG 9.17.** Membro da Rede de Pesquisas Científica da Felicidade (RPCF). | Coordenação científica e análise | `equipe-foto-2.png` | Texto "Sobre" colado |
| **Ana Paula Daltoé Inglêz Barbalho** | Cofundadora do Instituto | Bióloga, advogada e graduanda em Ciência da Felicidade. Coordenou o projeto FIB 2030 (FIB e ODS no Brasil) e coliderou, em 2023, a pesquisa de felicidade escolar do projeto Estudantes de Atitude. | Implantação e engajamento | `equipe-foto-3.webp` | Texto "Sobre" colado |
| **Olga Mariano** | Cofundadora do Instituto · Facilitadora em FIB | Mais de 13 anos em inovação social, impacto comunitário e gestão de projetos. Facilitadora certificada em Teoria U e no Sistema FIB-Feliciência. Cocriou a Pesquisa FIB Educacional (110 mil respondentes) e coordenou a 1ª Pesquisa de Felicidade de Brasília-DF. | Educação e facilitação | `equipe-foto-1.png` | Texto "Sobre" colado |

\* **Papel proposto = hipótese** do autor do prompt a partir do que cada texto diz (ciência e método; escuta e participação; facilitação). **Cada pessoa confirma ou troca.** Um documento interno do projeto já aponta João Paulo como responsável metodológico, o que sustenta o primeiro par.
\** Só se a **pergunta 10** liberar o nome "Sistema ESG 9.17"; senão, usar "lidera a estruturação de soluções ESG do Instituto".
**Coluna "Foto":** mapa **proposto** (por tamanho de arquivo × URL de perfil), **não confirmado** (pergunta 1).

**Linha de introdução do bloco (sugestão):** "Quem conduz: três cofundadores do Instituto com atuação em pesquisa de felicidade, educação e projetos de impacto." Evite "especialistas reconhecidos", "referência nacional" e superlativos não documentados.

**O que ficou fora das bios e por quê**
- Cargos e funções em órgão público, conselhos, comissões e redes: risco de conflito de interesses e de associação política ou religiosa em material comercial.
- Certificações com nomes de universidades de prestígio e "inspirada em Harvard": efeito de halo/endosso.
- "Maior pesquisa de felicidade escolar do mundo" na bio: o superlativo vive **uma vez**, no bloco de números, com a definição (seção 4.3).
- Detalhes de formação e carreira não essenciais: o cartão é curto de propósito.

**Mensagem curta de confirmação por pessoa (use antes de enviar o link à ISG)**
> "Posso usar na proposta à ISG seu nome, esta foto e esta bio (≤ 45 palavras)? Fica restrita a esta negociação, você pode pedir a retirada a qualquer momento e nenhum outro dado seu entra. Responda 'sim, pode' ou envie o ajuste."

---

## Revisão 3 · 23/11/2026 (respostas do fundador e logos)

**Respondidas:** (2) **"700 instituições de ensino"** confirmado; (3) cargo público e instituições-halo **ficam fora das bios**; (4) **"mais de 3.000 estudos, Guia Prático"** confirmado para o Playbook. Baixe essas três da lista da seção 10. Entraram versões melhores das fotos: `equipe-foto-1-hd.webp` (1254 px), `equipe-foto-2-800.jpg`, `equipe-foto-3-800.jpg`. **O mapa foto → pessoa segue sem confirmação por nome** (os nomes de arquivo não chegaram); a pergunta 1 permanece aberta.

### 4.9 Logos de Oxford, Heineken e World Wellbeing Movement (decisão pedida pelo fundador)
O fundador pediu para considerar as três logos. Elas estão em **quarentena** em `src/assets/proposal/third-party-logos/` (não importadas por nenhum componente). **Conflito com as regras:** a V2/V3 e o scanner vetam logo de terceiro como selo, porque sugere parceria ou endosso; a licença CC BY-NC-ND do Playbook não cobre marcas; Oxford e Heineken costumam ter regras próprias de uso de marca.
**Ramos para a ToT (D7/D9):** (a) sem logos, só nomes em texto (estado atual, risco zero); (b) faixa discreta **"Fontes citadas"**, logos em escala de cinza, tamanho igual, legenda fixa "Fontes citadas nesta proposta. Sem parceria, patrocínio ou endosso"; (c) logos como selo de credibilidade (**VETO**).
**Condição mínima para o ramo (b):** uso nominativo, sem alteração de cor ou forma além do cinza, afastada de título e de preço, nunca no hero; **Heineken** só junto ao caso e **só com a fonte pública do caso**; pedir por escrito a autorização das marcas (ao menos World Wellbeing Movement, que mantém o Playbook) e registrar o retorno; se não houver retorno, cair para (a). **Recomendação do autor:** começar em (a) e promover a (b) com a autorização em mãos.
