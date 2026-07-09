---
name: ai-governance-edge-wrapper
description: Use when implementing or reviewing any AI/LLM-backed feature in this project (VitalOS) — FlorescerIA, Copiloto Setorial, agent-engine, or any new AI feature. Enforces tenant/plan/permission checks, versioned prompts, output validation, sensitive-data exclusion from logs, and human escalation before any AI call ships. Invoke for any change touching src/engine/ai/, src/lib/ai/, or a new AI-facing route.
---

# AI Governance / Server Wrapper Guard

Nota de nomenclatura: este repo não usa Supabase Edge Functions
(`supabase/functions/` não existe). A camada equivalente aqui é
`src/engine/ai/*` (motores puros: `copilot-engine.ts`, `agent-engine.ts`,
`grounding-engine.ts`, `qa-gates.ts`) + `src/lib/ai/*.functions.ts` (fronteira
server, ex.: `copilot.functions.ts`). Esta skill audita essa camada com o
mesmo rigor que "edge function wrapper" pediria em outra stack.

## Checklist antes de qualquer chamada de IA ir ao ar

1. **Quem é o usuário** — resolvido da sessão real (`resolveOrgMembership`/
   `requireOrgAdmin`), nunca de um campo `userId` solto no payload.
2. **Qual tenant** — a mesma disciplina P0-04 do resto do app: orgId da
   sessão, nunca do cliente.
3. **Qual plano** — a feature de IA respeita `engine/billing/plan-engine.ts`
   (tiers/limites) como qualquer outra feature paga?
4. **Qual permissão** — o papel/persona atual pode ver a informação que a
   IA vai citar? (ex.: Copiloto não deve citar dado de gestor para um
   colaborador nem vice-versa.)
5. **Qual fonte de dados** — a resposta cita o `knowledge base`/capsule real
   (`grounding-engine.ts`) ou está inventando? Toda afirmação factual precisa
   de citação rastreável (mesmo padrão anti-alucinação já em
   `copilot-engine.ts`).
6. **Qual prompt versionado** — o prompt usado tem uma versão registrada
   (`copilot-prompt.ts` ou equivalente), não uma string solta editada
   ad-hoc na rota.
7. **Qual modelo** — está explícito qual modelo atende a chamada (nunca
   "o modelo mais novo" implícito sem registro).
8. **Qual limite de tokens/rate** — existe um teto por usuário/org/dia
   (mesma família de proteção do `xpDailyCap`/`kudosWeeklyBudget` do
   `gamification-engine.ts`)?
9. **Qual fallback** — o que acontece quando o modelo falha, recusa, ou
   estoura o limite? Precisa de um caminho definido, nunca um erro cru para
   o usuário final.
10. **Qual validação de saída** — a resposta passa por `qa-gates.ts` (ou
    equivalente) antes de chegar à UI: sem dado individual vazado, sem
    claim proibido (ver `nr1-copsoq-defensibility-guard`), sem formato
    quebrado.
11. **Qual log sem dado sensível** — logs de chamada de IA nunca incluem
    resposta de pesquisa, identidade ou conteúdo de reflexão pessoal — só
    metadados de operação (mesmo princípio de `ops_events`).
12. **Qual política de recusa** — a IA recusa explicitamente (com guardrail
    citado) em vez de responder algo fora de escopo silenciosamente.
13. **Qual escalonamento humano** — ações propostas pela IA (ex.: Copiloto
    Proativo) têm um passo de aprovação humana antes de qualquer efeito
    real (padrão já estabelecido: "propõe + aprovação humana").

## Proibições absolutas (bloqueie e explique, não implemente)

- IA acessando resposta individual sensível de pesquisa (COPSOQ/PERMA/VIA-T)
  — só agregados k-anon chegam ao contexto do modelo.
- Prompt sem versão registrada.
- Referência/citação inventada (toda citação precisa vir de
  `grounding-engine.ts` ou fonte real equivalente).
- Enquadramento de diagnóstico clínico.
- Decisão de RH automatizada (promoção, desligamento, avaliação de
  desempenho) tomada ou sugerida pela IA.
- Recomendação punitiva a um indivíduo ou grupo.
- Mistura de dado pessoal com dashboard de gestor, mesmo via IA.

Toda nova capacidade de IA segue a mesma tríade do resto do app: engine puro
→ testes → mock/wiring → rota, com o guardrail rodando DENTRO do engine, não
como decoração na UI.
