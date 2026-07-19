# SUPER PROMPT — CLAUDE CODE
## Registro Canônico de Dinâmicas de Aprendizagem + Elevação Premium da `/voz-segura`

> **Estado deste artefato:** contrato operacional recebido do founder em 2026-07-16 para a
> Onda LDX-1. Preservado verbatim para rastreabilidade — não é doutrina viva (essa função é
> do `CLAUDE.md` e do `REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_V1.md` neste mesmo diretório).
> Decisões de implementação que divergiram deste texto (por conflito com `CLAUDE.md` ou por
> achado de runtime) estão documentadas no handoff da onda, não neste arquivo.

Você atuará como **Principal Staff Engineer, Product Architect, Learning Experience Designer, especialista em acessibilidade, privacidade/LGPD e governança de IA** do VitalOS™.

Seu objetivo não é "adicionar cards". Seu objetivo é criar uma **camada canônica, auditável e segura de Learning OS**, conectar somente capacidades reais à jornada `/voz-segura` e elevar UX/IX/design sem inflar o status do produto.

Use Tree of Thoughts internamente. Não exponha raciocínio privado detalhado. Registre apenas alternativas, critérios, decisão, riscos e evidências.

---

# 1. Contexto canônico

**Repositório operacional esperado:** `https://github.com/minhafelicidadebr/vitalos-minha-felicidade-julho.git`
**Baseline histórico da Onda 4B:** `8de62b0`
A `main` pode estar legitimamente à frente. O hash é apenas referência histórica; não force checkout para o baseline sem justificativa.

## Gate obrigatório de identidade Git

Antes de ler, modificar ou criar qualquer arquivo, execute e registre:

```bash
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git rev-parse HEAD
git status --short
```

Regras:

1. Trate o valor efetivo de `origin` como fonte operacional de verdade.
2. O `origin` deve corresponder a `minhafelicidadebr/vitalos-minha-felicidade-julho.git`, admitindo somente variações equivalentes de HTTPS ou SSH.
3. Se o `origin` apontar para `minhafelicidadebr/vitalos.git`, outro repositório ou estiver ausente, **pare antes de alterar arquivos** e reporte a divergência.
4. Não execute `git remote set-url`, clone, checkout, reset, rebase, pull, push ou troca de branch para "corrigir" a divergência sem autorização expressa.
5. Não presuma que o nome da pasta local ou do ZIP identifica o remoto; confirme por `git remote -v`.
6. Registre no handoff final: URL do `origin`, branch inicial, `HEAD` inicial e estado inicial da árvore de trabalho.

**Arquivo normativo a incorporar:**

`REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_VITALOS_V1.md`

Caso o arquivo seja fornecido fora do repositório, copie seu conteúdo para uma localização documental coerente, preservando integralmente as classificações. Sugestão:

```text
docs/learning/REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_V1.md
```

Antes de qualquer alteração, leia no mínimo:

```text
CLAUDE.md
TASK.md
package.json
.github/workflows/gate.yml
docs/instrumentos/WWP.md
docs/METODO_NASCENTES_ATLAS_VIVO_FASE0.md
docs/PLANO_MESTRE_EVOLUCAO_VITALOS_2026_2027.md
docs/SKILL_MESTRA_VITALOS_EDUCACAO_TRANSFORMACAO.md
docs/ai/florencia/CAPABILITY-MAP.md
docs/ai/florencia-skills/AGENTS.md
src/engine/learning/learning-dynamics.ts
src/mocks/learning-dynamics-mock.ts
src/routes/voz-segura.tsx
src/features/florencia/components/FlorenciaSafeConversationEntryPoint.tsx
src/features/florencia/components/FlorenciaDrawer.tsx
src/engine/nr1/mindmap-engine.ts
src/app/nr1/DriverMindMapSvg.tsx
src/engine/learning/sm2-engine.ts
src/routes/revisar.tsx
src/domain/evidence/evidence-registry.json
src/domain/evidence/claim-registry.json
src/domain/evidence/mechanism-registry.json
src/components/ui/dialog.tsx
src/components/ui/sheet.tsx
src/lib/pdf/pdf-kit.ts
```

