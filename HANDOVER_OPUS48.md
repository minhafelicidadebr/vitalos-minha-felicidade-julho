# HANDOVER — VitalOS / 4 Lentes VITA™
## Documento de Passagem de Bastão para o Opus 4.8

> **Leia TUDO antes de executar qualquer ação.** Este documento é o passaporte completo
> do projeto. Depois de ler, abra `docs/SKILL_MESTRA_FABLE5.md` — é a meta-skill que
> define como você deve raciocinar, decidir e construir neste app.

---

## 1 · O QUE É ESTE PROJETO

**4 Lentes VITA** ("VitalOS") — plataforma SaaS B2B para bem-estar organizacional. O
primeiro **Sistema Operacional da Vitalidade**: mede, educa, transforma e comprova o
florescimento das pessoas nas organizações (ciclo M.E.T.E.). Categoria nova, não feature.

**Repositório GitHub:**
`https://github.com/minhafelicidadebr/app-vita-happiness-org-fable5.git`

**Deploy:** Lovable Cloud (sincronização automática via GitHub `main`).
O Lovable puxa automaticamente qualquer push para `main`.

**Fundador/PO:** usuário não-técnico, estrategista. Comunique resultados em termos de
produto (telas, fluxos, features), não de código.

---

## 2 · ONDE VOCÊ ESTÁ (estado 2026-06-17 — pós-sprints A/B/C)

### 2.1 Testes e build
- **475 testes / 43 arquivos — 0 falhas** ✅
- `bun run build` — verde ✅
- `bun x tsc --noEmit` — limpo ✅

### 2.2 Horizonte 1 — COMPLETO ✅

O mock-first MVP está entregue ponta-a-ponta. O ciclo M.E.T.E. corre completo:

```
Mensurar (onda + questionário)
  → Educar (devolutiva contextual)
    → Transformar (priority → lab → experimentos → copiloto)
      → Evoluir (trend / evolucao / fechamento)
```

### 2.2b Sprints premium Fable 5 concluídos (2026-06-17)

| Sprint | Rota | Engine | Testes | O que entrega |
|--------|------|--------|--------|---------------|
| **A** | `/plano-acao` | `action-plan-engine` | 14 | Plano Operacional Trimestral: fila de prioridades → cronograma 13 semanas, escalonamento por embaixadoria, status futuro/em_andamento/concluido |
| **B** | `/impacto` | `impact-engine` | 14 | Relatório de Impacto board-ready: delta IVO por lente, ROI, nível de evidência, maturidade do programa |
| **C** | `/` (landing) | — | — | Seção "Números Vivos": 6 cards com métricas do ciclo demo computadas pelos motores reais |

**Fix estrutural:** Culture Lab nav id corrigido de `action_plan` para `lab` — eliminava duplicata que quebrava testes.

**Commits:**
```
e1211e4  merge: rebase Lovable improvements (VitalOsLogo, ThemeToggle header, lenses-deep modal)
7917af1  feat(sprint-c): landing Números Vivos — 6 cards de prova
d17bdef  feat(sprint-b): /impacto — Relatório de Impacto do Programa
e8c2cb3  feat(sprint-a): /plano-acao — Plano Operacional Trimestral
eac42e8  (Lovable) improvements to landing  ← puxado via rebase
43b5c9a  feat(gate): landing em / + portão demo + /painel
```

### 2.3 Engines implementados (`src/engine/`)

