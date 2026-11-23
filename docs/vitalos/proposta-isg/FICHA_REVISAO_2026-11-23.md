# Ficha de revisão · proposta do Instituto à ISG Participações

**Data:** 23/11/2026 · **Branch:** `feat/proposta-isg` (a partir de `origin/main` `929d9eb`) · **Estado:** prévia local verificada; **nada publicado, nenhum push, nenhuma mudança no Lovable**.

## 1. O que foi entregue

| Entrega | Onde |
|---|---|
| Proposta web por seções (rota) | `/proposta` · `src/routes/proposta.tsx`, `src/features/proposal/` |
| Conteúdo e preço, só no servidor | `src/lib/proposal/isg-content.server.ts` (fonte única do valor) |
| Porta de acesso (senha) | `src/lib/proposal/proposal-access.server.ts` + `src/routes/api.proposta.ts` |
| Prévia local isolada, sem banco | `scripts/proposal-local.ts` → `http://localhost:8094/proposta` |
| Versão de impressão | botão "Imprimir ou salvar PDF" na página; PDF gerado: `capturas/proposta-impressao.pdf` (A4, 16 páginas) |
| Capturas | `capturas/desktop-1440-*.jpg`, `capturas/celular-360-*.jpg`, `capturas/celular-320-*.jpg` |
| Roteiro de 5 minutos | `ROTEIRO_REUNIAO_5_MIN.md` |
| Testes | `isg-content.server.test.ts`, `proposal-access.server.test.ts`, `ProposalPage.test.tsx`, `path.test.ts` |

**Como abrir a prévia:** criar `.proposal.local/access.json` com um verificador `scrypt-v1` (o arquivo é ignorado pelo git; nesta máquina já existe, com a senha de teste em `.proposal.local/senha-previa-local.txt`, também ignorado) e rodar `bun scripts/proposal-local.ts`. A prévia não usa banco nem credenciais herdadas.

## 2. Decisão por árvore · formato

| Critério | Deck online linear | Landing page comercial | **Proposta web por seções** |
|---|---|---|---|
| Clareza executiva em ~2 min | Média: o valor só aparece no slide certo | Alta, mas resume demais | **Alta: bloco "Em dois minutos" logo após a abertura, com o valor visível** |
| Utilidade para revisão interna (RH, SST, compras) | Baixa: detalhe fica em notas ou some | Baixa: sem detalhe contratual | **Alta: "Como funciona", condições e responsabilidades sob demanda; impressão com tudo aberto** |
| Fidelidade ao escopo (condicionadas visíveis) | Média | Baixa: a forma empurra para promessa | **Alta: legenda de maturidade em cada etapa** |
| Acessibilidade | Média: navegação por slide, foco difícil | Alta | **Alta: documento linear, âncoras, `<details>` nativo** |
| Esforço | Médio (há um motor de deck no repo) | Baixo | **Médio, reaproveitando porta de acesso, tokens e marcas** |

**Escolha:** proposta web por seções. **Modo de apresentação:** não construído. A ordem das seções já é a sequência da reunião (ver roteiro) e as âncoras levam a cada parte; um modo de slides duplicaria conteúdo sem ganho comprovável e acrescentaria estados a testar.

## 3. Reconhecimento

- **Site oficial da ISG** (`https://www.isgsa.com.br/` e `/missao-visao-e-valores/`, consultados em 23/11/2026): a empresa se apresenta como "ISG Participações S.A.", holding de um grupo de empresas. A home cita gestão de "portfólios, projetos e processos", "Gerenciamento da Realização de Benefícios (BRM)", "Integração", painéis de Business Intelligence, gestão de pessoas e, num bloco sobre certificação de ambiente de trabalho, cultura organizacional. Não há termos de uso de marca nas páginas lidas. **Uso na proposta:** só o nome em texto; nenhum logo, selo ou imagem da ISG; o bloco de certificação não é citado (seria prova social de terceiros).
- **Apresentações existentes no repositório:** `/apresentacao/empresas` (deck empresarial genérico V4, protegido por senha; não é específico da ISG) e `/guia-empresarial` (guia da jornada). **Nenhuma foi alterada.** Reaproveitados: o mecanismo de acesso (`createPresentationHandler`, com cookie, caminho e escopo de assinatura próprios), os tokens oklch, `VitalOSBrand`, o logo do Instituto e uma ilustração gerada da V4. A única mudança em código existente é `src/features/presentation/path.ts`, que passa a reconhecer `/proposta` como página com porta própria (sem os provedores da demo), com teste.
- **ISG no histórico do repositório:** há documentos e fixtures "ISG Sintética" do trabalho FIB-T/HML, e `docs/vitalos/constitution/mission.md` registra a ISG como "registro histórico e fixture HML". **Nada disso foi usado** como dado, caso ou evidência na proposta.
- **Marcas:** "Instituto Felicidade para Todos" (logo completo original, `public/brand/instituto/`); VitalOS como plataforma (logo oficial `public/brand/vitalos/`, que traz o texto "Programa VitalOS"). No texto usei "VitalOS" sem ™ (ver termos pendentes).