> **Nota de execução:** `docs/instrumentos/WWP.md` foi deliberadamente **não lido** — `CLAUDE.md`
> §"Regras científicas permanentes" item 3 proíbe ler o Work-Wellbeing Playbook em tarefa de
> implementação (licença CC BY-NC-ND, GOV-01). Doutrina local prevalece sobre esta lista de
> leitura.

A hierarquia de verdade é:

```text
runtime + banco efetivo + testes
> registro canônico
> registries científicos/claims
> documentação
> mocks
> intenção
```

---

# 2. Estado conhecido que deve ser preservado

- FlorêncIA Skills Registry: REAL como governança.
- Context Envelope: REAL.
- Policy Gate: REAL.
- Claim Registry para Voz Segura: REAL.
- template de resposta: REAL e determinístico.
- `FlorenciaDrawer`: REAL e integrado.
- conteúdo da orientação: DEMO.
- conexão FlorêncIA → ActionLog: AUSENTE.
- persistência da FlorêncIA: AUSENTE.
- LLM, RAG e embeddings: AUSENTES.
- quatro capacidades adicionais da FlorêncIA: PLANNED.
- NASCENTES_ATLAS: ainda não operacional em runtime.
- identidade VitalOS, hero, copy oficial e card IVO: congelados, salvo defeito comprovado.

A rota `/voz-segura` já contém ciência, microlearning, quiz, cenário decisório, missão, FlorêncIA determinística, ActionLog de sessão e evolução. Não duplique essas superfícies.

---

# 3. Objetivo de implementação

Entregar a onda **LDX-1 — Governança + Descoberta Contextual**, composta por:

1. Registro Canônico documental e de runtime.
2. Schema validável e testes de integridade.
3. Catálogo tipado de 14 dinâmicas.
4. Resolução por rota, papel, status e exposição pública.
5. Integração contextual premium em `/voz-segura`.
6. Card introdutório de vídeo com fallback honesto.
7. modal acessível "Como funciona".
8. correção semântica do progresso para "marcos práticos".
9. seção curada "Continue aprofundando".
10. arquitetura preparada para Carta-poema determinística, sem implementá-la se isso aumentar o risco ou o escopo da LDX-1.

A LDX-1 não transforma funcionalidades planejadas em runtime.

---

# 4. Proibições absolutas

Nesta execução, NÃO:

- adicionar LLM, RAG, embeddings ou chamadas a modelos;
- criar, ler ou expor secrets;
- conectar FlorêncIA ao ActionLog;
- persistir conteúdo da FlorêncIA;
- implementar NASCENTES_ATLAS em runtime;
- criar migrations;
- alterar RLS, grants, auth ou billing;
- criar novo canal de denúncia;
- registrar texto livre sensível;
- usar nome/setor do colaborador sem opt-in;
- criar ranking, streak coercitivo ou pontuação para empregador;
- anunciar `PLANNED`, `PROPOSED` ou `R_AND_D` como disponível;
- adicionar links TED/TEDx ou vídeos externos sem curadoria e direitos verificados;
- inventar DOI, fonte científica ou claim;
- alterar hero, identidade, copy oficial ou card IVO sem defeito comprovado;
- substituir componentes/tokens existentes por um novo design system;
- instalar dependência sem prova de necessidade;
- fazer push, PR, merge ou deploy sem autorização explícita do usuário.

---

# 5. Mapa canônico obrigatório

Implemente os seguintes IDs e estados sem elevá-los artificialmente:

