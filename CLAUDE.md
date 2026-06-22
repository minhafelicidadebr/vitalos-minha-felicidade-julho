# CLAUDE.md — 4 Lentes VitalOS™

> Leia este arquivo por completo antes de qualquer alteração.
> Descreve o projeto **como ele existe hoje** — auditado do código real.

> 🧭 **PRIMEIRA LEITURA OBRIGATÓRIA:** `docs/SKILL_MESTRA_FABLE5.md` — a meta-skill que
> faz você raciocinar como o **Fable 5** (o supercomitê fundador que planejou este app).
> Ela governa TODA ação de desenvolvimento premium: postura, ritual ToT, a tríade
> engine/mock/rota, as assinaturas Fable 5, invariantes e auto-auditoria. Quando o usuário
> pedir "nível estado da arte / ToT / alta performance", isso já é o default desta skill.

---

## 📌 Repositório oficial

`https://github.com/minhafelicidadebr/vitalos-org-fable5.git`

---

## 🎯 O que é este projeto

**4 Lentes VitalOS™** — plataforma SaaS B2B, o primeiro "Sistema Operacional da Vitalidade
Organizacional". Mede, educa, transforma e evolui a vitalidade pelas 4 Lentes
(EU · NÓS · LIDERANÇA · ORGANIZAÇÃO), com compliance NR-1 educativo, gamificação ética
e ESG/ODS. Padrão unicórnio. Categoria: VitalOS.

---

## ⚙️ Stack real (auditada — não presuma)

| Tecnologia          | Versão  | Nota crítica                          |
| ------------------- | ------- | ------------------------------------- |
| React               | 19.2    |                                       |
| TypeScript          | 5.8     | strict mode                           |
| Vite                | 8.0     | via @lovable.dev/vite-tanstack-config |
| TanStack Router     | 1.168   | file-based — rotas em src/routes/     |
| TanStack Start      | 1.167   | SSR shell                             |
| TanStack Query      | 5.83    |                                       |
| Tailwind            | 4.2     | CSS-first — SEM tailwind.config.js    |
| shadcn/ui           | —       | src/components/ui/                    |
| Zustand             | 5.0     |                                       |
| Framer Motion       | 12.40   |                                       |
| Recharts            | 2.15    | dataviz — usar para radar IVO         |
| Ajv + ajv-formats   | 8.20    | validação Domain Pack no boot         |
| Zod                 | 3.24    |                                       |
| **Package manager** | **bun** | SEMPRE bun — nunca npm/yarn           |

**Backend:** Lovable Cloud — não instale Supabase manualmente.
**Regra da stack:** rotas em src/routes/ (file-based). Cores via tokens oklch em
src/styles.css — nunca hex solto em componente.

---

## 📁 Estrutura real — estado atual

```
src/
  engine/                          # motor setor-agnóstico
    pack/
      PackProvider.tsx             # ✅ carrega pack, valida Ajv, expõe usePack()
      pack-types.ts                # ✅ DomainPack, ProprietaryIndex, PackStatus
      index.ts                     # ✅
    index/        .gitkeep         # 🔲 PRÓXIMO — motor IVO (Bloco 3)
    rbac/         .gitkeep         # 🔲 Bloco 9
    gamification/ .gitkeep         # 🔲 Bloco 11
    nudges/       .gitkeep         # 🔲 Bloco 10
    lab/          .gitkeep         # 🔲 Bloco 11 (Culture Lab)
    signals/      .gitkeep         # 🔲 Bloco 18
    trust/        .gitkeep         # 🔲 Bloco 8
    pnl/          .gitkeep         # 🔲 Bloco 16
    ai/           .gitkeep         # 🔲 Bloco 12
    esg/          esg-engine.ts    # ✅ tradutor IVO→ESRS S1/ODS/GRI/FIB (+ .test.ts)

  domain/packs/enterprise/
    enterprise.pack.json           # ✅ pack oficial — validado
    ivo-framework.json             # ✅ 4 lentes, 16 pilares, pesos, fórmula
    gamification-economy.json      # ✅ XP, kudos, missões seed, badges
    domain-pack.schema.json        # ✅ contrato JSON Schema

  app/
    shell/
      A11yProvider.tsx             # ✅ redução de movimento, contraste, fonte
      AppShell.tsx                 # ✅ header + área + rodapé
      MockDataProvider.tsx         # ✅ stub vazio — preencher Bloco 2
      ThemeToggle.tsx              # ✅ dark mode + persistência
    dashboards/ .gitkeep           # 🔲 Blocos 4–9

  routes/
    __root.tsx                     # ✅ QueryClient→A11y→Pack→Mock→Outlet
    index.tsx                      # ✅ home com status do pack
    design-system.tsx              # ✅ showcase completo
    README.md

  design-system/tokens.ts          # ✅ referência TypeScript dos tokens
  mocks/          .gitkeep         # 🔲 preencher Bloco 2
  components/ui/                   # ✅ shadcn completo
  styles.css                       # ✅ paleta oklch + dark + a11y-*
```