## 4. Maturidade das etapas · conferida nas fontes internas

| Etapa | Como aparece na página | Fonte |
|---|---|---|
| Q1 · Preparar | Comunicado, controles e revisão de SST: disponível na plataforma. Coleta: condicionada (ficha oficial do instrumento e permissão de uso) | `piloto/MO3_LENTES_2026-11-21.md` (Q1 "só preparação", `method_pending`) |
| Q2 · Agir e devolver | Fluxos da jornada: disponível. Convite no ambiente publicado: condicionado | `piloto/CHECKLIST_LIBERACAO_PILOTO_Q2_2026-11-23.md` (T2 ✅ 54 verificações; T9 convite ponta a ponta "não testado") |
| Q3 · Praticar | Oficina: conduzida pelo Instituto. Prática na plataforma: condicionada (aprovação só local). Mensuração: fora | MO3 (Q3 "só prática educativa"; verificador de fonte recusa) |
| Q4 · Refletir e aplicar | Oficina e roteiro: conduzidos pelo Instituto. Roteiro na plataforma: condicionado; sem leitura coletiva | MO3 (prática Q4 do Codex fora da `main`, sem contrato de visão de equipe) |
| Q5 · Consolidar | Síntese e reunião: conduzidas pelo Instituto. Relatório da plataforma: condicionado, só extrato demonstrativo | MO3 (`cycle-report.ts` só modo `synthetic`) |
| Comum | "Verificar o convite de ponta a ponta no ambiente publicado antes de convidar as equipes" | CHECKLIST T6–T9; `CONTINUIDADE.md` |
| Dados | "Regra de guarda e descarte acordada antes do início da coleta" | CHECKLIST §3 (retenção e descarte pendentes, PIL-04) |

"Disponível na plataforma" significa: existe na versão atual e foi verificado em ambiente de teste. Nenhuma etapa foi descrita como pronta no ambiente publicado.

## 5. Afirmações e classificação

| Afirmação | Classificação | Fonte |
|---|---|---|
| Áreas que a ISG comunica (projetos, BRM, integração, BI, pessoas, cultura) | Fato verificado | isgsa.com.br, 23/11/2026 |
| Maturidade de Q1–Q5 e condição comum do convite | Fato verificado | Docs do piloto (seção 4) |
| Leitura coletiva só com ≥ 5 respostas; respostas individuais não entregues | Fato verificado | Regra do produto, CHECKLIST §3 (setor com 4 respostas não publica) |
| Pergunta de abertura e três dificuldades | Hipótese para a conversa | Missão do usuário |
| R$ 60.000, 5 × R$ 12.000 por marco, faturamento após aceite | Condição comercial proposta | Missão do usuário (faturamento após aceite: proposta de redação) |
| Quantidades (oficinas, mentoria, tamanho da unidade) e esforço interno por área | Condição comercial proposta | Estimativas desta proposta, a confirmar |
| 40 horas de contribuição técnica e três entregas | Condição proposta · ponto de negociação | Missão do usuário |
| Equipe de serviços tecnológicos, turnos, lista de passagem, cargo do responsável | Exemplo fictício | Construído para a proposta |
| Ilustração de abertura | Exemplo (imagem gerada, pessoas fictícias) | `docs/vitalos/artifacts/PRESENTATION_V4_IMAGES_2026-11-17.json` (asset `v4-agir.jpg`) |

## 6. Acesso e circulação

- **Restrita por padrão.** Conteúdo e preço saem só de `GET /api/proposta` depois da senha validada no servidor (scrypt, cookie HttpOnly `SameSite=Strict` com caminho `/api/proposta`, `no-store`, limite de tentativas, sessão de 90 minutos para caber uma reunião). A sessão da apresentação empresarial não abre a proposta (escopo de assinatura próprio; testado).
- **Metadados públicos neutros:** título "Proposta de implantação · Instituto Felicidade para Todos", `noindex, nofollow`, sem destinatário, valor ou termos (testado). A tela de senha não cita a ISG.
- **Para publicar** seriam necessários os segredos `VITALOS_PROPOSAL_VERIFIER` (formato `scrypt-v1`) e `VITALOS_PROPOSAL_ORIGIN`. Sem eles a página mostra "indisponível neste ambiente" e não carrega nada. **Não configurados em lugar nenhum.**