| ID | Slug | Estado principal | Exposição |
|---|---|---|---|
| `LD-001` | `thematic-governed-assistant` | PARCIAL | PILOT |
| `LD-002` | `adaptive-quiz` | PARCIAL | PILOT |
| `LD-003` | `spaced-flashcards` | REAL, conteúdo parcial | AVAILABLE/PILOT |
| `LD-004` | `guided-videolab` | PLANNED | PREPARATION |
| `LD-005` | `evidence-explorer` | PARCIAL | PILOT |
| `LD-006` | `implementation-path-pdf` | PARCIAL | PILOT |
| `LD-007` | `pedagogical-poetry` | PLANNED | PREPARATION |
| `LD-008` | `decision-simulator` | PARCIAL/DEMO | DEMO |
| `LD-009` | `co-design-studio` | PLANNED | PREPARATION |
| `LD-010` | `socratic-debate-arena` | PLANNED | PREPARATION |
| `LD-011` | `governed-mind-map` | REAL/PARCIAL | PILOT |
| `LD-012` | `multi-persona-roleplay` | PROPOSED | HIDDEN |
| `LD-013` | `spaced-microlearning` | PARCIAL | PILOT |
| `LD-014` | `organizational-digital-twin` | R_AND_D | R_AND_D |

O registro deve distinguir obrigatoriamente:

- `runtimeStatus`;
- `contentStatus`;
- `persistenceStatus`;
- `aiMode`;
- `publicExposure`;
- `riskTier`.

Nunca colapse tudo em um único campo `status`.

---

# 6. Arquitetura proposta — adapte ao padrão real do repositório

Crie ou adapte uma estrutura equivalente a:

```text
docs/learning/
  REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_V1.md

src/domain/learning/
  learning-dynamics-registry.json
  learning-dynamics-registry.schema.json
  learning-dynamics-registry.test.ts
  learning-dynamics-registry.ts

src/engine/learning/
  learning-dynamics.ts
  learning-dynamics.test.ts
  learning-dynamics-resolution.ts
  learning-dynamics-resolution.test.ts

src/features/learning/
  components/
    LearningDynamicCard.tsx
    LearningDynamicsRail.tsx
    LearningMethodDialog.tsx
    IntroVideoCard.tsx
    ComplementaryResources.tsx
  learning-dynamics.dom.test.tsx
```

A estrutura é uma hipótese. Antes de criar arquivos, procure padrões equivalentes e minimize dispersão.

## Invariante engine ≠ domínio

- o engine recebe o catálogo por parâmetro;
- não importa JSON de domínio diretamente;
- não conhece React;
- não faz I/O;
- não acessa banco;
- não deriva status por heurística;
- resolução deve ser pura e determinística.

## Funções mínimas esperadas

```ts
getDynamicById(catalog, id)
getDynamicsForRoute(catalog, route)
getDynamicsForRole(catalog, role)
getVisibleDynamics(catalog, context)
getAvailableDynamics(catalog, context)
getRoadmapDynamics(catalog, context)
assertDynamicRegistryIntegrity(catalog)
```

A resolução deve aplicar:

```text
route
+ papel
+ publicExposure
+ runtimeStatus
+ feature flag existente, se houver
+ dependências satisfeitas
```

`PLANNED`, `PROPOSED`, `R_AND_D`, `AUSENTE` e `DEPRECATED` nunca retornam CTA operacional.

---

# 7. Integração premium em `/voz-segura`

## 7.1 Preservar o fluxo existente

Não reescreva a página inteira. Faça composição cirúrgica.

Preserve:

- faixa atual;
- identidade;
- texto oficial;
- evidência congelada;
- quiz;
- cenário;
- missão;
- FlorêncIA;
- ActionLog de sessão;
- evolução;
- disclaimers.

## 7.2 Corrigir a semântica de progresso

Se o cálculo continuar representando cinco entregáveis, substituir:

```text
0 de 5 etapas
```

por:

```text
0 de 5 marcos práticos concluídos
```

Adicione texto acessível que explique quais são os cinco marcos. Não altere a regra de cálculo sem necessidade.

