# CLAUDE.md — 4 Lentes VITA™

> Leia este arquivo por completo antes de qualquer alteração.
> Descreve o projeto **como ele existe hoje** — auditado do código real.

---

## 📌 Repositório oficial

`https://github.com/minhafelicidadebr/app-vita-happiness-org-fable5.git`

---

## 🎯 O que é este projeto

**4 Lentes VITA** — plataforma SaaS B2B, o primeiro "Sistema Operacional da Vitalidade
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
- Paleta VITA em tokens oklch
- Dark mode com persistência em localStorage
- A11yProvider (redução de movimento, alto contraste, escala de fonte)
- PackProvider com Ajv: 4 JSONs carregados e validados
- **[Pack:enterprise] ✅ válido — 4 Lentes Enterprise v1.0.0** (confirmado)
- Shell institucional + roteamento TanStack + 404 + error boundary
- TypeScript strict sem erros de build

---

## 🗺️ Mapa dos 21 blocos

| #     | O que constrói                               | Arquivos principais                                     |
| ----- | -------------------------------------------- | ------------------------------------------------------- |
| ✅ 0  | Fundação                                     | engine/pack, design-system, shell, routes               |
| ✅ 1  | RBAC + persona switcher                      | engine/rbac/rbac.ts + AppShell (nav do pack × papel)    |
| ✅ 2  | Mock data layer (hooks tipados)              | src/mocks/hooks.ts (useOrg/useIvo/useTeamIvo/useSeason) |
| ✅ 3  | Motor IVO + radar 4 lentes                   | engine/index/ivo-engine.ts + routes/ivo.tsx             |
| ✅ 4  | Dashboard Colaborador                        | app/dashboards/colaborador + /colaborador               |
| ✅ 5  | Dashboard Líder (n≥5 visível)                | app/dashboards/lider + /lider                           |
| ✅ 6  | Dashboard RH/CHRO flagship                   | app/dashboards/rh + /rh (heatmap, kanban GRO)           |
| ✅ 7  | C-Level + SST/CIPA + Holding                 | /clevel, /sst, /holding                                 |
| ✅ 8  | Trust Ledger                                 | engine/trust + /confianca                               |
| ✅ 9  | Pulses 60s                                   | engine/index/pulse-engine.ts + /pulse                   |
| ✅ 10 | Nudge Engine MVP                             | engine/nudges + NudgesCard no colaborador               |
| ✅ 11 | Gamificação engine + Culture Lab             | engine/gamification + engine/lab + /lab                 |
| ✅ 12 | FlorescerIA mockada (10 modos)               | engine/ai + /floresceria                                |
| ✅ 13 | Academia do Florescimento                    | /academia (trilhas por papel)                           |
| ✅ 14 | Embaixadorias (15)                           | /embaixadorias                                          |
| ✅ 15 | Domínio B + COPSOQ agregado                  | /sst (inventário, escuta, checklist, COPSOQ 9 dim.)     |
| ✅ 16 | Vitality P&L                                 | engine/pnl + /pnl                                       |
| ✅ 17 | Evidências + Relatórios + Selo Empresa Viva  | /relatorios                                             |
| ✅ 18 | Sinais Vivos                                 | engine/signals + SignalsCard no /rh                     |
| ✅ 19 | Modo Quiosque (sessão efêmera)               | /quiosque                                               |
| 🔲 20 | Polimento UX premium                         | global (reservado ao Lovable)                           |
| ✅ 21 | QA — rotas 200, lint 0 erros, prettier       | smoke test + verificação engine≠domain                  |
| ✅ +  | ESG · ODS · GRI · FIB (extra)                | engine/esg + /esg (deriva do IVO, k-anon, 9 testes)     |

### Rotas implementadas

`/` (home + grid de painéis) · `/ivo` · `/colaborador` · `/lider` · `/rh` ·
`/clevel` · `/sst` · `/holding` · `/confianca` (Trust Ledger) · `/pulse` ·
`/lab` (Culture Lab) · `/floresceria` · `/pnl` · `/academia` ·
`/embaixadorias` · `/relatorios` (evidências + Selo) · `/esg` (ESG/ODS/GRI/FIB) ·
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

| Arquivo | O que contém |
|---|---|
| `docs/ARQUITETURA_CIENTIFICA.md` | **Skill de orientação mestre** — 4 camadas, mapa de instrumentos, o que muda no app |
| `docs/instrumentos/PERMA_TRABALHO.md` | PERMA 15 itens (BR 2026), psicometria, mapeamento → pilares IVO |
| `docs/instrumentos/VIA_T.md` | VIA-T 24/48 itens, ICUFT, guardrails, missões, matriz VIA-T × PERMA+V |
| `docs/instrumentos/COPSOQ_NR1.md` | COPSOQ II / NCOPSII, NR-1, Guia MTE 2026, separação Domínio B |
| `docs/instrumentos/PLAYBOOK.md` | Work-Wellbeing Playbook 2.0 — protocolos por pilar/força/risco |

**Arquitetura de 4 camadas (nunca misturar):**
- Camada 1 RISCO: COPSOQ/NR-1 → Domínio B → `/sst`
- Camada 2 FLORESCIMENTO: PERMA → IVO/Pulses → `/ivo`, `/pulse`
- Camada 3 FORÇAS: VIA-T v1 exploratório → `/viat` (PRÓXIMO módulo)
- Camada 4 AÇÃO: Playbook → Culture Lab → `/lab`

**Próximo módulo a construir: VIA-T (`/viat`)**
- `src/engine/viat/viat-engine.ts` (pure engine: 24 forças, 6 virtudes, ICUFT)
- `src/mocks/viat-mock.ts`
- `src/routes/viat.tsx` (assessment → devolutiva → missão 7 dias)
- Disclaimer obrigatório: "VIA-T v1 exploratório — não é diagnóstico psicológico"
- k-anonimato: n≥5 (contextos sensíveis: n≥10)

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