## 7. Termos pendentes · precisam de resposta do Instituto

1. ~~**Destino do CTA.**~~ **Decidido pelo usuário em 23/11/2026:** botão "Combinar a reunião de implantação" → âncora `#proxima-conversa` na própria página, com foco no título de destino. A seção pede resposta à mensagem original com duas opções de data e horário e diz que combinar a reunião não confirma contratação nem inicia o projeto. Sem link, formulário, contato ou agenda.
2. **Forma de circulação.** Confirmar senha própria (recomendado) e quem a envia; ou outra forma.
3. **Faturamento por aceite do marco** e prazo de aceite: redação proposta, não decidida.
4. **Quantidades e esforço interno** (2 oficinas de ~2 h, 4 mentorias de 1 h, horas por área): estimativas para a sessão de desenho.
5. **Regra de guarda e descarte dos dados:** decisão pendente do Instituto (controlador); a página só diz que será acordada antes da coleta.
6. **Imagem de abertura:** usei a ilustração gerada `v4-agir.jpg` (pessoas fictícias organizando cartões). A missão pede equipe de tecnologia em conversa; esta sessão não tem gerador de imagem. Substituir quando houver imagem original aprovada.
7. **Denominação:** "VitalOS" × "VitalOS™" × "Programa VitalOS" (texto do logo oficial) e o nome jurídico do Instituto no contrato.
8. **Condições do caso anonimizado** (o que entra, quem revisa) e confirmação de que nome, marca ou depoimento da ISG ficam fora.
9. **NR-1:** não citada de propósito. A página delimita o apoio à SST como educativo e de preparação, sem avaliação de riscos para fins normativos e sem conformidade. Se o Instituto quiser citar a norma, consultar antes as orientações oficiais do MTE e passar pela guarda `nr1-copsoq-defensibility-guard`.

## 8. Revisão por perspectiva · simulação editorial (não é feedback real)

| Perspectiva | Pergunta que traz | Onde a página responde | Depende de confirmação |
|---|---|---|---|
| Direção | O que recebo, quanto custa e o que preciso decidir agora? | "Em dois minutos"; "Investimento"; "Próxima conversa" | Calendário; patrocinador |
| RH | Quanto do meu tempo e o que as equipes vão viver? | "Responsabilidades" (tabela); "Entregas" › "Como funciona" | Esforço estimado; comunicado final |
| SST | Isso substitui meu trabalho ou o PGR? Quem vê dados individuais? | Q1 "Como funciona"; "Condições e limites" (ⓘ) | Escopo da revisão de SST no Q1 |
| Tecnologia | O que está pronto, o que é promessa e o que querem de nós? | Legenda de maturidade; "Condição comum"; bloco "40 horas" | Revisão de integrações; acesso ao ambiente |
| Compras | Valor fixo? Quando pago? Há custos escondidos? | Bloco de investimento com tabela de marcos; "Quantidades e termos" (ⓘ) | Faturamento por aceite; quantidades; guarda de dados |

## 9. Resultados verificados (navegador do app e Chrome sem interface, 23/11/2026)

| Verificação | Resultado |
|---|---|
| Sem sessão | Tela de senha; `GET /api/proposta` → 401 `{"state":"locked"}`; nenhum valor ou nome da ISG na página |
| Senha de teste local | Proposta carregada; sair (DELETE) volta à tela de senha |
| 320 px / 360 px / 1440 px | `scrollWidth` = largura da janela nos três (sem rolagem horizontal da página); a tabela de responsabilidades rola dentro do próprio contêiner |
| Localizar investimento | R$ 60.000 visível sem abrir painel: no resumo, no bloco de investimento e na tabela de marcos (5 × R$ 12.000) |
| Obrigações distinguíveis | Tabela "O que cada parte faz" (ISG por área × Instituto) e blocos lado a lado investimento × contribuição |
| Etapas condicionadas | Chip tracejado "Condicionado à liberação" em 7 capacidades; decisão comercial em "Como funciona" |
| CTA | "Combinar a reunião de implantação" leva à seção "Próxima conversa" (âncora interna, foco no título de destino); oculto na impressão, onde a instrução de resposta continua impressa. Ver seção 11 |
| Âncoras | Jornada, Entregas, Investimento e Próxima conversa param 120 px do topo, abaixo do cabeçalho fixo de 109 px (celular). Corrigido nesta sessão: o `scroll-padding-top` global somava com a margem local |
| Teclado e foco | Primeiro Tab mostra "Ir para o conteúdo"; Enter leva ao conteúdo e o Tab seguinte cai no CTA; anel de foco visível nos links da navegação; `<details>` nativo abre com Enter/Espaço |
| Contraste (WCAG AA) | 390 elementos de texto auditados em tema claro e escuro: 0 abaixo de 4,5:1 (3:1 para texto grande) |
| Movimento reduzido | Com `.a11y-reduce-motion` a rolagem passa a `auto` e as transições a ~0. Corrigido nesta sessão: o `html` global continuava suave |
| Impressão | PDF A4 de 16 páginas gerado com todos os `<details>` abertos; em mídia de impressão somem navegação, botões e imagem, e entra a linha "Circulação restrita · Proposta para conversa, não é contrato" |
| Sistema visual | Tokens oklch, serif nos títulos, mesmos padrões de cartão do Guia da Jornada; acentos Q1–Q5 com `--chart-1…5` |
| Testes e gate | ver seção 10 |

