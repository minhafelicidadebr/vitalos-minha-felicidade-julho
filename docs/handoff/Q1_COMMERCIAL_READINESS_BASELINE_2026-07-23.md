# Q1 Commercial Readiness — Baseline (Fase 0)

> Fase 0 do `PLANO_MASTER_PLUS_PROXIMAS_FASES_VITALOS_2026-07-23.md` — "garantir
> que o próximo trabalho comece sobre o estado correto". Base para a
> AVALIAÇÃO_SISTÊMICA_VITALOS_EVOLUÇÃO_2026-07-23 (nota 8,42/10) e para a onda
> H2.1 (Public Claims Governance) que começa logo em seguida.
>
> **Regra de honestidade (mesma convenção das auditorias anteriores):**
> `[CÓDIGO]` = verificável estaticamente neste repo, reexecutado agora;
> `[PRODUÇÃO]` = só o founder pode confirmar (requer painel Lovable/Supabase
> real, fora do alcance deste agente).

## 1. Identidade do repositório `[CÓDIGO]`

| Item | Valor |
|---|---|
| Remote canônico | `https://github.com/minhafelicidadebr/vitalos-minha-felicidade-julho.git` |
| Branch atual | `main` |
| HEAD | `614a7619a68df2b7993a2863f82e39ec82ad925a` |
| Último commit | `Merge pull request #23 from minhafelicidadebr/docs/auditoria-migrations-pos-g1` (2026-07-23) |
| Sync com `origin/main` | 0 ahead / 0 behind — idêntico |
| Working tree | limpo, exceto `.claude/launch.json` (mudança local pré-existente, não relacionada a nenhuma onda em curso) |

Esta é exatamente a mesma HEAD citada na `AVALIAÇÃO_SISTÊMICA_VITALOS_EVOLUÇÃO_2026-07-23.md` ("commit registrado no comentário do archive atual: `614a7619...`") — a avaliação sistêmica que motivou este plano foi feita sobre este exato commit, sem drift entre o que foi avaliado e o que este plano vai alterar.

## 2. Qualidade do baseline `[CÓDIGO]` — evidência completa, não resumo

**Rodada 1 — `bun test src` (full):** `EXIT_CODE=1`. **2.651 pass / 2 fail / 2.653 total** (237 arquivos, 8.247 `expect()`, 60,74s).

### Falha 1 — timeout, não assertion

```
(fail) fronteira Engine ≠ Domínio (invariante 1 do CLAUDE.md) >
        nenhum arquivo de src/engine (fora de testes) importa @/domain [5760.07ms]
^ this test timed out after 5000ms.
```
Arquivo: `src/engine/engine-domain-boundary.test.ts`. Sem stack de asserção — é timeout de 5s excedido em 5760ms, consistente com contenção de I/O sob carga da suíte cheia (o teste faz varredura de arquivos), não com uma quebra de invariante.

### Falha 2 — estado nulo entre testes (ordem-dependente)

```
src\engine\gamification\participation-store.test.ts:56
  expect(fakeSupabaseState.lastInsert).toMatchObject({...})
  Matcher error: received value must be a non-null object
  at participation-store.test.ts:56:42
```
`fakeSupabaseState.lastInsert` chegou `null` — indica que outro teste do arquivo não resetou o fake antes deste rodar, dependente da ordem de execução dentro da suíte cheia.

### Disposição formal — protocolo já registrado, agora com reexecução fresca desta sessão

Ambas já constam em `docs/handoff/PASSAGEM_BASTAO_ONDA4B_PARA_4C_2026-07-15.md` §3 (item 3: `participation-store.test.ts`, "falha ~1×/rodada cheia ocasionalmente"; item 7: fronteira Engine≠Domínio, achado de 2026-07-23 em sessão anterior). O protocolo acordado ali — "registrar a primeira falha, rodar o teste isolado, repetir o gate UMA vez, não corrigir junto com outra entrega, não adicionar retry" — foi reexecutado agora, nesta sessão, com exit codes explícitos (sem pipe, `$?` lido direto após cada comando):

| Verificação | Comando | Resultado | Exit code |
|---|---|---|---|
| Isolado — boundary | `bun test src/engine/engine-domain-boundary.test.ts` | 1 pass / 0 fail | `0` |
| Isolado — participation-store | `bun test src/engine/gamification/participation-store.test.ts` | 5 pass / 0 fail | `0` |
| Rodada 2 — `bun test src` (full, repetição) | `bun test src` | **2.653 pass / 0 fail** | `0` |

