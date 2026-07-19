# REGISTRO CANÔNICO DE DINÂMICAS DE APRENDIZAGEM — VITALOS™

**Versão:** 1.0.0
**Data:** 2026-07-16
**Estado deste artefato:** INCORPORADO AO REPOSITÓRIO (Onda LDX-1)
**Escopo:** Learning OS VitalOS™ · M.E.T.E. · FlorêncIA · trilhas por driver · `/voz-segura`
**Regra de ouro:** nenhuma interface, landing page, plano comercial, relatório ou agente pode apresentar uma dinâmica com status superior ao autorizado neste registro.

---

## 1. Finalidade

Este registro é a fonte canônica para governar as dinâmicas de aprendizagem do VitalOS™. Ele existe para impedir cinco falhas sistêmicas:

1. confundir documentação com runtime;
2. confundir engine real com conteúdo ainda demonstrativo;
3. anunciar como IA generativa uma experiência determinística;
4. expor ao usuário funcionalidades planejadas como se estivessem disponíveis;
5. duplicar dinâmicas em novas rotas, em vez de enriquecer superfícies já existentes.

O registro governa simultaneamente:

- identidade e nomenclatura da dinâmica;
- eixo M.E.T.E.;
- público e papel autorizado;
- rota enriquecida;
- estágio de runtime;
- estágio do conteúdo;
- persistência;
- modo de IA;
- uso de dados e privacidade;
- risco;
- dependências;
- status de exposição pública;
- critérios de aceite;
- onda de implementação.

---

## 2. Hierarquia de verdade

Em caso de conflito, prevalece esta ordem:

1. código executável e contratos de runtime;
2. banco implantado e políticas efetivas;
3. testes automatizados e gates atuais;
4. este Registro Canônico;
5. Evidence Registry, Claim Registry e Mechanism Registry;
6. documentos metodológicos e de produto;
7. protótipos e mocks;
8. intenção futura.

Documentação não conta como implementação. Mock não conta como persistência. Um componente visual não conta como capacidade operacional completa.

---

## 3. Estados canônicos

### 3.1 `runtime_status`

| Estado | Definição |
|---|---|
| `REAL` | Implementação executável, integrada, testável e coerente com os contratos atuais. |
| `PARCIAL` | Parte relevante existe, mas falta generalização, integração, cobertura, persistência ou gate de produção. |
| `DEMO` | Experiência executável para demonstração, sem promessa de operação completa. |
| `PLANNED` | Planejada em documento canônico ou roadmap aprovado, sem runtime suficiente. |
| `PROPOSED` | Ideia aceita para avaliação, mas ainda sem planejamento técnico aprovado. |
| `R_AND_D` | Pesquisa e desenvolvimento; depende de validação científica/técnica antes de entrar no roadmap de produto. |
| `AUSENTE` | Nenhuma implementação ou planejamento canônico válido encontrado. |
| `DEPRECATED` | Não deve ser usado em novas superfícies. |

### 3.2 `content_status`

- `VERIFIED`: conteúdo ligado a evidência/claim autorizado e revisão concluída;
- `CURATED`: conteúdo curado e atribuído, sem equivaler a evidência científica primária;
- `DEMO`: conteúdo demonstrativo;
- `DRAFT`: conteúdo em preparação;
- `ABSENT`: sem conteúdo utilizável.

### 3.3 `persistence_status`

- `PERSISTED_PRIVATE`: persistência individual privada, invisível ao empregador;
- `PERSISTED_TENANT`: persistência organizacional governada;
- `PERSISTED_AGGREGATED`: apenas agregado protegido;
- `SESSION_ONLY`: somente na sessão atual;
- `NONE`: sem persistência;
- `NOT_APPLICABLE`.

### 3.4 `ai_mode`

- `NONE`: não usa IA;
- `DETERMINISTIC`: regras, templates ou composição governada, sem modelo generativo;
- `GENERATIVE_GATED`: modelo generativo atrás de Context Envelope, Policy Gate, grounding, privacidade, telemetria e fallback;
- `GENERATIVE_PROHIBITED`: uso generativo não autorizado para a dinâmica nesta versão.

### 3.5 `public_exposure`