**Não verificado:** leitor de tela real; Safari/iOS; o diálogo de impressão do navegador do usuário (o evento `beforeprint` que abre os detalhes não foi exercitado; o PDF foi gerado abrindo-os antes); inspeção página a página do PDF (não há renderizador de PDF nesta máquina; o layout foi conferido por captura em mídia de impressão); ambiente publicado.

## 10. Gate

- `bun run gate` na branch: **4721 testes / 0 falhas** (400 arquivos), paridade de schema OK, `tsc --noEmit` limpo, varredura de segredos sem achados (artefato de build não incluído).
- Depois da formatação com Prettier dos arquivos novos: testes da proposta e da apresentação 39/0, `tsc` limpo, ESLint 0 erros nos arquivos tocados.
- `bun run build:ci` não roda nesta máquina: o preflight recusa porque o `.env` aponta para URL remota (comportamento esperado do guarda de ambiente, não do código). A prévia usa o mesmo Vite no sandbox inerte `scripts/proposal-local.ts`.
- `src/routeTree.gen.ts` regenerado pelo plugin do router (só as entradas `/proposta` e `/api/proposta`).

## 11. Ajuste do CTA · 23/11/2026

**Decisão do usuário:** botão "Combinar a reunião de implantação", destino na própria página (seção "Próxima conversa"), sem link, formulário, contato ou agenda.

**Mudança:**
- Texto do botão.
- Ícone de seta para baixo, que indica salto dentro da página.
- O clique (mouse ou Enter) rola até a seção e põe o foco no título "Reunião de implantação" (`tabIndex=-1`, anel de foco visível).
- O endereço passa a `#proxima-conversa`.
- A seção explica que basta responder à mensagem original com duas opções de data e horário.
- Em destaque, a seção diz que combinar a reunião não confirma a contratação nem inicia o projeto: valor, quantidades e condições continuam como proposta e estimativa até a aprovação das duas partes.

**Verificado no Chrome real sem interface, com teclas de verdade (Tab, Enter):**

| Cenário | Resultado |
|---|---|
| 320 px | Tab → "Ir para o conteúdo" → Enter → Tab: foco no CTA (`:focus-visible`, anel visível, 44 px de altura). Enter: foco no título de destino, com anel visível. A seção para a 120 px do topo, abaixo do cabeçalho de 109 px. Sem rolagem horizontal |
| 320 px com movimento reduzido | Mesmo fluxo; o salto é imediato (~0,3 s, contra ~1,7 s com rolagem suave) |
| 1440 px | Mesmo fluxo. A seção para a 216 px: é o fim da página, então não há como subir mais; o título fica inteiro abaixo do cabeçalho |
| Depois do destino | O próximo Tab segue para "Fontes e classificação", logo depois da seção |
| Impressão | CTA oculto. Título, objetivo, instrução de resposta e ressalva de não contratação aparecem na mídia de impressão; PDF regenerado |
| Ação sem depender de cor | Botão com texto, seta e forma de botão; destino com título, texto em negrito e ressalva com filete lateral |

Capturas: `capturas/cta-foco-celular-320.jpg`, `capturas/cta-destino-celular-320.jpg`, `capturas/cta-destino-desktop-1440.jpg`.

**Observação:** no painel de navegador do app a rolagem suave fica atrasada (quadros esparsos), o que afetou só as medições ali; a verificação de posição foi feita no Chrome sem interface.