| Diretório          | Engine                     | Testes | O que faz                                      |
| ------------------ | -------------------------- | ------ | ---------------------------------------------- |
| `index/`           | ivo-engine, pulse-engine   | 25     | IVO 2.0 (4 lentes, 16 pilares) + pulsos 60s   |
| `esg/`             | esg-engine                 | 9      | IVO→ESRS S1/ODS/GRI/FIB                       |
| `viat/`            | viat-engine                | 29     | VIA-T v1 exploratório (24 forças, ICUFT)       |
| `season/`          | season-engine              | 22     | Cronograma M.E.T.E. anual (4T × 13s)          |
| `forecast/`        | forecast-engine            | 25     | Trajetória IVO + P&L + ESG (what-if)           |
| `priority/`        | priority-engine            | 14     | Fila de prioridades composta (IVO lift)        |
| `lab/`             | evidence-engine            | 16     | diff-in-diff honesto, veredito científico      |
| `panorama/`        | panorama-engine            | 18     | Síntese executiva: 7 engines → 1 página        |
| `ai/`              | agent-engine               | 15     | FlorescerIA proativa (human-in-the-loop)        |
|                    | earlywarning-engine        | 10     | Alerta precoce: trend+signals+consent          |
|                    | orchestration-engine       | —      | M.E.T.E. orchestration (nudge → delivery)      |
|                    | grounding-engine           | —      | Resposta aterrada com fontes (anti-halluc.)    |
| `benchmark/`       | benchmark-engine           | 15     | Benchmarking setorial k-anon entre tenants     |
| `trust/`           | consent-engine             | 18     | Consentimento gateia a FlorescerIA             |
| `signals/`         | signals-engine             | 16     | Percepção × comportamento (4 quadrantes)       |
| `certification/`   | certification-engine       | 15     | Selo Empresa Viva (computado, não comprado)    |
| `pnl/`             | pnl-engine                 | 16     | Vitality P&L (custo evitado)                   |
| `gamification/`    | gamification-engine        | 13     | XP ético, kudos, missões (SDT/Octalysis)       |
| `nudges/`          | nudges-engine              | 8      | Nudge MVP (opt-in, freq cap, targeting)        |
| `rbac/`            | rbac-engine                | 7      | Nav filtrada por papel (k-anon no nav)         |
| `fibt/`            | fibt-engine                | 10     | FIB-T (Furtado 2020) — 32 itens, 9 domínios   |
| `esg-report/`      | esg-report-engine          | 10     | Relatório anual E/S/G (síntese 5 instrumentos) |
| `trend/`           | trend-engine               | 11     | Curva longitudinal IVO (momentum, projeção)    |
| `action-plan/`     | action-plan-engine         | 14     | Plano trimestral: agenda ações por embaixadoria |
| `impact/`          | impact-engine              | 14     | Relatório de impacto: delta IVO + ROI + evidência |
| `campaign/`        | campaign-engine            | 14     | Onda Ativa (dupla-visão privacidade)           |
| `survey/`          | survey-engine              | —      | Runtime de questionário (loop Onda↔Responder)  |
| `educar/`          | devolutiva-engine          | —      | Devolutiva contextual pós-resultado            |
| `academia/`        | academia-engine            | —      | Trilhas recomendadas pela lente fraca          |
| `domainb/`         | nr1-readiness-engine       | —      | NR-1 readiness (COPSOQ + checklist)            |
| `pack/`            | PackProvider, pack-types   | 8      | Carrega/valida Domain Pack (Ajv)               |

### 2.4 Rotas implementadas (`src/routes/`)

45 rotas. Grupo de nav por ciclo:

**Medir:** `/onda`, `/ivo`, `/pulse`, `/viat`, `/fibt`
**Agir:** `/colaborador`, `/lider`, `/rh`, `/clevel`, `/sst`, `/holding`, `/pnl`, `/copiloto`, `/plano-acao` ← **NOVO Sprint A**
**Provar:** `/impacto` ← **NOVO Sprint B** · `/experimentos`, `/relatorios`, `/selo`, `/panorama`, `/sinais`, `/evolucao`, `/fechamento`, `/benchmark`, `/relatorio-global`
**Estratégico:** `/trajetoria`, `/prioridades`, `/temporada`, `/esg`, `/setores`, `/privacidade`, `/escola`
**Comunidade:** `/embaixador`, `/embaixadorias`, `/academia`, `/lab`, `/floresceria`
**Confiança:** `/confianca`, `/metodologia`, `/privacidade`, `/programa`
**Entrada:** `/` (landing pública com Números Vivos ← **Sprint C**) · `/painel` (hub do app, requer senha demo)
**Outros:** `/landing` (redirect → `/`), `/devolutiva`, `/responder`, `/quiosque`, `/design-system`

### 2.5 Commits recentes (estado do `main`)

```
e1211e4  merge: rebase Lovable improvements + Sprint C  ← MAIS RECENTE
7917af1  feat(sprint-c): landing Números Vivos — 6 cards de prova
d17bdef  feat(sprint-b): /impacto — Relatório de Impacto do Programa
e8c2cb3  feat(sprint-a): /plano-acao — Plano Operacional Trimestral
eac42e8  (Lovable) improvements to landing
43b5c9a  feat(gate): landing em / + portão demo + /painel
56fe3f0  docs(handover): passaporte premium Fable 5 para Opus 4.8
```

---

## 3 · A DOUTRINA FABLE 5 — O QUE VOCÊ PRECISA INCORPORAR

> Antes de qualquer ação de desenvolvimento, leia `docs/SKILL_MESTRA_FABLE5.md` completo.
> Abaixo está o destilado operacional para ativação rápida.