---

## ✅ Bloco 0 entregue — não recriar

- Design system completo (/design-system)
- Paleta VitalOS™ em tokens oklch
- Dark mode com persistência em localStorage
- A11yProvider (redução de movimento, alto contraste, escala de fonte)
- PackProvider com Ajv: 4 JSONs carregados e validados
- **[Pack:enterprise] ✅ válido — 4 Lentes Enterprise v1.0.0** (confirmado)
- Shell institucional + roteamento TanStack + 404 + error boundary
- TypeScript strict sem erros de build

---

## 🗺️ Mapa dos 21 blocos

| #     | O que constrói                              | Arquivos principais                                                                    |
| ----- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| ✅ 0  | Fundação                                    | engine/pack, design-system, shell, routes                                              |
| ✅ 1  | RBAC + persona switcher                     | engine/rbac/rbac.ts + AppShell (nav do pack × papel)                                   |
| ✅ 2  | Mock data layer (hooks tipados)             | src/mocks/hooks.ts (useOrg/useIvo/useTeamIvo/useSeason)                                |
| ✅ 3  | Motor IVO + radar 4 lentes                  | engine/index/ivo-engine.ts + routes/ivo.tsx                                            |
| ✅ 4  | Dashboard Colaborador                       | app/dashboards/colaborador + /colaborador                                              |
| ✅ 5  | Dashboard Líder (n≥5 visível)               | app/dashboards/lider + /lider                                                          |
| ✅ 6  | Dashboard RH/CHRO flagship                  | app/dashboards/rh + /rh (heatmap, kanban GRO)                                          |
| ✅ 7  | C-Level + SST/CIPA + Holding                | /clevel, /sst, /holding                                                                |
| ✅ 8  | Trust Ledger                                | engine/trust + /confianca                                                              |
| ✅ 9  | Pulses 60s                                  | engine/index/pulse-engine.ts + /pulse                                                  |
| ✅ 10 | Nudge Engine MVP                            | engine/nudges + NudgesCard no colaborador                                              |
| ✅ 11 | Gamificação engine + Culture Lab            | engine/gamification + engine/lab + /lab                                                |
| ✅ 12 | FlorescerIA mockada (10 modos)              | engine/ai + /floresceria                                                               |
| ✅ 13 | Academia do Florescimento                   | /academia (trilhas por papel)                                                          |
| ✅ 14 | Embaixadorias (15)                          | /embaixadorias                                                                         |
| ✅ 15 | Domínio B + COPSOQ agregado                 | /sst (inventário, escuta, checklist, COPSOQ 9 dim.)                                    |
| ✅ 16 | Vitality P&L                                | engine/pnl + /pnl                                                                      |
| ✅ 17 | Evidências + Relatórios + Selo Empresa Viva | /relatorios                                                                            |
| ✅ 18 | Sinais Vivos                                | engine/signals + SignalsCard no /rh                                                    |
| ✅ 19 | Modo Quiosque (sessão efêmera)              | /quiosque                                                                              |
| 🔲 20 | Polimento UX premium                        | global (reservado ao Lovable)                                                          |
| ✅ 21 | QA — rotas 200, lint 0 erros, prettier      | smoke test + verificação engine≠domain                                                 |
| ✅ +  | ESG · ODS · GRI · FIB (extra)               | engine/esg + /esg (deriva do IVO, k-anon, 9 testes)                                    |
| ✅ +  | VIA-T v1 Exploratório (extra)               | engine/viat + /viat (24 forças, ICUFT, 29 testes)                                      |
| ✅ +  | Cronograma M.E.T.E. (extra)                 | engine/season + /temporada (plano anual, 22 testes)                                    |
| ✅ +  | Simulador de Trajetória (extra)             | engine/forecast + /trajetoria (compõe IVO+P&L+ESG, 25)                                 |
| ✅ +  | Diagnóstico Integrado (extra)               | engine/priority + /prioridades (compõe IVO+forecast+ESG+embaixadorias, 14)             |
| ✅ +  | Camada de Evidência (extra)                 | engine/lab/evidence-engine + /experimentos (diff-in-diff honesto, 16)                  |
| ✅ +  | Panorama Executivo (extra)                  | engine/panorama + /panorama (sintetiza o arco inteiro, 18)                             |
| ✅ +  | FlorescerIA Proativa (extra)                | engine/ai/agent-engine + /copiloto (propõe+aprova, guardrails, 12)                     |
| ✅ +  | Benchmark Setorial (extra)                  | engine/benchmark + /benchmark (k-anon entre tenants, moat de dados, 15)                |
| ✅ +  | Privacidade × FlorescerIA (extra)           | engine/trust/consent-engine + /privacidade (consentimento gateia a IA, 18)             |
| ✅ +  | Sinais Vivos · Percepção×Comportamento      | engine/signals (reconcileSignals quadrantes) + /sinais (gateado por consentimento, 16) |
| ✅ +  | Selo Empresa Viva (motor de certificação)   | engine/certification + /selo (elegibilidade computada do arco, não comprada, 15)       |
| ✅ +  | FIB-T · lente de ecossistema (Furtado 2020) | engine/fibt + /fibt (32 itens, 3 fatores, 9 domínios, ponte ESG, 10)                   |
| ✅ +  | Relatório Global ESG anual                  | engine/esg-report + /relatorio-global (síntese E/S/G + ODS dos 5 instrumentos, 10)     |