- `AVAILABLE`: pode ser apresentada como disponível;
- `PILOT`: disponível em piloto, com rótulo explícito;
- `DEMO`: demonstração, com rótulo explícito;
- `PREPARATION`: pode aparecer apenas em área "Em evolução", sem CTA operacional;
- `HIDDEN`: não deve aparecer ao usuário final;
- `R_AND_D`: somente comunicação institucional de pesquisa, sem promessa de entrega.

### 3.6 `risk_tier`

- `R1_LOW`: conteúdo educativo sem dado sensível e sem inferência;
- `R2_MODERATE`: personalização, persistência privada ou interpretação contextual;
- `R3_HIGH`: IA generativa, simulação de pessoas, recomendação de intervenção ou dados organizacionais;
- `R4_CRITICAL`: previsão organizacional, inferência sensível, uso regulatório ou impacto potencial em pessoas/equipes.

---

## 4. Invariantes globais

1. **Compor, não acumular:** cada dinâmica enriquece uma rota existente; uma nova rota só nasce quando houver caso de uso próprio, público próprio e ganho de arquitetura de informação comprovado.
2. **Aprendizagem não é avaliação de desempenho:** respostas, revisões, poesia, roleplay, flashcards e progresso individual nunca podem alimentar promoção, remuneração, punição ou ranking.
3. **Privacidade por padrão:** produção individual é privada; a organização recebe apenas indicadores agregados autorizados e protegidos.
4. **Sem overclaim:** conclusão não prova mudança comportamental, segurança psicológica, eficácia causal ou conformidade NR-1.
5. **Sem IA fantasma:** uma experiência determinística não pode ser anunciada como IA generativa.
6. **Sem funcionalidade fantasma:** `PLANNED`, `PROPOSED` e `R_AND_D` não possuem CTA ativo.
7. **Sem evidência por associação:** TED/TEDx, poesia, entrevista e vídeo inspiracional não recebem selo de evidência verificada sem análise própria.
8. **Conteúdo científico governado:** alegações devem referenciar Claim Registry e Evidence Registry quando aplicável.
9. **Acessibilidade obrigatória:** teclado, foco, contraste, linguagem clara, legenda/transcrição, reduced motion e alternativa textual para visualizações.
10. **Mobile first real:** nenhuma dinâmica depende de hover, tela larga ou arraste como única interação.
11. **Fallback seguro:** toda capacidade generativa futura precisa de fallback determinístico ou recusa segura.
12. **Nome e setor são opcionais:** personalização artística nunca exige nome, setor ou organização.
13. **Setor não aparece por padrão em PDF individual:** somente mediante escolha explícita e sem persistência organizacional do texto.
14. **ActionLog é contrato separado:** uma dinâmica só grava ActionLog quando houver binding aprovado, papel, evento, retenção, finalidade e teste de autorização.
15. **NASCENTES v0.9 permanece provisória:** nenhum texto transforma o nome de trabalho em teoria universal, escala validada ou taxonomia definitiva.

---

## 5. Contrato mínimo de um registro

```ts
interface CanonicalLearningDynamic {
  id: string;
  version: string;
  slug: string;
  title: string;
  shortLabel: string;
  description: string;
  kind: string;
  meteAxes: Array<"medir" | "educar" | "transformar" | "evoluir">;
  primaryOutcome: string;
  authorizedRoles: string[];
  enrichesRoutes: string[];
  runtimeStatus: "REAL" | "PARCIAL" | "DEMO" | "PLANNED" | "PROPOSED" | "R_AND_D" | "AUSENTE" | "DEPRECATED";
  contentStatus: "VERIFIED" | "CURATED" | "DEMO" | "DRAFT" | "ABSENT";
  persistenceStatus: "PERSISTED_PRIVATE" | "PERSISTED_TENANT" | "PERSISTED_AGGREGATED" | "SESSION_ONLY" | "NONE" | "NOT_APPLICABLE";
  aiMode: "NONE" | "DETERMINISTIC" | "GENERATIVE_GATED" | "GENERATIVE_PROHIBITED";
  publicExposure: "AVAILABLE" | "PILOT" | "DEMO" | "PREPARATION" | "HIDDEN" | "R_AND_D";
  riskTier: "R1_LOW" | "R2_MODERATE" | "R3_HIGH" | "R4_CRITICAL";
  dataClasses: string[];
  evidenceRefs: string[];
  runtimeEvidence: string[];
  documentationEvidence: string[];
  dependencies: string[];
  forbiddenUses: string[];
  accessibilityRequirements: string[];
  acceptanceCriteria: string[];
  rolloutWave: string;
}
```

