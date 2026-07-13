# PLANO DE PRÓXIMA ONDA — VitalOS (cópia game.felicidade@gmail.com)

**Data:** 2026-07-13
**Pré-condição:** baseline técnico registrado em `BASELINE_TECNICO_COPIA_VITALOS_2026-07-13.md`.
**Nenhuma das alternativas abaixo foi implementada nesta sessão.** Esta é uma proposta para
aprovação humana antes de início.

---

## Contexto que orienta a escolha

- O gate oficial (`bun run gate`) está **quebrado** por 3 erros de tipo triviais nos clients
  Supabase — isso bloqueia a disciplina "build verde antes de commit" que a doutrina exige.
- O lint está "vermelho" por causa de CRLF de ambiente Windows, não por código commitado ruim —
  falta um `.gitattributes`.
- O achado estrutural central do relatório de avaliação (P0 — hibridismo demo/produção, 61/81
  rotas com import direto de mock) **segue sem correção** nesta cópia.
- O `PLANO_ELEVACAO_180_VITALOS_2026-07-13.md` anexado já sequencia isso como Onda 0 (observabilidade
  da própria elevação) + Onda 1 (fronteira Demo/Real incontestável) como "Fundação".
- Sem acesso autenticado ao Supabase remoto, nenhuma alternativa pode tocar RLS, migrations
  remotas ou dados reais nesta primeira onda de implementação — isso teria que ser uma sessão à parte,
  com credenciais e autorização explícita.

---

## Alternativa A — Mínima e segura

**O que é:** restaurar o gate oficial e a higiene de checkout, sem tocar em nenhuma feature de produto.

**Escopo:**
1. Corrigir os 3 erros `TS2741` nos clients Supabase (`client.ts:10`, `client.server.ts:13`,
   `auth-middleware.ts:14`) — tipar a função retornada por `createSupabaseFetch` como
   `(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>` em vez de `typeof fetch`,
   ou adicionar um stub de `preconnect` no objeto retornado.
2. Adicionar `.gitattributes` com `* text=auto eol=lf` (ou equivalente) para que qualquer clone
   Windows produza CRLF apenas onde for intencional, eliminando a recorrência do P1-03 de CRLF.
3. Rodar `bun run gate` até ficar 100% verde e documentar a evidência.

**Critério de aceite:** `bun run gate` sai com código 0; `bun run lint` não reporta mais os
~116 mil problemas de CRLF (pode ainda reportar erros reais de lint, se existirem — não é escopo
desta alternativa "limpar" lint semântico, só a causa raiz de line-ending).

**Impacto:** baixo em produto, alto em confiabilidade de engenharia — remove um bloqueio real para
qualquer PR futura passar pelo gate.
**Esforço:** ~1–2 horas.
**Risco:** muito baixo — mudança isolada em 3 arquivos + 1 arquivo de config novo.
**Dependências:** nenhuma.
**Lentes elevadas:** 1 (Técnica).
**Demo verificável:** rodar `bun run gate` ao vivo e mostrar saída verde.

---

## Alternativa B — Robusta e recomendada

**O que é:** Alternativa A + início da Onda 0 (observabilidade da elevação) + primeiro corte
vertical da Onda 1 (fronteira Demo/Real), tocando poucas rotas piloto em vez de todas as 61.

**Escopo:**
1. Tudo da Alternativa A.
2. Adicionar Playwright ao projeto e cobrir 2–3 jornadas P0 em modo E2E contra o app local
   (não contra produção) — por exemplo: `/` (landing) → portão/auth → uma rota autenticada.
3. Adicionar `axe-core` (via `@axe-core/playwright` ou similar) rodando nas mesmas jornadas E2E,
   com falha de CI em violação crítica.
4. Criar o componente `DataSourceBadge` (Real/Demo/Mock/Proxy) proposto no plano de elevação e
   aplicá-lo em **3 rotas piloto** que hoje importam mock diretamente (escolher as de menor risco,
   ex.: `/academia`, `/panorama`, `/benchmark`), sem remover o mock ainda — só rotulando a origem
   do dado visivelmente.
5. Adicionar regra de ESLint (`no-restricted-imports` ou teste arquitetural) que **bloqueia** novo
   import de `src/mocks` nas rotas já marcadas como reais (lista de exceção explícita para as 61
   existentes, para não quebrar o build hoje) — trava o problema no tamanho atual em vez de deixá-lo
   crescer.

