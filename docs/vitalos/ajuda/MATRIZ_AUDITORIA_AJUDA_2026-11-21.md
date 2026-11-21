# Matriz de auditoria · ajuda contextual · 21/11/2026

**Base:** `origin/main` @ `5e25fa1`. **Branch local:** `feat/ajuda-contextual-voz-segura`. **Ambiente:** servidor local em loopback, sem backend, com dados fictícios e portão de demonstração destravado só no navegador local.

**Tipos de verificação:**
- **N** · verificado no navegador;
- **E** · inspeção estática do código;
- **B** · bloqueado por depender de sessão institucional ou backend;
- **F** · fora do escopo desta onda.

## 1. Cobertura

- **Páginas declaradas:** 92 (inventário da v1).
- **Páginas auditadas nesta onda:** 10 com inspeção dirigida, sendo 3 também no navegador.
- **Pontos de ajuda decididos:** 14. Destes, 4 foram implementados.
- **Demais 82 páginas:** pendentes para as próximas ondas. A ordem está no §4.

**Papéis no código:**
- **Demonstrativos** (`vita-persona`, do pack enterprise): COLABORADOR, EMBAIXADOR, LIDER_EQUIPE, RH_ADMIN, CHRO, C_LEVEL, SST_PROFISSIONAL, CIPA_MEMBRO, HOLDING_ADMIN, entre outros.
- **Leitura da ajuda:** `helpRoleFromPersona` agrupa esses papéis em colaborador, liderança, RH, SST e direção.
- **Embaixadorias no menu:** COLABORADOR, EMBAIXADOR, RH_ADMIN e CHRO. A rota também abre por URL direta, sem guarda.

## 2. Pontos decididos

| # | Rota · componente | Perfil | Pergunta do usuário | Origem do dado · estado | Risco de leitura | Decisão | Fonte | Aceite | Ver. |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `/embaixadorias` · título da página | todos | "O que é uma embaixadoria? Participar me compromete?" | `AMBASSADORSHIPS` (mock) · adesão em estado React | Ler as contagens como dados da empresa; achar que Participar registra adesão | **Texto na tela** (aviso de demonstração) + **ⓘ junto ao título**. **Implementado** | Produto | O aviso aparece antes dos cards; ⓘ com nome "Como funcionam as embaixadorias?" | N |
| 2 | `/embaixadorias` · card Guardiões da Voz Segura | todos (5 leituras) | "Como funciona? Qual é meu papel? Onde confiro a fonte?" | mock · `members` 14 + adesão local | Ler como canal de denúncia; ler a adesão como real | **ⓘ no card** + diálogo em 3 camadas. **Implementado** | Produto, trilha `/voz-segura`, Manual MTE itens 6.2–6.3. Estudo TRU-006 **sem claim** para este contexto | Abrir e fechar preserva Participar; foco volta ao ⓘ; fonte abre | N |
| 3 | `/embaixadorias` · outros 14 cards | todos | Mesma dúvida geral do item 1 | mock | Baixo | **Nenhuma ação por card**: a ajuda do título cobre a dúvida. Uma ajuda própria só entra quando o card tiver prática distinta | — | — | E |
| 4 | `/embaixadorias` · contagem "N pessoas" | todos | "Esses números são da minha empresa?" | mock | Ler o número como real | **Texto na tela**: "pessoas no exemplo". **Implementado** | Produto | Rótulo visível em todos os cards | N |
| 5 | `/viat` · "Suas Forças Percebidas" | colaborador, liderança, RH | "De onde vêm as notas? O que é Força Assinatura? Quem vê?" | `MARINA_VIAT_RESULT` (fictício) · escala 0–10, faixas 8,5 / 7 / 4 | Ler o resultado fictício como seu; tomar o rótulo por diagnóstico | **Texto na tela** (origem fictícia) + **ⓘ** "Como ler este resultado?". **Implementado** | Produto (motor VIA-T). Seligman 2005 **fora do registro** | Rótulos do diálogo batem com `classifyStrength` | N |
| 6 | `/viat` · Visão da Equipe | liderança, RH, CHRO, C-Level | "Posso ver o resultado de alguém?" | `ORG_VIAT_RESULT` · n ≥ 5 | Usar a média para avaliar pessoas | **ⓘ com rótulo visível** ao lado do aviso coletivo. **Implementado** | Produto | Texto do papel cita n ≥ 5 e a proibição de uso decisório | E |
| 7 | `/expedicao` · "O antagonista da temporada" | todos | "Como a prioridade é definida? O que a tela pode concluir?" | demo do setor **ou** Cofre de Ciclos real | **Defeito:** em modo real, carregando ou falha apareciam como "sem exposição medida" | **Texto na tela** por estado (`expeditionReadState`) + **ⓘ** com o estado atual. **Implementado** | Produto + Manual MTE item 11.4.4 (p. 63–64) e item 12.2 (p. 77) | Os 6 estados têm teste unitário; o estado demo foi visto no navegador | N (demo) · E (real) · B (sessão real) |
| 8 | `/expedicao` · cabeçalho | todos | "O Manual do MTE fala de antagonista?" | texto fixo | Regra do produto atribuída ao Manual: "só cai com eficácia plena (Guia MTE 2026, 11.4.4)" | **Reescrita**: regra do VitalOS separada do que o Manual considera. **Implementado** | Manual MTE item 11.4.4 | O texto distingue as duas fontes | N |
| 9 | `/ivo-integral/preparar-q1` | RH, SST, colaborador | "A coleta já pode começar? O que comunico?" | servidor · `method_pending` | Tratar a coleta como liberada | **Texto na tela** já existente + **ⓘ** por papel (próxima onda) | Manual itens 6.2–6.3 e 17.1 + decisão Q1 | A condição real da coleta continua visível | E |
| 10 | `/ivo-integral/q2` · devolutiva de membros | membro, liderança | "Isso é resposta individual ou leitura do grupo?" | servidor · `MemberPlanFeedback` | Confundir leitura coletiva com resposta individual | **ⓘ** "O que esta devolutiva mostra" (próxima onda) | Produto | O texto distingue resposta, leitura e registro | E · B |
| 11 | `/ivo-integral/acoes` | liderança, RH | "Registrar execução prova efeito?" | servidor · capacidade + posse | Ler execução como efeito | **ⓘ** único "Como ler as evidências deste plano?", reaproveitando o texto da página (próxima onda) | Produto | Um só ponto de ajuda por plano | E · B |
| 12 | `/relatorio-global` e `/selo` | RH, direção | "Este resultado é da minha empresa?" | `@/mocks/*`, **sem** `DemonstrationContext` | Ler mock como resultado real | **Texto na tela**: estender `DemonstrationContext` com `global-report` e `seal` (próxima onda) | Produto | Origem visível antes do primeiro número | E |
| 13 | `/relatorios` | RH | "O selo foi concedido?" | mock · já tem `DemonstrationContext kind="reports"` | Já tratado | **Nenhuma ação adicional** | Produto | — | E |
| 14 | `/diario` e `/q3-demo` | colaborador | "Quem lê o que escrevo?" | navegador (seed + delta de sessão) | Achar que o registro é compartilhado | **Texto na tela** junto ao campo + **ⓘ** (próxima onda) | Produto | O texto diz onde o registro fica | E |