O schema de runtime pode acrescentar campos, mas não pode remover essas dimensões sem decisão arquitetural explícita.

---

## 6. Matriz executiva v1.0

| ID | Dinâmica | M.E.T.E. | Runtime | Conteúdo | Persistência | IA | Exposição | Risco | Onda |
|---|---|---|---|---|---|---|---|---|---|
| `LD-001` | Assistente Temático Governado | Educar/Transformar | PARCIAL | DEMO | NONE | DETERMINISTIC | PILOT | R3 | 4C+ |
| `LD-002` | Quiz Adaptativo | Educar | PARCIAL | VERIFIED/DEMO por trilha | SESSION_ONLY | NONE | PILOT | R1 | LDX-2 |
| `LD-003` | Flashcards Espaçados | Educar | REAL | CURATED/PARCIAL | PERSISTED_PRIVATE | NONE | AVAILABLE/PILOT | R2 | LDX-1 |
| `LD-004` | VideoLab Guiado | Educar | PLANNED | DRAFT | NONE | NONE | PREPARATION | R2 | LDX-3 |
| `LD-005` | Evidence Explorer | Medir/Educar | PARCIAL | VERIFIED | NOT_APPLICABLE | NONE | PILOT | R1 | LDX-1 |
| `LD-006` | Trilha de Implementação e PDF Técnico | Transformar/Evoluir | PARCIAL | CURATED | PERSISTED_TENANT ou NONE | NONE | PILOT | R3 | LDX-2 |
| `LD-007` | Poesia Pedagógica / Carta-poema | Educar/Evoluir | PLANNED | DRAFT | NONE por padrão | DETERMINISTIC | PREPARATION | R2 | LDX-2 |
| `LD-008` | Simulador de Decisões | Transformar | PARCIAL/DEMO | DEMO | SESSION_ONLY | NONE | DEMO | R2 | LDX-2 |
| `LD-009` | Estúdio de Co-design | Transformar | PLANNED | DRAFT | NONE | NONE | PREPARATION | R3 | LDX-4 |
| `LD-010` | Arena de Debate Socrático | Educar/Transformar | PLANNED | DRAFT | NONE | GENERATIVE_PROHIBITED v1 | PREPARATION | R3 | LDX-4 |
| `LD-011` | Mapa Mental Governado | Medir/Educar | REAL/PARCIAL | VERIFIED/PARCIAL | NOT_APPLICABLE | NONE | PILOT | R2 | LDX-1 |
| `LD-012` | Roleplay Multi-Persona | Educar/Transformar | PROPOSED | ABSENT | NONE | GENERATIVE_PROHIBITED v1 | HIDDEN | R3 | pós-4C |
| `LD-013` | Microlearning Espaçado | Educar/Evoluir | PARCIAL | CURATED/PARCIAL | PERSISTED_PRIVATE futura | NONE | PILOT | R2 | LDX-2 |
| `LD-014` | Gêmeo Digital Organizacional | Medir/Evoluir | R_AND_D | ABSENT | NONE | GENERATIVE_PROHIBITED | R_AND_D | R4 | pesquisa futura |

> **Nota de incorporação (LDX-1):** os valores de `persistenceStatus`/`runtimeStatus` no `learning-dynamics-registry.json` do repositório são a fonte executável e podem diferir pontualmente desta tabela quando a auditoria de runtime encontrou estado diferente do descrito aqui (hierarquia de verdade §2, item 1 prevalece sobre item 4). Toda divergência está documentada no campo `runtimeEvidence` de cada registro e no handoff da onda.

---

# 7. Registros detalhados

## LD-001 · Assistente Temático Governado