**Conclusão:** ambas as falhas não reproduzem isoladas nem na segunda rodada completa — consistente com order-dependent flakiness já catalogada, não regressão introduzida neste corte. Nenhuma correção foi aplicada (o protocolo explicitamente proíbe corrigir junto de outra entrega).

`bun run parity` e `bunx tsc --noEmit` não foram reexecutados nesta baseline (princípio de economia de tokens do próprio plano — serão rodados antes do commit da onda H2.1, como o gate exige). **Por isso este baseline não é chamado de "gate verde"** — é uma fotografia de testes com instabilidade conhecida e investigada, não uma passagem do gate completo (`bun run gate` = testes + parity + typecheck), que não foi executado nesta sessão.

## 3. Deploy e alertas de segurança `[PRODUÇÃO — pendente founder]`

Este agente não tem acesso ao painel Lovable/Supabase. Os itens abaixo só o founder confirma:

1. **Versão publicada em produção** — corresponde a `614a761` (HEAD atual) ou há um deploy mais antigo pendente de sincronização?
2. **Alertas de segurança ativos** no Security Advisor do Supabase/Lovable — nenhum foi revisado nesta baseline.
3. **Migration #40 e a correção do Achado 5** (`docs/AUDITORIA_MIGRATIONS_POS_G1_2026-07-23.md`) — já confirmadas em produção em 2026-07-23, registradas aqui só para referência cruzada; nenhuma ação nova necessária.

## 4. Riscos atuais conhecidos (herdados da avaliação sistêmica)

Fonte: `AVALIAÇÃO_SISTÊMICA_VITALOS_EVOLUÇÃO_2026-07-23.md`, seção 7 e Apêndice de prioridades. Não re-auditados aqui — citados para registro de baseline:

| # | Risco | Severidade |
|---|---|---|
| 1 | Claims públicos site-wide não governados (Oxford, ROI, multas, "COPSOQ II", multiplicadores de engajamento) | P0 comercial — **alvo da onda H2.1, próxima** |
| 2 | Skill principal não é condição real de autorização no Policy Gate | P1 |
| 3 | Registries (Learning Dynamics, Evidence/Claim/Mechanism) mutáveis em runtime | P1 |
| 4 | ActionLog com contrato permissivo (sem discriminated union) | P1 |
| 5 | Ausência de E2E/axe/browser real | P1 |
| 6 | Isolamento cross-tenant não automatizado (só verificado manualmente nas auditorias RLS) | P1 |
| 7 | Bundle/monólitos crescendo (`landing-copy.ts` 1.875 linhas, `acesso.tsx` ~1.776, `voz-segura.tsx` 1.052) | P1/P2 |
| 8 | 62 de 83 rotas ainda mock-first | P1 operacional |
| 9 | Senha demo (`luzpazeamor`) não é fronteira de segurança real | P0 se houver dado sensível atrás; P2 se ambiente é só demonstrativo |

## 5. Gate desta fase

- [x] repositório correto confirmado
- [x] working tree limpo (exceto mudança local não relacionada)
- [x] branch `main` sincronizada com `origin/main`
- [x] evidência completa de teste registrada: nomes exatos, stack traces, reruns isolados com exit code, rerun completo com exit code, disposição formal (seção 2)
- [ ] versão de produção confirmada pelo founder `[PRODUÇÃO — pendente]`
- [ ] alertas de segurança revisados pelo founder `[PRODUÇÃO — pendente]`
- [ ] `bun run parity` / `bunx tsc --noEmit` / `bun run gate` completo — não executados nesta baseline
- [x] riscos atuais documentados (seção 4)

**Status formal: baseline local concluída com instabilidade conhecida.** Não é "gate verde" — o gate completo (`bun run gate`) não foi rodado nesta fase, e dois itens de produção seguem pendentes de confirmação do founder. Os itens `[PRODUÇÃO — pendente]` não bloqueiam o início do trabalho de código/copy de H2.1, mas devem ser fechados antes do Gate CR-1 (piloto pago), e o gate completo deve rodar antes de qualquer commit de onda, como o próprio plano exige.

Próximo passo: matriz H2.1 v0.2 (escopo site-wide ampliado) + proposta de arquitetura de allowlist de claims comerciais, conforme correções pedidas pelo founder sobre a v0.1.