## 3. Mapa alegação → fonte → contexto

| Frase na ajuda (resumo) | Natureza | Fonte e localizador | Alcance |
|---|---|---|---|
| Embaixadoria é voluntária; sair não gera consequência | Como funciona no VitalOS | Texto da própria página ("Participar é voluntário, sair é livre") | Regra do produto |
| Contagens e adesão são de exemplo | Como funciona no VitalOS | `src/mocks/embaixadorias-mock.ts` e estado React da rota | Esta tela |
| A embaixadoria não substitui os meios formais de consulta e de comunicação em SST, como a CIPA | Orientação oficial | MTE, *Manual de interpretação e aplicação do capítulo 1.5 da NR-1* (2026), itens 6.2 (incluindo 6.2.1, CIPA) e 6.3, p. 23–24 | O Manual trata de consulta e comunicação. Ele **não** trata da embaixadoria |
| Mecanismo de segurança psicológica | Como funciona no VitalOS (link) | `/voz-segura`, Passaporte com `CLAIM-EDMONDSON1999-VOICE-001` | O claim vale **lá** (`evidencia-passaporte`), não no diálogo |
| Escala 0–10 e faixas 8,5 / 7 / 4; grupo com n ≥ 5 | Como funciona no VitalOS | `classifyStrength` e `minN = 5` em `src/engine/viat/viat-engine.ts` | Motor do produto |
| Prioridade vem do driver mais exposto | Como funciona no VitalOS | `rankDriversByExposure` + `selectSeasonAntagonist` | Regra do produto |
| Eficácia considera a hierarquia de prevenção e o funcionamento ao longo do tempo | Orientação oficial | Manual MTE, item 11.4.4, p. 63–64 | Frase do Manual em síntese. A metáfora não é dele |
| Implementação e acompanhamento das medidas | Orientação oficial | Manual MTE, item 12.2, p. 77 | Localizador |