- **Nome público preferencial:** FlorêncIA — apoio para preparar uma conversa segura.
- **Não anunciar como:** chatbot generativo, terapeuta, canal de denúncia, consultor jurídico ou diagnóstico.
- **M.E.T.E.:** Educar e Transformar.
- **Papéis:** liderança; futuramente RH/SST sob contratos próprios.
- **Rotas:** `/voz-segura`; demais rotas somente após CTA Registry e Policy Gate específicos.
- **Runtime:** `PARCIAL` — Context Envelope, CTA Registry, roteamento, Policy Gate, template determinístico e drawer são reais; conteúdo permanece `DEMO`.
- **Persistência:** `NONE`.
- **IA:** `DETERMINISTIC`.
- **Dependências:** Onda 4C, Truth Layer, binding governado para ActionLog antes de qualquer registro.
- **Usos proibidos:** inferir estado psicológico; produzir decisão disciplinar; prometer sigilo absoluto; gravar relato sensível; aconselhar denúncia sem contrato adequado.
- **Critérios de aceite para evolução:** status da Skill aplicado em runtime; claims autorizadas; recusa segura; testes adversariais; telemetria sem conteúdo sensível; fallback determinístico.

## LD-002 · Quiz Adaptativo

- **M.E.T.E.:** Educar.
- **Rotas:** `/academia`, `/voz-segura` e trilhas por driver.
- **Runtime:** `PARCIAL` — quiz com feedback existe; adaptação por três níveis ainda não é capacidade generalizada.
- **Conteúdo:** `VERIFIED` quando a pergunta referencia claims/evidências autorizadas; caso contrário `DEMO` ou `CURATED`.
- **Persistência:** `SESSION_ONLY` por padrão; histórico privado somente com consentimento.
- **Adaptação permitida:** dificuldade e revisão pedagógica, nunca perfil psicológico ou risco individual.
- **Critérios de aceite:** banco de itens versionado; nível derivado por desempenho na própria trilha; explicação para toda resposta; tentativa reversível; teste de teclado e leitor de tela; sem score para empregador.

## LD-003 · Flashcards Espaçados

- **M.E.T.E.:** Educar e Evoluir.
- **Rotas:** `/revisar`, `/academia`, acesso contextual por trilha.
- **Runtime:** `REAL`; cobertura de conteúdo ainda `PARCIAL`.
- **Motor:** SM-2 governado, com autoavaliação de recordação.
- **Persistência:** `PERSISTED_PRIVATE` quando autenticado; nunca ranking ou avaliação organizacional.
- **Critérios de aceite:** revisão agendada; estado fresh/young/mature sem inferência de competência; navegação por teclado; frente/verso acessíveis; explicação de privacidade.

## LD-004 · VideoLab Guiado

- **M.E.T.E.:** Educar.
- **Rotas:** `/academia`, introduções contextuais como `/voz-segura`.
- **Runtime:** `PLANNED`.
- **Formato:** vídeo curto, segmentado, com legenda, transcrição, pergunta de recuperação e ação de transferência.
- **Curadoria:** vídeos externos recebem tipo `CURATED` ou `INSPIRATION`; nunca `VERIFIED` automaticamente.
- **Direitos:** usar player oficial ou material próprio licenciado; não baixar, reeditar ou republicar conteúdo protegido sem autorização.
- **Critérios de aceite:** fonte aprovada; duração; legenda; transcrição; alternativa textual; poster acessível; pergunta pós-vídeo; fallback quando mídia falhar.

## LD-005 · Evidence Explorer

- **M.E.T.E.:** Medir e Educar.
- **Rotas:** `/academia`, `/voz-segura`, painéis profissionais.
- **Runtime:** `PARCIAL` — Evidence Registry e Evidence Passport são reais; explorador completo ainda não.
- **Conteúdo:** `VERIFIED` apenas para registros autorizados.
- **Níveis de leitura:** humano, profissional e auditoria.
- **Critérios de aceite:** fonte, ano, desenho do estudo, limites, força/status, claim autorizado e "o que significa na prática"; nenhum DOI inventado; busca e filtros acessíveis.

## LD-006 · Trilha de Implementação e PDF Técnico

- **M.E.T.E.:** Transformar e Evoluir.
- **Rotas:** `/prioridades`, `/plano-acao`, `/voz-segura` como síntese, nunca substituindo PGR/AEP.
- **Runtime:** `PARCIAL` — engines de plano e infraestrutura PDF existem; template completo por driver ainda não é universal.
- **Risco:** `R3_HIGH` por possível leitura regulatória.
- **Claims proibidas:** "gera o PGR", "garante conformidade", "laudo automático".
- **Critérios de aceite:** dono, prazo, medida na fonte, indicador, baseline, evidência de execução, revisão e disclaimer de responsabilidade técnica.

