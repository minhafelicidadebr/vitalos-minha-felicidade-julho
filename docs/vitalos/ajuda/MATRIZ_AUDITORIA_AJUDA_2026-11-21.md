# Matriz de auditoria · ajuda contextual · 21/11/2026

**Base:** `origin/main` @ `5e25fa1`. **Branch local:** `feat/ajuda-contextual-voz-segura`. **Ambiente:** servidor local em loopback, sem backend, com dados fictícios e portão de demonstração destravado só no navegador local.

**Tipos de verificação:**
- **N** · verificado no navegador;
- **E** · inspeção estática do código;
- **B** · bloqueado por depender de sessão institucional ou backend;
- **F** · fora do escopo desta onda.

## 1. Cobertura

- **Páginas declaradas:** 92 (inventário da v1).
- **Páginas auditadas:** 10 com inspeção dirigida. Na onda 1, 3 também no navegador; na onda 2, mais 2 (preparar Q1 e ações Q2).
- **Pontos de ajuda decididos:** 14. Implementados: 4 na onda 1 e 3 na onda 2, total 7.
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
| 9 | `/ivo-integral/preparar-q1` · título | RH, SST, liderança, colaborador (papel da sessão real) | "A coleta já pode começar? O que me cabe?" | servidor · coleta e resultados bloqueados (contrato de módulos) | Tratar a preparação como coleta aberta | **ⓘ no título**: "O que acontece nesta preparação?". O resumo diz que preparar não abre a coleta. **Implementado (onda 2)** | Produto (contrato de módulos, fluxo de preparação) + Manual MTE itens 6.2–6.3 | O bloqueio de acesso continua; sem autorização, o formulário não aparece | N (sem sessão) · B (sessão RH/SST) |
| 10 | `/ivo-integral/q2` · `MemberPlanFeedback` | membro, RH | "Isso é resposta individual ou leitura do grupo?" | servidor · projeção fechada por ciclo, setor e fator | Confundir ação coletiva com resposta individual ou com melhora | **ⓘ junto a "O que a organização está fazendo"**: "O que esta devolutiva mostra?". Também aparece no Diário, que usa o mesmo componente. **Implementado (onda 2)** | Produto. Sem Manual NR-1: Q2 é Domínio A | Teste garante que não há citação de NR-1, PGR ou COPSOQ nem estudo vinculado | E · B (só aparece com sessão de membro) |
| 11 | `/ivo-integral/acoes` · título | liderança (só as próprias ações), RH | "Registrar execução prova efeito?" | servidor · capacidade + posse do item | Ler execução como efeito | **ⓘ no título**: "Como ler as evidências deste plano?", com fluxo execução → aprendizagem → eficácia com protocolo. **Implementado (onda 2)** | Produto. Sem Manual NR-1 (Domínio A) | Duas colunas a 1280 px, 44 px, sem rolagem horizontal | N (sem sessão) · B (sessão com plano) |
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


## 6. Onda 2 · Q1 e Q2 (21/11/2026)

**Branch:** `feat/ajuda-contextual-q1-q2`, a partir de `4832714`. O PR #53 ficou intacto.

**O que mudou:**
- **Pontos 9, 10 e 11 implementados.**
- **Perfil da ajuda:** nas telas institucionais, a ajuda usa o papel da sessão real (`roleId` vindo de `useRealOrgSession`). `DGP_RH`, `DIRETOR` e `SESMT_SAUDE` foram mapeados para leitura, nunca para autorização.

**Gates intocados:**
- coleta Q1 e piloto Q2;
- questionários, cálculos e decisões metodológicas;
- migrations, RLS, flags e habilitações.

**Fontes:**
- **Q1:** contrato de módulos e Manual MTE, itens 6.2–6.3.
- **Q2:** só fontes do produto, porque citar NR-1 misturaria os Domínios A e B.
- **Estudos:** nenhum estudo novo; não há claim para esses contextos.

**Provas:**

| Tipo | O que cobre |
|---|---|
| Código | `src/domain/help/contextual-help-q1q2.test.ts` (5 testes): validador, aviso de coleta bloqueada, Q2 sem NR-1 e sem estudo, limites de resposta individual e de efeito, mapeamento dos papéis reais |
| Navegador, `/ivo-integral/preparar-q1` a 390 px | Sem sessão. O alerta de autorização aparece e o formulário de ciclo **não** aparece. O ⓘ tem 44 px, o diálogo abre com o foco no título e mostra o bloqueio da coleta. Fechar devolve o foco ao ⓘ. Sem rolagem horizontal |
| Navegador, `/ivo-integral/acoes` a 1280 px | O diálogo abre em duas colunas, com o fluxo de 3 passos e sem citar NR-1 |
| Painel do navegador oculto | Teclado real, capturas e contraste visual desta onda **não** foram observados. A verificação foi feita por script no DOM. Movimento reduzido: só inspeção estática, porque o componente é o mesmo da onda 1 |
| Ambiente real | **Não testado.** Faltam a sessão RH/SST na preparação, a devolutiva com sessão de membro e as ações com plano real |

**Achado separado:** limite de "assentos administrativos" que conta todos os perfis. O registro está em `docs/vitalos/decisions/ONBOARDING_ASSENTOS_ADMINISTRATIVOS_2026-11-21.md`, com uma correção mínima proposta. Nada foi alterado no código de cobrança.

**Próxima onda:**
1. Relatório Global e Selo: estender `DemonstrationContext` (ponto 12).
2. Diário e Q3 demo (ponto 14).
3. Prova das ondas 1 e 2 com sessão real na stack local descartável.

Nada disto declara Q1, Q2, Q3 ou Q4 prontos para serviço real.

## 7. Revisão para aprovação (branch `feat/ajuda-contextual-revisao`, base `82e6bfb`)