**Conferência das fontes:**
- **Manual do MTE:** a página e o item foram localizados na cópia Markdown de consulta. O link oficial do PDF respondeu 200 (`application/pdf`) em 21/11/2026. A conferência página a página no PDF impresso fica com a revisão técnica de SST.
- **Playbook:** a referência de Edmondson (1999) aparece na lista Trust do Work Wellbeing Playbook 2.0 (licença CC BY-NC-ND 4.0). O Playbook serviu **só** para localizar a referência (GOV-01): nenhum trecho dele está no app.

## 4. Pendências e próximas ondas

| Pendência | Responsável | Efeito enquanto não decide |
|---|---|---|
| Claim do Edmondson (TRU-006) para `embaixadorias-ajuda` × colaborador, liderança e RH | Revisão científica (descongelamento formal do Claim Registry) | O diálogo mostra "estudo em revisão" e aponta para a trilha Voz Segura |
| Seligman et al. (2005), PMID 16045394, no Evidence Registry | Curadoria (verificação B2) | O VIA-T fica só com a fonte do produto |
| Revisão editorial do texto v0.1.0 | Produto + SST (itens que citam o Manual) | A linha "proposta em revisão humana" aparece no diálogo |
| Prova da Expedição com sessão real (0, 1 e 2+ ciclos) | Ambiente local autorizado com stack descartável | Coberto por teste unitário; no navegador, só o estado demo |
| Concierge (`z-[60]`) fica acima de todos os diálogos Radix (`z-50`) e cobre o botão Fechar no celular | Produto (decisão global de camadas) | Corrigido só no diálogo de ajuda (`z-[70]`). A sobreposição continua visível nos outros diálogos do app |
| "Guia MTE 2026" sem título oficial em `/evolucao-nr1`, `/plano-acao` e `/plano-nr1` | Produto + SST | Fora desta onda |
| `DemonstrationContext` ausente em `/relatorio-global` e `/selo` | Próxima onda | — |
| Conflito possível com o checkout do Codex (`viat.tsx` com mudanças não commitadas em `codex/q4-pratica-forcas`) | Integração | O diff aqui é pequeno e fica longe dos blocos que o Codex alterou |

**Próximas ondas:**
1. Preparar Q1 e Q2 (pontos 9 a 11).
2. Relatório Global e Selo (ponto 12).
3. Diário e Q3 demo (ponto 14).

## 5. Provas executadas

**Navegador** (servidor local `127.0.0.1:8099`, sem backend):

| Prova | Resultado |
|---|---|
| Guardiões, 1280 px, tema escuro, colaborador | Participar e depois ⓘ: o diálogo abre e o foco vai ao título. "Fonte e alcance" mostra 3 fontes rotuladas e "estudo em revisão". Os links saem para `/voz-segura` e para o PDF oficial. Escape fecha, o foco volta ao ⓘ e Participar continua marcado (15 pessoas). Sem rolagem horizontal |
| Medidas | Acionador ⓘ 44 × 44 px; Participar 44 px de altura |
| 320 px, antes da correção | O cabeçalho fixo ocupava o diálogo, e o concierge cobria o Fechar (captura 02) |
| 320 px, depois da correção | Todo o conteúdo rola junto, o Fechar fica visível e não há rolagem horizontal (captura 03) |
| 390 px, tema claro, liderança | Perspectiva "Liderança · seu perfil" pré-selecionada, com o exemplo da liderança. O diálogo tem 12 px de margem dos dois lados (captura 04) |
| VIA-T, 1280 px, claro | Origem fictícia visível e ⓘ junto ao título. Os rótulos do diálogo batem com as notas 9 · 9 · 8,5 = Força Assinatura (captura 05) |
| Expedição, 768 px, claro | Cabeçalho reescrito e estado "Leitura de referência do setor" no diálogo (captura 06) |
| Teclado | Enter abre, o foco vai ao título, Tab fica preso no diálogo, Shift+Tab volta ao Fechar e Escape fecha |

**Automatizadas:**
- `src/engine/help/contextual-help-engine.test.ts` (6 testes): papel, variação geral, estados, claim só no contexto exato, fail-closed e validador.
- `src/domain/help/contextual-help.test.ts` (5 testes): validação editorial, ids únicos, cobertura do card, nenhum estudo sem claim, estados da Expedição e item 11.4.4.
- `src/features/help/ContextualHelp.dom.test.tsx` (2 testes): nome acessível, camadas, Escape e participação preservada; troca de perspectiva.
- `src/engine/academia/expedition-read-state.test.ts` (2 testes): os seis estados.

**Não verificado:**
- movimento reduzido no navegador: só inspeção estática (`motion-reduce:animate-none` e a classe `a11y-reduce-motion` do app);
- texto ampliado;
- Expedição com sessão real;
- teste com participantes.