**Critério de aceite:**
- CI falha se uma jornada P0 quebrar ou se houver violação a11y crítica nas rotas cobertas.
- As 3 rotas piloto mostram `DataSourceBadge` correto sem alterar comportamento funcional.
- Nenhuma rota nova pode importar `src/mocks` sem passar por revisão explícita (lint falha).

**Impacto:** alto — cria o arcabouço de observabilidade e o mecanismo de contenção do problema P0,
sem exigir migrar as 61 rotas de uma vez.
**Esforço:** médio (alguns dias).
**Risco:** baixo-médio — testes E2E novos podem ser instáveis no início; mitigação é rodar local
antes de exigir gate em CI.
**Dependências:** Alternativa A concluída (gate verde é pré-requisito para confiar em qualquer CI novo).
**Lentes elevadas:** 1 (Técnica), 2 (SaaS), 8 (Acessibilidade), 13 (NR-1, indiretamente via rastreabilidade).
**Demo verificável:** rodar o pipeline Playwright+axe ao vivo; abrir uma das 3 rotas piloto e mostrar
o badge de origem do dado.

---

## Alternativa C — Estratégica

**O que é:** industrializar a primeira fatia real do arco Medir→Agir→Provar (Onda 2 do plano de
elevação), aproveitando que `waves`, `wave_responses`, `wave_capsules` e `wave_invites` já existem
como tabelas migradas e com RLS habilitada — é o pedaço do produto mais perto de já ser real.

**Escopo (apenas a fatia "Medir"):**
1. Confirmar (com sessão Supabase autenticada — pré-requisito que hoje está `BLOCKED`) que as
   migrations de `waves`/`wave_responses`/`wave_capsules` foram de fato aplicadas no projeto
   `shlmzzchddohaytfakol` e que a RLS está ativa e testável.
2. Trocar o consumo de `campaign-mock.ts` em uma jornada específica (criar onda → responder →
   fechar → gerar cápsula) por chamadas reais aos `.server.ts`/`.functions.ts` já existentes,
   em um tenant de piloto, mantendo as demais 60 rotas com mock intocadas.
3. Escrever teste comportamental de RLS (dois tenants, cross-tenant deve falhar) contra um projeto
   Supabase efêmero ou de staging — nunca contra produção.
4. Gerar a cápsula k-anon real e validar que nenhum dado individual chega ao cliente.

**Critério de aceite:** um usuário consegue criar uma onda real, responder como grupo de teste,
fechar a onda e receber uma cápsula agregada — tudo com dado vivo no Supabase novo, sem mock nessa
jornada específica.

**Impacto:** o mais alto em valor de produto e prova de conceito para venda/piloto real.
**Esforço:** alto (é a "fatia vertical" mais complexa do plano de elevação, Onda 2).
**Risco:** médio-alto — mexe em auth, RLS e dado real; exige que o item `BLOCKED` da Fase 1
(acesso autenticado ao Supabase) seja resolvido primeiro, e exige autorização explícita para
qualquer teste contra ambiente vivo.
**Dependências:** Alternativa A (gate verde); acesso Supabase autenticado; autorização explícita
para testar RLS em banco não-produção.
**Lentes elevadas:** 1, 2, 3, 10, 13 (Técnica, SaaS, Negócio, IA/grounding, NR-1).
**Demo verificável:** criar onda → responder → fechar → cápsula, tudo em dado real, em <60s.

---

## Comparação

| Alternativa | Impacto | Esforço | Risco | Dependências | Lentes elevadas | Demo verificável |
|---|---:|---:|---:|---|---|---|
| A — Mínima | 4 | 2 | 1 | Nenhuma | 1 | `bun run gate` verde ao vivo |
| B — Robusta (recomendada) | 8 | 5 | 4 | A concluída | 1, 2, 8, 13 | E2E+a11y verde + badge de origem em 3 rotas |
| C — Estratégica | 10 | 9 | 7 | A + acesso Supabase autenticado + autorização | 1, 2, 3, 10, 13 | Onda real ponta-a-ponta em <60s |

## Recomendação

**Alternativa B**, começando pela Alternativa A como seus dois primeiros passos (o gate quebrado
bloqueia confiar em qualquer CI novo que a Alternativa B adiciona). A Alternativa C é o destino
correto, mas depende de um pré-requisito hoje `BLOCKED` (autenticação Supabase) e de autorização
explícita para tocar ambiente vivo — não deve ser a primeira ação depois de um handoff de conta.

Nenhuma das alternativas foi implementada nesta sessão. Aguardando decisão humana sobre qual
iniciar.