Branch de revisão empilhada sobre a Onda 2 (que contém a Onda 1). PR #53 e `feat/ajuda-contextual-q1-q2` não foram alterados.

| Ponto | Ajuste | Prova |
|---|---|---|
| Card Guardiões da Voz Segura | Aviso visível no card: "Não é canal de denúncia. Relatos de risco seguem os canais formais da organização." (antes, só dentro da ajuda) | Navegador: texto presente; sem overflow em 320/390/768/1280 |
| Limites da ajuda Guardiões | Mesmo complemento sobre canais formais, para todos os papéis | `contextual-help.test.ts` |
| Seletor de perspectiva | Linha visível: "Muda só o texto desta ajuda. Não altera o seu acesso nem os dados." | DOM test existente de troca de perspectiva |
| Foco | Teste agora prova que Escape devolve o foco ao acionador | `ContextualHelp.dom.test.tsx` |
| Botão Participar | Anel de foco `ring-2` com deslocamento (antes `ring-1`) | Inspeção visual |
| Expedição · falha de leitura | O servidor engolia erro do Cofre de Ciclos e a tela mostrava "Nenhum ciclo registrado". Agora `loadOrgCycleHistory(..., { failClosed: true })` lança e a tela mostra "Leitura indisponível" | `cycle-history.server.test.ts`, `expedition-real.server.test.ts` |
| Expedição · supressão | Novo estado `suppressed` ("Leitura protegida"): há ciclo, mas nenhuma dimensão da medição mais recente tem n ≥ 5. Antes caía em "Sem exposição medida" | `expedition-read-state.test.ts`, `expedition-real.server.test.ts` |
| Expedição · zero ciclos | O card mostra o significado do estado em vez do texto "Sem exposição medida" | Inspeção do código; estados reais não navegáveis sem sessão real |

Sem mudança: VIA-T já distingue resultado individual (Marina, fictícia) e Visão da Equipe (só papéis de liderança, n ≥ 5 visível), e mostra "Não é diagnóstico psicológico". `loadOrgCycleHistory` sem a opção mantém o comportamento anterior nos outros 4 chamadores (Board Brief, histórico, Reavaliação, dossiê PGR) — registrado como pendência: eles também transformam erro em "nenhum ciclo".

Testes: `bun test src scripts` = 4634 aprovados, 4 falhas pré-existentes no `main` (preflight ×2, allowlist do `.env`, tipos Wave 2.1). `tsc` limpo.

Prévia: só local (Vite em `127.0.0.1:8100`, backend apontado para loopback sem serviço). Não existe prévia Lovable deste branch.

## 8. Onda 3 · narrativa clara (branch `feat/ajuda-contextual-onda3`, base `main` 8cff4c5)

### Feito

| Superfície | O que mudou |
|---|---|
| `/expedicao` · abertura | Texto antigo removido por completo (antagonista, bestiário, marketing, item 11.4.4 no cabeçalho). Novo título "Acompanhe os desafios do trabalho e as medidas em andamento" e texto que descreve só o que a tela mostra. Imagem editorial já usada em `/nr1` (`nr1-evidence-report.jpg`): faixa de 96 px no celular, lateral a partir de `sm`. |
| `/expedicao` · seções | "Prioridade deste ciclo", "Todos os desafios acompanhados", rótulos "Sem recuo medido / Em recuo / Recuo sustentado" (antes "Dominando / Recuando / Derrotado"), notas de evidência sem "derrota" nem "eficácia plena", nota interna de versão trocada por um próximo passo. Navegação do pack: "Prioridades e medidas". |
| `/expedicao` · ajuda | Resumo sem "antagonista"; blocos O que você vê / O que acontece depois / Por que isso importa. Manual do MTE fica só em "Fonte e alcance", para o item 11.4.4 (eficácia das medidas) e 12.2 (acompanhamento). |
| Padrão de conteúdo | Contrato ganhou três campos opcionais (`dataScope`, `afterwards`, `whyItMatters`), validados contra termos proibidos e mostrados como blocos curtos no diálogo. |
| `/embaixadorias` · 15 cards | Cada card tem ajuda própria: propósito, exemplo concreto, próximo passo, por que importa e limites da frente. Liderança tem variação só em Rede do Cuidado Ativo. Limites de canal formal, PGR/SST, saúde e conduta só onde a frente toca esses temas. Guardiões da Voz Segura mantém a entrada própria. |

Fontes: só regra de produto nos 14 cards novos e na abertura. Manual do MTE (itens 6.2–6.3, 11.4.4, 12.2) mantido como já estava. Nenhum claim novo; TRU-006 e Seligman 2005 seguem como candidatos sem claim.

### Pendente (inventário, por valor e risco)

| Superfície | Rota | Dúvida que a ajuda resolveria | Situação |
|---|---|---|---|
| Devolutiva coletiva (colaborador) | `/devolutiva` | Isto é meu resultado? Quem vê? | Pendente |
| Diário | `/diario` | É obrigatório? Quem lê? | Pendente |
| Painel do colaborador | `/colaborador` | O que é agregado e o que é meu | Pendente |
| Liderança | `/lider` | Ação atribuída, registro de execução, o que vai ao RH, limite n ≥ 5 | Pendente |
| RH | `/rh`, `/ivo-integral/governanca` | Designação, acompanhamento, evidências | Parcial (Q1 preparação, Q2 devolutiva e ações já têm ajuda) |
| SST | `/sst` | Revisão técnica, Domínio B educativo | Pendente; exige revisão SST do texto |

Não observado no navegador: estados reais da Expedição (erro, sem ciclo, leitura protegida), porque dependem de sessão real; cobertos por testes. Perfil RH visto só pela troca de perspectiva do diálogo.