## 7.3 Card introdutório de vídeo

Criar componente reutilizável com contrato semelhante a:

```ts
interface IntroVideoSource {
  title: string;
  durationLabel?: string;
  posterSrc?: string;
  videoSrc?: string;
  transcript?: string;
  captionsSrc?: string;
  sourceType: "OWNED" | "CURATED_EXTERNAL" | "NOT_AVAILABLE";
  contentStatus: "CURATED" | "DEMO" | "DRAFT";
}
```

Regras:

- sem fonte aprovada, não renderizar player falso;
- mostrar poster premium e badge `Vídeo em preparação` ou CTA somente para "Como funciona";
- vídeo nunca bloqueia a continuidade;
- `preload="metadata"` ou `none`, conforme padrão de performance;
- lazy loading;
- legenda e transcrição obrigatórias quando houver vídeo;
- poster com contraste e texto alternativo;
- não inserir avatar sintético ou mídia gerada sem aprovação explícita.

Copy sugerida:

```text
Em 90 segundos: por que a Voz Segura importa
Entenda o que você vai aprender e como transformar conhecimento em uma conversa mais segura.
```

## 7.4 Modal "Como funciona"

Usar `Dialog` existente; em telas pequenas, estilizar como full-screen sheet sem duplicar a árvore interativa.

Conteúdo:

```text
APRENDER → PRATICAR → APLICAR → REGISTRAR → EVOLUIR
```

Para cada etapa, mostrar:

- o que a pessoa faz;
- o que aprende;
- duração estimada;
- o que é registrado;
- o que não é compartilhado com a organização.

Incluir dois blocos:

```text
O que esta trilha é
O que esta trilha não é
```

Deixar explícito que não é diagnóstico psicológico, canal de denúncia, investigação, terapia, certificação profissional ou prova isolada de conformidade NR-1.

Acessibilidade:

- foco inicial no título ou primeiro controle;
- trap de foco do componente existente;
- Escape fecha;
- foco retorna ao acionador;
- `aria-describedby` útil;
- scroll interno no mobile;
- reduced motion.

## 7.5 Dinâmicas desta trilha

Não exibir uma grade plana com 14 itens.

Criar uma camada contextual, no máximo 3 cards por momento, mapeada a seções existentes:

```text
COMPREENDER: Evidence Explorer + vídeo
APRENDER: Microlearning + mapa mental
PRATICAR: Quiz + flashcards
EXPERIMENTAR: Simulador
APLICAR: FlorêncIA + missão
REGISTRAR: ActionLog de sessão
EVOLUIR: indicadores + decisão
CELEBRAR: poesia apenas como PREPARATION na LDX-1
```

Comportamento:

- cards `REAL/PARCIAL/DEMO` rolam ou abrem a funcionalidade existente;
- badge sempre visível: `Disponível`, `Piloto` ou `Demonstração`;
- itens `PLANNED` só em seção recolhida "Em evolução", sem CTA;
- `PROPOSED` e `R_AND_D` ficam ocultos da jornada comum;
- não usar `Em breve` sem onda aprovada;
- não duplicar quiz, cenário ou ActionLog.

## 7.6 Evidence Explorer compacto

Reutilizar Evidence Registry e Evidence Passport.

Adicionar, quando os dados existirem:

- afirmação autorizada;
- tipo/desenho do estudo;
- status da evidência;
- limites;
- aplicação prática;
- referência.

Não criar fonte externa. Não inferir força de evidência se o registro não autoriza.

## 7.7 Mapa mental

Reutilizar `mindmap-engine.ts` e `DriverMindMapSvg.tsx`.

Não rotular como "Mapa Mental IA". Usar "Mapa Mental Governado".

Somente renderizar quando houver dados suficientes e autorizados para o driver Segurança. Oferecer alternativa textual completa; o SVG não pode ser a única forma de acesso.

## 7.8 Continue aprofundando