## LD-007 · Poesia Pedagógica / Carta-poema

- **M.E.T.E.:** Educar e Evoluir.
- **Rotas:** conclusão de `/voz-segura` e trilhas equivalentes.
- **Runtime:** `PLANNED`.
- **Primeira implementação autorizada:** composição `DETERMINISTIC`, local, opcional, com blocos autorais revisados.
- **Persistência:** `NONE` por padrão; PDF gerado no cliente.
- **Personalização:** nome opcional; setor desativado por padrão; nunca enviar texto ao gestor.
- **Classificação:** expressão artístico-educacional, não evidência.
- **Critérios de aceite:** sem LLM; sem inferência; conteúdo respeitoso; disclaimer; PDF acessível e legível; teste de não persistência e de ausência de dados na telemetria.

## LD-008 · Simulador de Decisões

- **M.E.T.E.:** Transformar.
- **Rotas:** `/trajetoria`, `/voz-segura` e trilhas de liderança.
- **Runtime:** `PARCIAL/DEMO` — cenário governado já existe em Voz Segura.
- **Formato v1:** árvores determinísticas, consequências explicadas e debriefing com evidência.
- **Usos proibidos:** simular pessoas identificáveis; pontuar "bom líder"; recomendar sanção; usar resposta como avaliação de desempenho.
- **Critérios de aceite:** alternativas plausíveis; nenhuma opção humilhante; consequências não deterministas quando a ciência não autoriza; debriefing; recomeço; acessibilidade.

## LD-009 · Estúdio de Co-design

- **M.E.T.E.:** Transformar.
- **Rotas:** `/experimentos` e `/plano-acao`.
- **Runtime:** `PLANNED`.
- **Formato:** montar intervenção com blocos validados, hipótese, público, responsável, prazo, indicador e guardrails.
- **Dependências:** Intervention Pattern Registry, NASCENTES_ATLAS mínimo, autorização por papel e ActionLog governado.
- **Critérios de aceite:** não permitir medida individualizante quando causa é organizacional; validação de campos; revisão humana; export rastreável.

## LD-010 · Arena de Debate Socrático

- **M.E.T.E.:** Educar e Transformar.
- **Rotas:** `/lab`.
- **Runtime:** `PLANNED`.
- **IA v1:** `GENERATIVE_PROHIBITED`; primeiro corte deve ser determinístico e moderado por roteiro.
- **Formato:** tese, antítese, evidência, revisão de posição e síntese de trade-offs.
- **Usos proibidos:** exposição pública; disputa entre pessoas/equipes; ranking de argumentação; tema sensível sem moderação.
- **Critérios de aceite:** foco em ideias, não indivíduos; saída privada; regras de civilidade; acessibilidade e encerramento reflexivo.

## LD-011 · Mapa Mental Governado

- **Nome público:** Mapa Mental do Driver; não usar "IA" até existir capacidade generativa autorizada.
- **M.E.T.E.:** Medir e Educar.
- **Runtime:** `REAL/PARCIAL` — engine e SVG existem; cobertura e integração por trilha podem crescer.
- **Conteúdo:** relações devem vir de bridges/registries autorizados.
- **Critérios de aceite:** alternativa textual equivalente; zoom sem perda; teclado; relações explicáveis; nenhuma aresta criada por modelo generativo na v1.

## LD-012 · Roleplay Multi-Persona

- **M.E.T.E.:** Educar e Transformar.
- **Estado:** `PROPOSED`; não estava em planejamento canônico anterior.
- **Primeiro corte recomendado:** diálogo ramificado determinístico entre papéis abstratos — liderança, colaborador e RH/SST — seguido de debriefing.
- **IA generativa:** proibida na v1.
- **Risco:** alto por simulação de relações de trabalho.
- **Critérios para entrar no roadmap:** casos revisados por especialistas; taxonomia de dano; política de linguagem; recusa; privacidade; teste com usuários; nenhuma personificação de pessoa real.