### 3.1 Postura
Você não é "um assistente que entrega features". Você é o **supercomitê fundador de elite
(Fable 5)** continuando a construção de um unicórnio de categoria nova. Cada decisão deve
sobreviver a due diligence técnica, científica e jurídica.

### 3.2 A Tese (decore — toda decisão serve isto ou é vaidade)
- **VitalOS = SO da vitalidade.** "Clima se mede. Vitalidade se opera."
- **O ciclo completo:** medir → entender → agir → comprovar (concorrentes medem e param)
- **7 motores integrados** — a disrupção é a integração, não uma feature isolada
- **North Star:** Equipes Florescendo (IVO ≥ 2 temporadas + ≥ 1 transformação comprovada)
- **Moat:** dataset de eficácia de protocolos do Culture Lab (k-anon entre tenants)

### 3.3 Ritual ToT (Tree of Thoughts) — obrigatório em toda decisão relevante
1. Olhe por ≥ 3 lentes disciplinares (ciência + UX + dados + ética + negócio)
2. Gere ≥ 5 ramos: (A) mínimo viável · (B) robusto · (C) simular · (D) adiar · (E) integrar · (F) abstrair para engine
3. Pontue (0–10) por: valor · risco · custo · alinhamento tese · reusabilidade
4. Documente a escolha e a justificativa

### 3.4 A Tríade (ordem obrigatória)
```
engine puro (src/engine/) → testes (bun test) → mock (src/mocks/)
→ rota (src/routes/) → wiring (pack nav + AppShell NAV_ROUTES) → build verde → commit
```

### 3.5 As 8 Assinaturas Fable 5
1. **Compor, não acumular** — toda necessidade nova deve compor engines existentes primeiro
2. **Honestidade como feature** — fórmula visível, retornos decrescentes, banda de confiança
3. **Ciência antes de código** — leia `docs/instrumentos/` antes de qualquer módulo de mensuração
4. **Separação sagrada** — Domínio A (florescimento) ≠ Domínio B (risco); 4 camadas nunca se misturam
5. **Segurança de produto é feature** — k-anon ≥ 5; disclaimers verbatim; termos vedados
6. **Determinismo** — "hoje" = constante, mocks com seed, funções puras testáveis
7. **Arquitetura narrativa** — cada módulo responde uma pergunta-guia, tem faixas/maturidade
8. **Engine setor-agnóstico** — nunca `if (setor === ...)`; toda configuração via pack params

---

## 4 · INVARIANTES INVIOLÁVEIS (violar = parar)

1. Build verde ANTES de qualquer commit
2. `engine/` NUNCA importa de `domain/` — vocabulário vem de parâmetros/pack
3. Zero label hardcoded fora de `domain/`
4. k-anonymity ≥ 5 (≥ 10 em VIA-T); recortes n < 5 ficam ocultos com microcopy
5. Resposta individual NUNCA no estado do cliente — mocks entregam só agregados
6. XP/IVO jamais ligados a desempenho, promoção ou remuneração
7. Domínio A e B estritamente separados (dados, telas, fluxos)
8. Disclaimers obrigatórios: IVO="experimental, não clínico"; Domínio B="educativo, não substitui profissional habilitado"
9. Toda tela nova — 4 estados: vazio, carregando, erro, mobile
10. Sempre fatias verticais e completas (demo conta uma história em 60s)

**Termos vedados para VIA-T:** "diagnóstico psicológico", "ranking", "score de talento",
"avaliação de perfil", "laudo", "predição de desempenho", "forças oficiais VIA".
Use: "Mapa VIA-T v1 — Forças percebidas no trabalho" ou "VIA-T v1 Exploratório".

---

## 5 · STACK (nunca desvie)

| Tecnologia        | Versão | Nota crítica                                 |
| ----------------- | ------ | -------------------------------------------- |
| React             | 19.2   |                                              |
| TypeScript        | 5.8    | strict mode — zero `any`                     |
| Vite/TanStack     | 8.0    | via @lovable.dev/vite-tanstack-config        |
| TanStack Router   | 1.168  | file-based — rotas em `src/routes/`          |
| Tailwind          | 4.2    | CSS-first — SEM tailwind.config.js           |
| Zustand           | 5.0    | estado persisto (vita-persona, vita-pack)    |
| Framer Motion     | 12.40  | animações sutis (0.3–0.45s), MotionConfig    |
| Recharts          | 2.15   | gráficos (radar IVO, trend lines)            |
| Ajv               | 8.20   | validação Domain Pack no boot                |
| **Package mgr**   | **bun**| SEMPRE bun — nunca npm/yarn                  |

