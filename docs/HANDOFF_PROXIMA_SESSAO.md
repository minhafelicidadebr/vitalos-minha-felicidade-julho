# Handoff — continuação em outra conta Claude Code

> Escrito em 2026-07-08 porque os créditos semanais da conta atual esgotaram
> (retornam domingo). Este documento existe para que **outra conta Claude
> Code, no mesmo computador/repositório**, retome exatamente de onde parei —
> sem perder contexto, sem repetir trabalho, sem violar nenhuma doutrina já
> estabelecida nesta sessão longa (iniciada com Fase 2 SaaS, passou pelo Arco
> da Prova, Mensurar Vivo, e está no meio da Academia Viva 2.0).

## 0. Leia isto primeiro, nesta ordem

1. **`CLAUDE.md`** (raiz do repo) — stack real, estrutura, regras invioláveis.
2. **`docs/SKILL_MESTRA_FABLE5.md`** — a meta-skill que governa TODA ação de
   desenvolvimento premium neste projeto (postura, ritual ToT, tríade
   engine/mock/rota, invariantes, auto-auditoria). **Obrigatório antes de
   escrever qualquer código.**
3. **Memória local do Claude Code**, se a nova conta tiver acesso ao mesmo
   perfil de sistema operacional (mesma pasta de usuário Windows):
   `C:\Users\FIB2030\.claude\projects\C--Users-FIB2030-claude-code\memory\`
   — em especial `project_vitalos_fase2.md` (o diário completo de cada
   sprint desta sessão, com decisões de ToT, achados honestos e correções).
   Se a nova conta **não** enxergar essa pasta (perfil de usuário diferente),
   este documento + o histórico de commits do git são a fonte de verdade.

## 1. Estado real do repositório (confirmado agora)

- Branch `main`, **tudo commitado e pushado até o commit `3b67591`**
  ("Círculos Vivos — função mecânica para as 15 Embaixadorias, I5").
- `git fetch origin` confirmou: sem divergência, local == origin/main.
- **Um único arquivo não commitado, deliberadamente deixado como WIP:**
  `src/engine/academia/expedition-engine.ts` — engine puro da próxima fatia
  (I4, Expedições contra a Drenagem). Tem um comentário `⚠️ WIP` no topo.
  **Não está importado em lugar nenhum** (zero risco ao build/testes atuais
  mesmo sem terminar). Se este arquivo ainda estiver lá quando você retomar,
  é exatamente o ponto de partida da seção 4.
- Gate no último commit fechado (Círculos Vivos): `bunx tsc --noEmit` limpo,
  `bun test src` = **1857 testes / 177 arquivos, 0 falhas**, `bun run build`
  verde, `bun run parity` ok.

## 2. Regras de trabalho já validadas nesta sessão (não redescobrir)

- **Package manager: `bun`, nunca `npm`/`yarn`.**
- **Nunca dar push sem pedir confirmação explícita ao founder antes**, a
  cada push (não vale para pushes futuros só porque um foi aprovado antes).
  Use a ferramenta de pergunta ao usuário; ele normalmente responde "sim,
  pode dar push" quando o gate está verde.
- **Sempre `git fetch origin` antes de qualquer push**, para checar
  divergência.
- **Gate completo antes de todo commit**: `bunx tsc --noEmit` → `bun test
  src` → `bun run build` → `bun run parity` — todos verdes, sem exceção
  (CLAUDE.md invariante 11).
- Depois de `bun run build`, se **nenhuma rota nova** foi adicionada,
  descarte o ruído de regeneração: `git checkout -- src/routeTree.gen.ts`.
  Se uma rota nova FOI adicionada, mantenha o diff uma vez (ele registra a
  rota), descarte builds subsequentes.
- **Nunca confiar cegamente em blueprints/docs** — sempre verificar o
  código real antes de desenhar cima de uma suposição. Isso já corrigiu
  erros reais nesta sessão (ex.: um comentário que eu mesmo escrevi dizendo
  "Celebração do Jardineiro não existe" quando na verdade eu já tinha
  construído — descoberto ao notar tarefas concluídas que eu não lembrava
  de ter feito, sinal de que o contexto da conversa foi compactado).
- **Verificação de PDF**: não há rasterizador de PDF neste ambiente Windows.
  Gero o PDF real via `bun run <script>.ts` (jsPDF roda headless) e inspeciono
  bytes/páginas — é prova real, mas não é confirmação visual de pixels.
- **Preview em browser ficou bloqueado a sessão inteira**: o `launch.json`
  real (pasta-pai `C:\Users\FIB2030\claude code\.claude\launch.json`, NÃO o
  `.claude/launch.json` dentro do próprio repo, que é um decoy) fixa
  `vitalos-dev` na porta 8080 (strictPort do lovable-config), e outra sessão
  concorrente (`kiro-nr1-dev`, projeto `kiro-playbook-nr1-julho`) ocupava a
  porta a sessão inteira. **Não editar esse config compartilhado nem matar o
  processo alheio.** Alternativa usada com sucesso repetidas vezes: escrever
  um script `.ts` temporário na raiz do projeto que importa o pack JSON real
  + os engines reais + os mocks, roda a composição de ponta a ponta, imprime
  o resultado, depois `rm` o script. Isso prova a composição real sem
  depender do browser.
- **`bun test src` tem um flake conhecido e documentado**: ocasionalmente
  "1 fail" aparece por estado global de `mock.module`; rodar de novo
  imediatamente costuma dar 0 fail. Não é regressão real — mas sempre
  confirme com um rerun antes de assumir isso.

## 3. Onde a Academia Viva 2.0 está (7 invenções do blueprint)

Doc mestre: `docs/PLANO_ACADEMIA_VIVA_2.0.md`.

| # | Nome | Status |
|---|---|---|
| I1 | Sementes Vivas (loja do bem-comum) | ✅ construído (demo), `/reconhecimento` |
| I2 | Diploma Vivo | ✅ construído (v1 sem migration), `/diploma` |
| I3 | Loop Vivo da Semana | ✅ construído, `/loop-vivo` |
| I4 | Expedições contra a Drenagem | 🔶 **EM PAUSA — só o engine puro, sem testes** |
| I5 | Círculos Vivos | ✅ construído, seção nova em `/embaixador` |
| I6 | Duplas de Prática + Celebração do Jardineiro | 🔶 metade feita: Celebração ✅ (`/reconhecimento`); Duplas de Prática ❌ não iniciada |
| I7 | Diário de Prática Viva | ✅ construído, `/diario` |

**Total: 5,5 de 7 fechadas.** Restam I4 (terminar) e Duplas de Prática
(metade de I6, não iniciada).

## 4. Próximo passo imediato: terminar I4 (Expedições contra a Drenagem)

### O que já foi decidido e verificado (não redescobrir)

Um agente de investigação confirmou, antes de eu escrever o engine, que a
seleção do antagonista e a condição de derrota podem ser **genuinamente
reais** (não mock-first como Vitrine/Diploma foram, porque a infraestrutura
de medição já existe e está em produção):

- `rankDriversByExposure(registry, exposures)` em
  `src/engine/nr1/crosswalk-engine.ts:192-237` — ranking real dos 12 drivers
  canônicos por exposição medida (COPSOQ real, k-anon-gated). Já alimenta
  `/matriz` e `/drivers` em produção via
  `src/lib/evolucao/reavaliacao-real.server.ts`.
- `buildReavaliacao()` em `src/engine/nr1/reavaliacao-engine.ts:177-291` —
  `ReavaliacaoResult.drivers: DriverEvolution[]` tem `delta`/`reduction`/
  `improved` por driver, e `ReavaliacaoEfficacy` já tem o gate de "medida
  implementada E mantida no tempo" (Guia MTE 11.4.4) — é literalmente a
  "condição de derrota com prova" que o blueprint pede.
- **O que NÃO existe e precisa ser inventado**: o bestiário (nomes dos 8
  antagonistas + qual driver cada um combate), um pool coletivo de
  "expedição" (dedupe por pessoa — o único pool org-wide hoje é
  `bosque_bem_comum`, sabor CSR, não sabor "dano ao antagonista"), badges
  coletivos, e o conceito de "capítulo" por semana (não existe — a unidade
  real é "temporada" de 13 semanas em `season-engine.ts`).

**Decisão de escopo (ToT já feito, score ~8,1):** v1 = bestiário + seleção
real do antagonista + status com prova, **adiando honestamente** o pool
coletivo e os badges coletivos para v2 (não inventar infraestrutura de jogo
que não existe só para "completar" o feature).

### O que já está escrito

`src/engine/academia/expedition-engine.ts` (WIP, tsc limpo, SEM testes
ainda):

- `AntagonistDef` — `{id, name, tagline, counteredBy: string[], finalBoss?}`.
- `selectSeasonAntagonist(bestiary, needs: DriverExposureNeed[])` — caminha
  o ranking real pior-primeiro, devolve o primeiro antagonista combatível.
  `null` quando não há medição (honestidade: sem dado, sem inimigo).
- `assessAntagonist(antagonist, drivers: DriverEvolution[], efficacy)` →
  `"dominando" | "recuando" | "derrotado"`. Derrota exige `improved` E
  `efficacy.driverIds.includes(driverId)` E não estar em
  `efficacy.lapsedDriverIds` (eficácia plena, nunca só melhora pontual).
  `reductionLabel(reduction)` declara o tamanho do efeito honestamente
  (marginal/pequeno/moderado/grande — nunca infla).
- Regra especial do **Cinismo** (`finalBoss: true`, sem `counteredBy`): só
  cai com `efficacy.ofWhichImproved >= 1` (ciclo fechado com evidência,
  verbatim do cânone).
- `assessBestiary(bestiary, drivers, efficacy)` — o estado dos 8 de uma vez.

### O que falta (nesta ordem — siga o padrão das 6 sprints anteriores)

1. **`expedition-engine.test.ts`** (~16 testes, mesmo rigor das sprints
   anteriores): cobrir `selectSeasonAntagonist` (null sem medição, escolhe
   o pior driver combatível, pula driver sem antagonista correspondente),
   `assessAntagonist` (os 3 status, o gate de eficácia plena vs. só melhora,
   `reductionLabel` nos 4 buckets, o Cinismo nos 3 estados), determinismo.
2. **Pack**: seção `collectiveNarrative` em `gamification-economy.json` com
   os 8 antagonistas do cânone §1.5 (nomes exatos: A Sobrecarga, O Silêncio,
   A Névoa, A Invisibilidade, O Atrito, A Injustiça Percebida, A Desconexão,
   O Cinismo) + `counteredBy` usando os IDs reais de driver de
   `src/mocks/nr1-crosswalk-mock.ts` (`carga`, `confianca`, `clareza`,
   `lideranca`, `apoio`, `justica`, `inclusao`, `proposito`, `aprendizagem`,
   `realizacao`, `futuro`, `autonomia` — 12 drivers, mapear cada antagonista
   ao(s) driver(s) mais coerente(s), ex.: `carga`→A Sobrecarga,
   `justica`→A Injustiça Percebida, `apoio`→A Desconexão, `confianca`→O
   Silêncio). O Cinismo é `finalBoss: true`, sem `counteredBy`. Schema Ajv
   exigindo os 8 ids canônicos (mesmo padrão de `weeklyLoop` exigindo os 7
   passos). Leitor `getCollectiveNarrative()` em `gamification-engine.ts`
   (mesmo padrão de `getWeeklyLoopConfig`/`getCirclesConfig`).
3. **Rota `/expedicao`**: compor os MESMOS dados reais que já alimentam
   `/matriz` e `/drivers` (`rankDriversByExposure`) + uma reavaliação DEMO
   determinística (não existe reavaliação real disponível fora de sessão
   org real — seguir o padrão real/demo já usado em `/plano-nr1` e
   `/evolucao-nr1`: mock quando sessão demo, real quando há org). Mostrar:
   antagonista da temporada com o porquê citado (driver real + score),
   bestiário completo com status de cada um, nota honesta declarando que o
   pool coletivo e badges são v2. Nav wiring (`NAV_ROUTES` +
   `NAV_GROUPS` em `AppShell.tsx`, `navigation` no `enterprise.pack.json`).
4. **Gate completo** (seção 2) + memória (se a nova conta tiver acesso à
   pasta de memória, seguir o padrão de todas as entradas anteriores em
   `project_vitalos_fase2.md` — cabeçalho com data, ToT, o que foi
   entregue, verificação, estado do blueprint depois) + commit + fetch +
   **pedir confirmação de push ao founder antes de dar push**.

### Depois de I4: próxima candidata natural

**Duplas de Prática** (a outra metade do I6) — precisa de um conceito de
consentimento em VIA-T que HOJE NÃO EXISTE (`src/engine/viat/` só computa/
exibe, nunca "compartilhar força com o time"). É mais nova
algoritmicamente (pareamento bilateral + anti-conluio) — um agente de
investigação já mapeou isso em detalhe nesta sessão; se a memória local não
estiver acessível, vale rodar uma investigação nova antes de desenhar.

## 5. Convenções de código a manter (para não quebrar o padrão de 7 sprints)

- **Engine puro, zero I/O, zero import de `domain/`, zero React** — vive em
  `src/engine/<área>/*.ts`, testes co-localizados `*.test.ts`.
- **Vocabulário sempre do pack** (`gamification-economy.json` +
  `domain-pack.schema.json` + leitor em `gamification-engine.ts` que
  retorna `null` quando o pack não declara a seção — a UI esconde a seção
  inteira nesse caso).
- **Mock determinístico** em `src/mocks/*.ts`, nunca aleatório.
- **Store de sessão** (quando a feature precisa de estado mutável na demo):
  Zustand + `persist`, mesmo idioma de `seed-economy-store.ts`/
  `practice-journal-store.ts`/`celebration-store.ts`/`circle-session-store.ts`
  — base mock imutável + delta de sessão.
- **Composição entre sprints, não acumulação**: sempre que uma fatia nova
  puder reusar um sinal real de uma fatia anterior (em vez de inventar um
  mock isolado), prefira compor. Isso já rendeu 3 composições vivas nesta
  sessão: Diário→Diploma (prática alimenta elegibilidade), Diário+Celebração
  →Loop Vivo (dois passos do ritual ficam reais), Círculos→Diário (o
  compromisso do fechamento da roda vira registro no diário da pessoa).
- **Privacidade por schema, não por política**, sempre que fizer sentido: o
  tipo de dado em si não tem o campo sensível (ver `CircleSession` sem
  conteúdo, `wave_responses` sem identidade).
- **k-anonimato ≥ 5** em qualquer agregado coletivo — sem exceção.
- **Nunca inflar mock para "caminho feliz" artificial** — se um dado real
  já existente (ex.: Pomar da Equipe com só 3 contribuintes) protege por
  k-anon, deixe a proteção aparecer honestamente na demo em vez de mudar o
  número para forçar um resultado bonito.

## 6. Se algo neste documento estiver desatualizado

Este documento descreve o estado em 2026-07-08. Se a nova sessão notar
qualquer divergência entre o que está escrito aqui e o código real
(arquivo que não existe mais, função renomeada, etc.), **confie no código,
não neste documento** — e se possível, atualize esta seção ou apague-a
depois que I4 estiver fechado, para não virar lixo histórico.