### Cobertura de testes (bun test src)

335 testes / 26 arquivos, 0 falhas. Engines com testes: esg (9), viat (29),
ivo (16), pnl (16), pulse (9), gamification (13), season (22), forecast (25),
priority (14), evidence (16), panorama (18), agent (15), benchmark (15),
consent (18), signals (16), certification (15), fibt (10), esg-report (10),
rbac (7), nudges (8), pack-contract (8), trend (11),
season-consistency (3), **journey-consistency (5, fonte única da jornada)**

> Nota de arquitetura — fonte única: (1) o `MOCK_SEASON` do dashboard do colaborador
> **deriva** de `computeSeasonOverview(ANNUAL_PLAN, …)`. (2) A **jornada canônica**
> (`src/domain/journey.ts`, espinha Risco→Bem-Comum→Florescimento→Forças→Síntese) é a
> ÚNICA fonte da sequência: `/temporada` (ANNUAL_PLAN), `/programa` (PROGRAMA_JOURNEY) e
> `/relatorio-global` (JOURNEY_QUARTERS) todos derivam dela — não podem divergir.

- **integração ponta-a-ponta (10)** + **multipack (prova setor-agnóstico em 5 frameworks:
  IVO/Empresa, IEV/Escola, IGV/Governo, IVC/Condomínio, IVS/Saúde)**. Typecheck limpo.

> **Estado atual: `bun test src` = 860 testes / 104 arquivos, 0 falhas. Build verde, tsc limpo.**
> **Atlas Multissetorial** (`/atlas`): portfólio vivo de TODOS os packs registrados via
> `engine/portfolio/cross-sector-engine.ts` (puro, compõe calculateIVO+buildTrend). Dirigido pelo
> registry — um 6º pack aparece sozinho. Nav "sectors" repontado para cá (`/setores` legada).
> **Copiloto Setorial Aterrado** (`/copilota`): chat de IA pack-aware (personas Flora/Aila/Cida/
> Vivi/Cora), anti-alucinação por grounding+citações (`engine/ai/copilot-engine.ts` +
> `mocks/copilot-knowledge.ts`), 4 POVs, gating por audiência, ponte Fase 2 (`lib/ai/copilot.functions.ts`).
> **5 Domain Packs registrados** (`registry.ts`): Empresa · Escola · Governo (CidadanIA/IGV) ·
> Condomínio (ConvivIA/IVC) · Saúde (CuidarIA/IVS). O `PackSwitcher` no header troca o setor ao
> vivo (Engine ≠ Domínio).
> Cada pack novo = framework JSON + pack.json + mock de ciclo + sector-data + home-mock de
> audiência + rota overview. Governo e Condomínio espelham o cânone de `/escola`: home adaptativa
> por audiência (gestão vê índice coletivo; servidor/morador veem só participação) via o
> `audience-engine` genérico. Ondas próprias por setor em `campaign-mock.ts` (`getSectorWaves`).