Criar seção estruturada e condicional.

Tipos:

```text
VERIFIED_EVIDENCE
APPLIED_INTERPRETATION
CURATED_INSPIRATION
ARTISTIC_EXPRESSION
PRACTICE_TOOL
```

Cada recurso precisa de:

- título;
- tipo;
- origem;
- autor/organização, quando aplicável;
- ano, quando aplicável;
- duração estimada;
- por que importa;
- status de evidência;
- URL apenas se aprovada.

Na LDX-1, priorize recursos internos e Evidence Registry. Não preencher com links arbitrários.

---

# 8. Preparação da Carta-poema

Na LDX-1, crie apenas o contrato e, se for de baixo risco, um protótipo visual não ativo. Não marque como disponível.

Contrato futuro:

```ts
interface PedagogicalPoemRequest {
  displayName?: string;
  teamLabel?: "minha equipe" | "minha área" | "nossa organização";
  selectedThemes: Array<"falar" | "escutar" | "aprender_com_erros" | "respeito" | "coragem" | "cuidado" | "responsabilidade">;
}
```

Regras futuras obrigatórias:

- composição determinística com versos autorais revisados;
- geração local;
- sem LLM;
- sem persistência;
- nome opcional;
- setor real desativado por padrão;
- PDF com `jsPDF`/`pdf-kit` existente;
- disclaimer artístico-educacional;
- nenhum acesso pelo gestor;
- nenhuma telemetria com texto ou nome.

Não implemente a geração completa na LDX-1 se ela comprometer a entrega canônica ou aumentar o diff de forma desproporcional.

---

# 9. Design, UX, IX e responsividade

Use exclusivamente tokens e componentes existentes.

## Requisitos visuais

- hierarquia clara;
- largura de leitura controlada;
- cards com título, uma frase, duração, status e CTA;
- ícones consistentes;
- estados hover/focus/pressed/disabled;
- nenhum gradiente ou efeito novo sem coerência com o design system;
- evitar excesso de glassmorphism, animações e sombras;
- motion apenas para feedback, respeitando `prefers-reduced-motion`.

## Desktop

- composição 2 colunas na abertura apenas quando houver espaço;
- conteúdo principal com ordem narrativa;
- rail contextual opcional sem competir com o fluxo.

## Mobile

- uma coluna;
- vídeo responsivo;
- modal full-screen;
- cards empilhados;
- touch target mínimo adequado;
- nenhum conteúdo essencial escondido por hover;
- sem carrossel como única navegação;
- tabelas convertidas em cards quando necessário.

## Acessibilidade

- WCAG 2.2 AA como meta;
- landmarks e headings sem saltos incoerentes;
- teclado completo;
- foco visível;
- contraste;
- labels e descrições;
- `aria-live` somente para feedback relevante;
- alternativa textual do mapa;
- legenda/transcrição do vídeo;
- não usar cor como único sinal;
- zoom 200% sem perda funcional.

---

# 10. Testes obrigatórios

## Registry

1. IDs únicos.
2. slugs únicos.
3. versões válidas.
4. toda dinâmica possui eixo, rota, papel, risco e status multidimensional.
5. `PLANNED/PROPOSED/R_AND_D` não resolve CTA ativo.
6. `GENERATIVE_GATED` exige dependências de Policy Gate; nesta onda nenhuma dinâmica deve ser ativada nesse modo.
7. referências de runtime apontam para arquivos existentes quando declaradas.
8. schema e JSON em paridade.

## Engine

1. resolução por rota;
2. resolução por papel;
3. separação disponível × roadmap;
4. ordem estável;
5. ausência de mutação;
6. tolerância a catálogo vazio;
7. rejeição ou fallback seguro para status desconhecido.

## DOM `/voz-segura`