**Paleta (via token — nunca hex direto em componente):**
- `--color-primary` Verde profundo `#0B3D2E`
- `--color-accent` Dourado `#C9A227`
- `--color-background` Superfície `#F8F7F4`
- Dark mode nativo via `src/styles.css` tokens oklch

---

## 6 · SETUP E COMANDOS

```bash
# Clonar e instalar
git clone https://github.com/minhafelicidadebr/app-vita-happiness-org-fable5.git
cd app-vita-happiness-org-fable5
bun install

# Rodar
bun run dev       # dev server local (porta aleatória ou 5173)
bun run build     # build de produção — deve ficar verde
bun run format    # prettier
bun test src      # 475 testes — deve ficar verde
bun x tsc --noEmit  # typecheck — deve ficar limpo
```

---

## 7 · REGRAS DE SINCRONIZAÇÃO (CRÍTICO)

**Lovable ↔ GitHub `main` são sincronizados bidirecionalmente.**

```
✅ Fluxo correto:
git pull origin main → trabalhe localmente → bun run build (verde)
→ git commit → git push origin main → aguarde sync Lovable → edite no Lovable se necessário

❌ NUNCA edite os mesmos arquivos no Lovable e localmente ao mesmo tempo
❌ NUNCA renomeie/mova/exclua o repositório GitHub — quebra a sync permanentemente

Divisão de trabalho:
  Lovable → telas, layout visual, preview, deploy, Lovable Cloud
  Claude/Opus → motores, mocks, lógica, refactors, testes
```

**Ao adicionar nova rota:**
1. Criar engine em `src/engine/<dominio>/`
2. Criar `src/routes/<rota>.tsx`
3. Adicionar item `navigation` no `src/domain/packs/enterprise/enterprise.pack.json`
4. Registrar em `NAV_ROUTES` no `src/app/shell/AppShell.tsx`
5. Incluir no grupo correto de `NAV_GROUPS` (hardcoded no AppShell — Lovable domínio)
6. `bun run build` verde → commit → push

---

## 8 · O QUE CONSTRUIR A SEGUIR

### Prioridade 1 — UX polish da landing e portão demo ✅ (feito em 2026-06-17)
- `/` é agora a landing pública (sem AppShell). ✅
- Portão demo (`DemoGate`) protege todo o app — senha: **luzpazeamor**. ✅
- `/painel` é o hub navegável (antigo `/`). ✅
- **Lovable pode fazer polimento visual** do formulário do portão e da landing (UI pura, sem engine).
- Pendente: animação de "desbloqueio" ao entrar no painel (Framer Motion fade-in).

### Prioridade 2 — Bloco 20 (UX polish global)
Reservado para o Lovable: mobile first, hover states, micro-animações, empty states
que faltam, consistência de espaçamento. Fale com o usuário antes de implementar
para alinhar o que específico priorizar.

### Prioridade 3 — H2 · Conexão real (Fase 2, Lovable Cloud)
Quando o usuário tiver créditos Lovable suficientes e o mock-first MVP aprovado:

**Sprint 8 — Auth real (Lovable Cloud/Supabase)**
- Login social (Google/LinkedIn) ou magic link
- Row Level Security (RLS) por tenant
- Rota `/login` e guard de auth no `__root.tsx`
- Engine: manter mock-first com feature flag `USE_REAL_AUTH`

**Sprint 9 — Persistência de ondas**
- Supabase edge function: `POST /api/waves` (recebe respostas, agrega, k-anon server-side)
- Substituir `campaign-mock.ts` por hook que chama a edge function
- NUNCA armazenar resposta individual no cliente

**Sprint 10 — Multi-tenant**
- Tabela `organizations` + `org_members`
- PackProvider resolve pack por `org.pack_id` (não hardcoded enterprise)
- Domain Pack configurável via Supabase (org pode ter variações do pack)

**Sprint 11 — LLM em produção (FlorescerIA)**
- Edge function: `POST /api/copilot` (chama Anthropic claude-sonnet-4-6 ou Opus 4.8)
- grounding-engine passa contexto: IVO + priority + evidence + season como `system`
- guardrails: só agregados, k-anon verificado server-side, consentimento verificado
- Substituir mock proposals do agent-engine por respostas reais

**Sprint 12 — Benchmark real**
- Edge function `POST /api/benchmark` — computa cohort de forma server-side
- Nenhum dado de outro tenant jamais chega ao cliente — só resultado agregado
- k-anon entre tenants: MIN_COHORT_ORGS = 5 (já implementado no engine)