> Nav: agrupada por ciclo do produto (Medir·Agir·Provar·Estratégico·Comunidade·
> Confiança) — `NAV_GROUPS` vive HARDCODED no `AppShell.tsx` (refactor visual do
> Lovable). Ao adicionar rota: pack `navigation` (+`group`) + `NAV_ROUTES` +
> incluir o id no grupo certo de `NAV_GROUPS`. Coordenar com o Lovable no AppShell.

### Rotas implementadas

`/` (home + grid de painéis) · `/ivo` · `/colaborador` · `/lider` · `/rh` ·
`/clevel` · `/sst` · `/holding` · `/confianca` (Trust Ledger) · `/pulse` ·
`/lab` (Culture Lab) · `/floresceria` (modos legados) · `/copilota` (Copiloto Setorial Aterrado — chat pack-aware, anti-alucinação, POVs) · `/pnl` · `/academia` ·
`/embaixadorias` · `/relatorios` (evidências + Selo) · `/esg` (ESG/ODS/GRI/FIB) ·
`/viat` (Mapa de Forças) · `/temporada` (Cronograma M.E.T.E.) ·
`/trajetoria` (Simulador de Trajetória — IVO×P&L×ESG) ·
`/prioridades` (Diagnóstico Integrado — fila de prioridades) ·
`/experimentos` (Culture Lab · camada de evidência — da prioridade à prova) ·
`/panorama` (Panorama Executivo — o arco inteiro em uma página) ·
`/copiloto` (FlorescerIA Proativa — propõe + aprovação humana) ·
`/benchmark` (Benchmark Setorial anônimo — k-anon entre tenants) ·
`/privacidade` (Privacidade × FlorescerIA — consentimento gateia a IA) ·
`/sinais` (Sinais Vivos — percepção × comportamento, Motor 1) ·
`/selo` (Selo Empresa Viva — certificação computada do arco) ·
`/fibt` (FIB-T — lente de ecossistema, Furtado 2020) ·
`/relatorio-global` (Relatório Global ESG anual — síntese E/S/G + ODS) ·
`/programa` (Landing — hierarquia + 3 níveis de venda) ·
`/setores` (Multissetorial — prova Engine≠Domínio entre 4 packs) ·
`/escola` (Home setorial Escola — AlegrIA/IEV, home adaptativa por audiência) ·
`/governo` (Home setorial Governo — CidadanIA/IGV, home adaptativa por audiência) ·
`/condominios` (Home setorial Condomínio — ConvivIA/IVC, home adaptativa por audiência) ·
`/saude` (Home setorial Saúde — CuidarIA/IVS, home adaptativa por audiência) ·
`/atlas` (Atlas Multissetorial — portfólio vivo dos 5 packs, um motor) ·
`/evolucao` (Curva longitudinal — track record do IVO ciclo a ciclo) ·
`/metodologia` (Credibilidade — compõe a jornada canônica + M.E.T.E. + ciência + compromissos éticos) ·
`/quiosque` · `/design-system`

### Persona demo

Seletor no header (Zustand persistido, chave `vita-persona`) — 7 papéis.
A navegação inteira vem de `pack.navigation` filtrada por papel via
`engine/rbac/rbac.ts`. Item "overview" resolve para o dashboard do papel.

---

## 🚨 Regras invioláveis (requisitos de código)

1. **Engine ≠ Domínio** — src/engine nunca importa de src/domain.
   Todo vocabulário vem de usePack().t(token) ou usePack().labels.
2. **Zero label hardcoded** fora de domain/. Nunca.
3. **k-anonymity ≥ 5** — recortes com n < 5 ficam ocultos com microcopy.
   Nunca exibir dado de grupo menor que 5 respondentes.
4. **Respostas individuais nunca no cliente** — mocks entregam só agregados.
5. **XP/IVO jamais ligados a desempenho, promoção ou remuneração.**
6. **Domínio A e B estritamente separados** — dados, telas e fluxos.
7. **Disclaimers obrigatórios** — IVO: "experimental"; Domínio B: "educativo,
   não substitui PGR/profissional habilitado". Onde o pack exigir, aparece.
8. **WCAG 2.2 AA** — A11yProvider já existe, não remova nem contorne.
9. **Toda tela nova** — 4 estados: vazio, carregando, erro, mobile.
10. **Mock-first** — Lovable Cloud só na Fase 2, após MVP mock aprovado.
11. **Build verde antes de qualquer commit.** Sem exceção.
12. **Um bloco por vez.** Terminou → resumiu → build verde → commit → aguardou
    confirmação → só então próximo bloco.