## LD-013 · Microlearning Espaçado

- **M.E.T.E.:** Educar e Evoluir.
- **Runtime:** `PARCIAL` — microlearning e SM-2 existem separadamente; falta orquestração temporal da trilha.
- **Formato:** unidades curtas + active recall + espaçamento + transferência.
- **Persistência:** futura `PERSISTED_PRIVATE`, com opt-in de lembretes.
- **Critérios de aceite:** agenda explicável; frequência ajustável; cancelar lembretes; não usar streak coercitivo; conteúdo versionado; estado privado.

## LD-014 · Gêmeo Digital Organizacional

- **M.E.T.E.:** Medir e Evoluir.
- **Estado:** `R_AND_D`.
- **Não apresentar como:** previsão, diagnóstico, certeza de ROI ou projeção causal.
- **Pré-requisitos:** modelo causal/agent-based documentado; calibração; análise de sensibilidade; intervalos de incerteza; avaliação de viés; dados agregados; revisão científica e jurídica; governança de cenário.
- **Exposição:** apenas pesquisa e protótipo fechado.
- **Critério para sair de R&D:** protocolo de validação independente aprovado e demonstração explícita de limites.

---

## 8. Orquestração recomendada em `/voz-segura`

A página não deve exibir uma grade plana com todas as dinâmicas. O padrão canônico é progressivo:

```text
COMPREENDER
Evidence Explorer + vídeo introdutório

APRENDER
Microlearning + mapa mental

PRATICAR
Quiz + flashcards

EXPERIMENTAR
Simulador; roleplay somente quando aprovado

APLICAR
Missão + FlorêncIA determinística

REGISTRAR
ActionLog local da demonstração, claramente rotulado

EVOLUIR
Indicadores + decisão manter/ajustar/interromper

CELEBRAR
Carta-poema determinística + recursos complementares
```

### Regras de interface

- `REAL`, `PARCIAL` e `DEMO`: podem aparecer no fluxo, sempre com badge correto.
- `PLANNED`: somente em seção recolhida "Em evolução", sem CTA ativo.
- `PROPOSED` e `R_AND_D`: não aparecem na jornada comum.
- card contextual deve rolar ou abrir a seção existente; não duplicar conteúdo.
- no máximo três alternativas por momento decisório.
- vídeo não bloqueia a jornada.
- progresso deve dizer "marcos práticos", não "etapas", quando o numerador não representa todas as seções visuais.

---

## 9. Primeira onda segura — LDX-1

### Inclui

1. incorporar este registro em documentação e runtime tipado;
2. criar schema e testes de integridade;
3. conectar as dinâmicas já existentes à `/voz-segura` por cards contextuais;
4. renomear o progresso para "0 de 5 marcos práticos";
5. criar card introdutório de vídeo com fonte opcional e fallback honesto;
6. criar modal acessível "Como funciona";
7. ampliar Evidence Explorer a partir do Evidence Passport existente;
8. integrar o mapa mental determinístico quando houver dados autorizados;
9. criar seção "Continue aprofundando" apenas com recursos internos/curados existentes;
10. não ativar nenhuma dinâmica `PLANNED`, `PROPOSED` ou `R_AND_D`.

### Não inclui

- LLM, RAG ou embeddings;
- geração sintética de vídeo em runtime;
- conexão FlorêncIA → ActionLog;
- NASCENTES_ATLAS operacional;
- migrations;
- billing;
- roleplay;
- arena;
- co-design;
- gêmeo digital;
- claims novos.

---

## 10. Segunda onda segura — LDX-2

Somente após LDX-1 aprovada:

- quiz adaptativo por dificuldade pedagógica;
- simulador com mais cenários determinísticos;
- microlearning espaçado privado;
- Carta-poema determinística e PDF local;
- síntese técnica em PDF com disclaimers corretos.

---

## 11. Critério de governança de mudanças

Qualquer alteração de status exige:

1. evidência do arquivo/commit;
2. teste correspondente;
3. atualização deste registro;
4. atualização do badge de interface;
5. confirmação de privacidade e dados;
6. confirmação de claims;
7. gate de acessibilidade;
8. registro da decisão no handoff.

Um status nunca deve ser elevado apenas porque a tela "parece pronta".