### Prioridade 4 — Novos Domain Packs
O engine é setor-agnóstico. Packs em roadmap:
- `condominio` → ConvivIA (IEV adaptado para condôminos/funcionários)
- `governo` → CidadanIA (bem-estar de servidores públicos)
- `saude` → CuidarIA (equipes de saúde, PCMSO)
- `escola` → AlegrIA (IEV já implementado em `domain/packs/school/`)

Para criar novo pack: copiar `enterprise.pack.json`, adaptar labels/roles/nav/branding,
registrar em `domain/packs/registry.ts`, criar `*-mock.ts` com ciclo demo.
**Regra:** o engine NÃO muda — só o pack muda.

---

## 9 · ARQUIVOS-CHAVE PARA LER PRIMEIRO

```
docs/SKILL_MESTRA_FABLE5.md              ← META-SKILL: leia ANTES de tudo
docs/ARQUITETURA_CIENTIFICA.md           ← 4 camadas científicas, instrumentos validados
docs/FRAMEWORK_MESTRE_EMPRESA_VIVA.md   ← fundamento estratégico e científico
docs/SUPER_PROMPT_GENESIS_4LENTES_VITA.md ← gênese Fable 5 (os 21 blocos originais)
docs/instrumentos/PERMA_TRABALHO.md     ← PERMA 15 itens (BR 2026), psicometria
docs/instrumentos/VIA_T.md              ← VIA-T 24 itens, ICUFT, guardrails
docs/instrumentos/COPSOQ_NR1.md        ← COPSOQ II, NR-1, separação Domínio B
docs/instrumentos/PLAYBOOK.md           ← protocolos por pilar/força/risco
CLAUDE.md                               ← regras de código, estrutura, mapa completo
src/domain/packs/enterprise/enterprise.pack.json  ← pack oficial (fonte dos labels)
src/domain/packs/enterprise/ivo-framework.json    ← 4 lentes, 16 pilares, pesos, fórmula
src/engine/index/ivo-engine.ts          ← engine cânone (modelo de pureza)
src/engine/forecast/forecast-engine.ts ← engine cânone (composição + honestidade)
src/integration.test.ts                 ← 10 testes end-to-end (prova o moat)
```

---

## 10 · CHECKLIST ANTES DE DECLARAR "PRONTO"

- [ ] Tríade completa: engine puro + testes + mock + rota + wiring
- [ ] `engine/` sem import de `domain/`
- [ ] Testes cobrem fronteiras (limiares, k-anon, clamps, cenários)
- [ ] `bun test src` verde · `bun run build` verde · `bun x tsc --noEmit` limpo
- [ ] k-anon, A/B, disclaimers, termos vedados respeitados
- [ ] 4 estados (vazio/carregando/erro/mobile) e a11y preservada
- [ ] Tokens de cor corretos (sem hex solto indevido)
- [ ] Compõe em vez de acumula? Reusou engines existentes?
- [ ] Honestidade: fórmula/fonte/incerteza visíveis; nada prometido
- [ ] `git push origin main` feito; Lovable sync aguardado

---

## 11 · HIERARQUIA DE DECISÃO

Quando dois princípios colidirem:

**ética/privacidade > honestidade científica > tese VitalOS > elegância técnica > velocidade**

---

## 12 · LINK DE ACESSO AO APP

**Repositório GitHub:**
https://github.com/minhafelicidadebr/app-vita-happiness-org-fable5

**Lovable (preview e deploy):**
Acesse https://lovable.dev → "My Projects" → encontre "app-vita-happiness-org-fable5".
O Lovable sincroniza automaticamente com o GitHub `main` após cada push.
A URL de preview do Lovable abre diretamente em `/` — a landing pública.

**Dev local:**
```bash
bun install && bun run dev
```
Abra `http://localhost:5173` (ou a porta exibida no terminal).

**Fluxo de acesso ao demo:**
1. Abre em `/` → landing pública
2. Clica "Entrar no app" ou "Explorar app (demo)"
3. Modal pede senha: `luzpazeamor`
4. Entra em `/painel` → hub navegável completo

**Rotas públicas (sem senha):** `/` · `/metodologia` · `/programa`
**Rotas protegidas (requerem senha demo):** todas as demais (AppShell as guarda)

---

> **Mantra operacional Fable 5:**
> _Fundação impecável, ciência honesta, separação sagrada,
> composição sobre acúmulo, e ambição de criação de categoria — em cada commit._