---

## 🔄 Sincronização Lovable ↔ GitHub (CRÍTICO)

Sincronização bidirecional automática na branch main.

❌ NUNCA renomeie/mova/exclua este repositório — quebra a sync permanentemente.
❌ NUNCA edite os mesmos arquivos no Lovable e Claude Code ao mesmo tempo.

✅ Fluxo seguro:
git pull → trabalhe num lado só → bun run build (verde)
→ git commit → git push → aguarde Lovable sync → só então edite no Lovable.

Divisão de trabalho:
Lovable → telas, layout visual, preview, deploy, Lovable Cloud
Claude Code → motores, mocks, lógica pesada, refactors, testes

---

## 💻 Comandos

bun install instalar dependências (NUNCA npm install)
bun run dev servidor local
bun run build build de produção (deve ficar verde)
bun run lint lint
bun run format prettier
bun run test testes de unidade dos engines (bun test)

---

## 📚 Base científica e referências — /docs/

> Leia ARQUITETURA_CIENTIFICA.md ANTES de implementar qualquer módulo de mensuração.

| Arquivo                               | O que contém                                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `docs/SKILL_MESTRA_FABLE5.md`         | **🧭 Meta-skill — A Mente Fable 5.** Postura, ritual ToT, tríade, assinaturas, invariantes, auto-auditoria. Lê-se ANTES de tudo. |
| `docs/ARQUITETURA_CIENTIFICA.md`      | **Skill de orientação mestre** — 4 camadas, mapa de instrumentos, o que muda no app                                              |
| `docs/instrumentos/PERMA_TRABALHO.md` | PERMA 15 itens (BR 2026), psicometria, mapeamento → pilares IVO                                                                  |
| `docs/instrumentos/VIA_T.md`          | VIA-T 24/48 itens, ICUFT, guardrails, missões, matriz VIA-T × PERMA+V                                                            |
| `docs/instrumentos/COPSOQ_NR1.md`     | COPSOQ II / NCOPSII, NR-1, Guia MTE 2026, separação Domínio B                                                                    |
| `docs/instrumentos/PLAYBOOK.md`       | Work-Wellbeing Playbook 2.0 — protocolos por pilar/força/risco                                                                   |

> 📦 **Template portátil (não é doutrina deste projeto):** `templates/SKILL_UNIVERSAL_MENTE_FABLE5.md`
> é um modelo reutilizável da inteligência Fable 5 para instanciar em OUTROS projetos. Para o
> 4 Lentes VitalOS™, a doutrina ativa continua sendo `docs/SKILL_MESTRA_FABLE5.md`.

**Arquitetura de 4 camadas (nunca misturar):**

- Camada 1 RISCO: COPSOQ/NR-1 → Domínio B → `/sst`
- Camada 2 FLORESCIMENTO: PERMA → IVO/Pulses → `/ivo`, `/pulse`
- Camada 3 FORÇAS: VIA-T v1 exploratório → `/viat` ✅ construído
- Camada 4 AÇÃO: Playbook → Culture Lab → `/lab`

**Orquestração temporal: Cronograma M.E.T.E. (`/temporada`)** ✅ construído

- `src/engine/season/season-engine.ts` (puro: plano anual → estado operacional)
- `src/mocks/season-mock.ts` (4 temporadas × 13 semanas, cada lente = 1 temporada)
- `src/routes/temporada.tsx` (timeline anual + ciclo M.E.T.E. + atividades por papel)
- Ciclo: Mensurar (aplicar instrumento) → Educar → Transformar → Evoluir
- T1 IVO/PERMA · T2 VIA-T · T3 COPSOQ/NR-1 · T4 Re-IVO + ESG/Selo

SUPER_PROMPT_GENESIS_4LENTES_VITA.md fonte da verdade de execução (21 blocos)
FRAMEWORK_MESTRE_EMPRESA_VIVA.md fundamento científico, universo, negócio

Nota: onde os documentos mencionam "Vite puro / React Router / Supabase",
leia como "TanStack Start / TanStack Router / Lovable Cloud". A arquitetura
é idêntica; só o vocabulário é anterior ao template atual.

---

## 🎨 Paleta (sempre via token — nunca hex direto)

--color-primary Verde profundo #0B3D2E
--color-accent Dourado #C9A227
--color-background Superfície #F8F7F4
--color-foreground Tinta #1C2A24

Dark mode nativo. "Premium corporativo humano." Sem neon. Sem infantilização.
