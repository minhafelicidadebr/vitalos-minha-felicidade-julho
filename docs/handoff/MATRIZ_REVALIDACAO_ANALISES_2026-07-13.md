# MATRIZ DE REVALIDAÇÃO — Achados de `AVALIACAO_PREMIUM_VITALOS_2026-07-13.md`

**Método:** cada achado principal do relatório anexado foi checado contra o código real desta
cópia (`vitalos-minha-felicidade-julho`, commit `ad4b45d`). "Confirmado" significa que a evidência
`arquivo:linha` foi reproduzida nesta sessão. Ver `BASELINE_TECNICO_COPIA_VITALOS_2026-07-13.md`
para os comandos e contagens completas.

| Achado anterior | Confirmado? | Evidência atual | Mudou na cópia? | Severidade atual |
|---|---|---|---|---|
| 54/81 rotas importam `src/mocks` diretamente (F1, P0) | **Parcialmente** — o padrão é real, a contagem exata não | `grep` desta sessão encontra **61/81** rotas com import direto de `@/mocks` ou `../mocks` | Sim — número maior que o relatado (61 vs 54). Pode refletir crescimento do produto entre o snapshot avaliado e este commit, ou diferença de método de contagem. | **P0 mantido** — hibridismo demo/produção segue sendo a fratura estrutural central |
| Autorização server-side resolve org a partir do token real, não aceita `orgId` do cliente (`authorize.server.ts:58-121`) | **Confirmado** | `src/lib/auth/authorize.server.ts:88` resolve `org_id` via `.select("org_id, role")` a partir da sessão; comentário explícito na linha 117 confirma que `orgId` no payload nunca é confiado | Não mudou | P2 — ponto forte, não fratura |
| `AuthGate` distingue rotas reais via `REAL_AUTH_ONLY_PREFIXES` (`AuthGate.tsx:7-44`) | **Confirmado** | `src/app/auth/AuthGate.tsx:23` define `REAL_AUTH_ONLY_PREFIXES = ["/admin", "/plataforma", "/ativar"]` | Não mudou | P2 — ponto forte |
| Billing incompleto — sem checkout/assinatura/cobrança recorrente (`plan-engine.ts`, `CHECKLIST_PRONTIDAO_PILOTO.md:45-50`) | **Confirmado** | `src/lib/config.server.ts:24` tem `stripeSecretKey` **comentado** (nunca ativado); `src/routes/vitrine.tsx:7,327` e `src/engine/vitrine/vitrine-offer-engine.ts:15` declaram explicitamente "nunca há checkout, estoque ou pagamento" como princípio de design da vitrine de reconhecimento (não é billing comercial) | Não mudou | P1 mantido |
| Observabilidade mínima — `ops_events` cobre eventos selecionados, sem tracing/latência/alertas (`ops-events.server.ts:1-14`) | **Confirmado** | `src/lib/telemetry/ops-events.server.ts` existe; nenhuma lib de tracing/APM encontrada em `package.json` | Não mudou | P1 mantido |
| Copiloto é determinístico, sem LLM real (`copilot.functions.ts:1-7`) | **Confirmado** | `src/lib/ai/copilot.functions.ts:1-7` — comentário explícito: "Hoje é um handler DETERMINÍSTICO (sem LLM)... na Fase 2, troca-se apenas o miolo por uma chamada ao LLM" | Não mudou | P1 mantido |
| Contexto de medição do copiloto vem de mocks (`copilot-knowledge`, `sector-data`, `capsule-history-mock`) | **Confirmado** | `src/lib/ai/copilot.functions.ts:25-33` importa `@/mocks/copilot-knowledge`, `@/mocks/sector-audience`, `@/mocks/sector-data`, `@/mocks/trend-mock`, `@/mocks/capsule-history-mock` | Não mudou | P1 mantido |
| SEO técnico inconsistente — metatags duplicadas PT (`__root.tsx:76-126`) | **Confirmado, com detalhe exato** | `src/routes/__root.tsx:82-125` — `description`, `og:title`, `og:description`, `twitter:title`, `twitter:description`, `og:image` e `twitter:image` aparecem **cada um duas vezes** no mesmo array `meta: [...]` (ex.: `description` nas linhas 84 e 121) | Não mudou (a comparação de fidelidade já notara que a duplicação PT/EN foi reduzida mas a duplicação de tags permanece) | P1 mantido |
| Ausência de analytics de aquisição/produto (GA4, PostHog, Segment, Plausible, Meta Pixel) | **Confirmado** | Busca em `package.json` por `posthog\|google-analytics\|gtag\|segment\|plausible\|mixpanel` — 0 ocorrências | Não mudou | P1 mantido |
| Não foram encontrados testes automatizados com axe/Playwright/Cypress/Lighthouse | **Confirmado** | Nenhum diretório `playwright`/`cypress`, nenhuma dependência `axe-core` em `package.json` | Não mudou | P1 mantido |
| A11yProvider funcional + menu de acessibilidade (`A11yProvider.tsx`, `A11yMenu.tsx`) | **Confirmado** | Ambos arquivos existem em `src/app/shell/`; 853 ocorrências de `aria-*` em `.tsx` — número idêntico ao relatado | Não mudou | P2 — ponto forte |
| Separação Domínio A/B no crosswalk NR-1 (`crosswalk-engine.ts:1-12,140-150`) | **Confirmado** | `src/engine/nr1/crosswalk-engine.ts:2,11,41,144` documenta e implementa a separação; desfechos marcados `isOutcome` nunca viram driver | Não mudou | P2 — ponto forte |
| 28 tabelas via migrations, gap de tipagem Supabase (comparação de fidelidade: "10 entidades sem tipagem") | **Confirmado, contagem refinada** | 28 `CREATE TABLE` nas migrations; 17 tabelas no bloco `Tables:` de `types.ts` → **11** tabelas sem tipo gerado, todas as 11 referenciadas em código de produção (não-teste) | Contagem exata mudou de "10" para "11" — mesma conclusão | P1 mantido |
| CI existe e roda `bun test`, parity, typecheck, build (`gate.yml:19-37`) | **Confirmado, com resultado novo** | `.github/workflows/gate.yml` existe; ao **executar** o gate localmente nesta sessão (não apenas confirmar que existe), `tsc --noEmit` **falha** com 3 erros `TS2741` em `src/integrations/supabase/{client.ts,client.server.ts,auth-middleware.ts}` | **Mudou** — a auditoria anterior não pôde executar o gate ("ambiente sem Bun"); esta sessão executou e encontrou uma falha real e reproduzível | **P1 → confirmado como FAIL ativo**, não mais "não verificado" |
| Dívida de formatação ~81 mil ocorrências, majoritariamente CRLF/Prettier (`AUDITORIA_DE_PRODUCAO_VITALOS_G1.md:51-57`) | **Confirmado e causa raiz identificada** | `bun run lint` produz 116.838 problemas nesta sessão, quase todos `Delete '␍'`. Causa raiz: blob Git é LF puro (confirmado via `git show HEAD:vite.config.ts`), mas `core.autocrlf=true` no ambiente Windows converte para CRLF no checkout; **não existe `.gitattributes`** forçando `eol=lf` | Contagem subiu (81k → 116,8k) — mesma causa raiz, provavelmente mais arquivos tocados desde a auditoria original, ou diferença de regra ESLint ativa | P1 mantido, com causa raiz e correção agora especificadas |
| Arquivos excessivamente grandes (`landing-copy.ts` ~86KB, `acesso.tsx` ~75KB, `plano-acao.tsx` ~60KB) | **Não reverificado nesta sessão** | — | — | Herdado do relatório anexado sem recontagem própria |
| Cores hardcoded fora do design system (`viat.tsx`, `ivo.tsx`, `nr1.tsx`) | **Não reverificado nesta sessão** | — | — | Herdado do relatório anexado sem recontagem própria |
| Claims regulatórios de alto risco interpretativo ("Conformidade NR-1", "anonimato garantido") | **Não reverificado nesta sessão** | — | — | Herdado do relatório anexado sem recontagem própria — recomenda-se validação textual dedicada na próxima onda de defensabilidade |

## Síntese da revalidação

- **Nenhum achado do relatório anexado foi refutado.** Todos os P0/P1 checados nesta sessão
  permanecem verdadeiros ou pioraram ligeiramente (mocks: 61 vs 54; CRLF: 116,8k vs 81k).
- **Uma informação nova e mais grave que "não verificado" apareceu:** o gate oficial do projeto
  (`bun run gate`) **falha de fato** nesta cópia, por um regressão de tipos introduzida pela própria
  refatoração dos clientes Supabase que a comparação de fidelidade classificara como "semanticamente
  equivalente" — equivalente em runtime, mas não em type-safety. Correção é trivial (3 linhas).
- **Uma informação nova e positiva apareceu:** os testes agora rodam e passam de fato (2007/0 fail),
  algo que a auditoria original não pôde comprovar por falta de ambiente Bun.
- Itens que dependem de acesso autenticado ao Supabase remoto (RLS viva, grants, redirects, Edge
  Functions, storage) continuam **não comprovados nesta cópia** — ver seção 3 do baseline técnico.
