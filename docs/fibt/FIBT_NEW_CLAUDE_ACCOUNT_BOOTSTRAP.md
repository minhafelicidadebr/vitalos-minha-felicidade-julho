# FIB-T — BOOTSTRAP PARA NOVA CONTA CLAUDE CODE

Leia isto primeiro. É curto de propósito.

## CRITICAL INSTRUCTION

**Não faça uma auditoria completa do repositório só porque esta é uma
conta Claude nova.** A fronteira entre contas **não é evidência** de
drift do repositório. Use o repositório, os hashes, os testes e o
Handoff Integrity Gate como cadeia de custódia. Reaudite apenas quando um
sinal objetivo de integridade falhar.

## PASSO 1 — leia só o handoff

```
docs/fibt/FIBT_CLAUDE_ACCOUNT_HANDOFF_2026-08-07.md
```

Não leia migrations históricas, ledgers privados ou documentos de spec
antigos a menos que o handoff explicitamente aponte para eles como
necessários para a tarefa em mãos.

## PASSO 2 — execute o gate

```bash
bun run scripts/fibt-handoff-integrity-gate.ts
```

Read-only, local, sem acesso a produção ou ao Lovable.

## PASSO 3 — decida

**Se `HANDOFF_INTEGRITY_GATE=PASS`:**

`TRUST_HANDOFF=true`. Não reaudite nada listado na seção "TRUSTED
COMPLETED WORK" do handoff (§13 daquele documento). Vá direto para o
`NEXT_ACTION` registrado no handoff (§16) e, se você recebeu também o
super prompt de macro-ondas (Production Technical Closure / Real
Collection Readiness / Promotion & Launch Experience), continue as
trilhas que não dependem de ação humana pendente.

**Se `HANDOFF_INTEGRITY_GATE=FAIL`:**

Olhe o campo `problems` da saída do gate. Investigue **somente** o(s)
item(ns) apontado(s) — não reinicie a auditoria do projeto inteiro. Casos
comuns e o que fazer:

- `sha3A_match=false` ou `shaContract_match=false` → alguém editou a
  migration depois do handoff. Rode `git diff` nela e decida se é
  intencional (atualize o handoff) ou acidental (reverta).
- `bundle_check=SKIPPED` → normal se o diretório privado não existe
  nesta máquina/sessão. Não é falha — apenas significa que o bundle
  precisa ser regenerado localmente antes de qualquer execução produtiva
  (o handoff explica como, §7).
- `runtime_invite_link_references > 0` → algum arquivo de runtime passou
  a citar a coluna legada de novo. Investigue esse arquivo especificamente.
- `manifest_ok=false` → rode `bun run manifest:write` e reexecute o gate.
- `staging_migration_b_intact=false` → a Migration B de staging foi
  editada. **Nunca editar esse arquivo.** Reverta.
- testes ou `tsc` falhando → leia a saída, é um problema real e local,
  não histórico.

## O que este handoff cobre e o que não cobre

Cobre: estado produtivo dos Pacotes 0/1/2/3/2A (todos aplicados com
sucesso), estado da migration 3A + CONTRACT produtivo (**ainda não
aplicado**, duas tentativas anteriores abortaram fail-closed por defeito
de guard, já corrigido), metodologia FIB-T congelada, riscos abertos
conhecidos.

Não cobre: trabalho de UX/landing/promoção (ainda não iniciado nesta
linha — se você recebeu o super prompt de macro-ondas, isso é a Macro 3,
trabalho novo), nem leitura profunda de
`src/routes/aceitar-convite.$token.tsx` / `fibt-piloto.tsx` / `fibt.tsx`
(sinalizado como pendente no handoff, P2-33).

## Regra de ouro

Um handoff que passa no gate é tão confiável quanto uma auditoria manual
— e custa uma fração do contexto. Confie nele. Gaste o orçamento de
contexto na tarefa nova, não em reconstituir uma história já provada.