1. texto "5 marcos práticos" presente;
2. modal abre, fecha e retorna foco;
3. vídeo sem source não cria player falso;
4. cards disponíveis apontam para seções reais;
5. planejados não têm CTA;
6. `PROPOSED/R_AND_D` não aparecem;
7. badges refletem o registry;
8. aviso de sessão do ActionLog permanece;
9. disclaimer de conteúdo DEMO da FlorêncIA permanece;
10. hero e card IVO não mudam.

## Performance

- não incluir `jsPDF` no bundle inicial da rota;
- não carregar vídeo antes da interação;
- evitar duplicação de grandes registries no client;
- conferir impacto no bundle e renderização.

## Gates

Executar, na ordem:

```bash
bun test src
bun run parity
bunx tsc --noEmit
bun run build
```

Se o repositório possuir gate mais recente em `CLAUDE.md` ou CI, ele prevalece.

Não mascarar falha preexistente. Diferencie claramente:

- falha introduzida pela mudança;
- falha anterior;
- teste não executável por ambiente.

---

# 11. Estratégia de implementação

Antes de editar, produza uma nota curta com:

1. estado Git;
2. commit atual;
3. arquivos canônicos encontrados;
4. alternativas consideradas;
5. escolha arquitetural;
6. riscos;
7. lista prevista de arquivos.

Depois implemente em fatias pequenas:

### Fatia A — Registro e contratos

- documento;
- JSON/schema;
- tipos;
- validação;
- testes.

### Fatia B — Resolução e UI base

- engine puro;
- cards;
- badges;
- filtro por rota/status.

### Fatia C — `/voz-segura`

- marcos práticos;
- card de vídeo com fallback;
- modal;
- rail contextual;
- Evidence Explorer e mapa apenas por reuso.

### Fatia D — Recursos e hardening

- recursos complementares condicionais;
- acessibilidade;
- performance;
- testes DOM;
- docs e handoff.

Não faça refactor amplo não relacionado.

---

# 12. Critérios de aceite da LDX-1

A onda só pode ser declarada concluída quando:

1. existe uma única fonte canônica de status das 14 dinâmicas;
2. runtime, documentação e UI usam a mesma taxonomia;
3. nenhum item planejado possui CTA ativo;
4. `/voz-segura` continua funcional sem vídeo;
5. progresso descreve corretamente cinco marcos;
6. modal funciona com teclado e mobile;
7. capacidades existentes são reutilizadas, não duplicadas;
8. ActionLog continua local e desconectado da FlorêncIA;
9. nenhum LLM/RAG/embedding foi adicionado;
10. nenhum claim ou source foi inventado;
11. todos os gates passam ou as limitações são documentadas com honestidade;
12. o diff permanece cirúrgico e revisável.

---

# 13. Saída final obrigatória

Entregue um handoff contendo:

```text
1. Resumo executivo
2. Commit/branch
3. Arquivos alterados
4. Decisões arquiteturais
5. Matriz antes/depois
6. Funcionalidades efetivamente disponíveis
7. Funcionalidades apenas representadas como roadmap
8. Testes executados e resultados
9. Limitações
10. Riscos residuais
11. Próxima onda recomendada
12. Comandos exatos para revisão local
```

Use os rótulos:

```text
REAL
PARCIAL
DEMO
PLANNED
PROPOSED
R_AND_D
AUSENTE
```

Não use linguagem promocional no handoff. Não declare sucesso sem evidência.

---

# 14. Regra de parada

Pare e solicite decisão humana apenas se ocorrer uma destas condições:

- conflito entre registro canônico e runtime que exija elevar/rebaixar status;
- necessidade de migration, RLS, auth, secret ou serviço externo;
- necessidade de novo claim científico;
- necessidade de usar conteúdo externo protegido;
- necessidade de conectar FlorêncIA ao ActionLog;
- necessidade de implementar IA generativa;
- alteração do hero, identidade oficial ou card IVO;
- diff estimado muito superior ao escopo da LDX-1.

Nos demais casos, execute autonomamente, preserve os invariantes e produza o handoff completo.
