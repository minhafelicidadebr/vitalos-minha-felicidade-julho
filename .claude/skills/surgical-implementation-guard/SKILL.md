---
name: surgical-implementation-guard
description: Use before and during ANY code change in this repo (VitalOS) — enforces minimal diffs, read-before-edit, a short plan before editing, and a risk summary before touching migrations, RLS, auth, billing or sensitive data. This is the default operating discipline for implementation work here, not an opt-in — apply it silently on every edit task, even when the user doesn't name it.
---

# Surgical Implementation Guard

Este projeto (VitalOS) já tem ~180 arquivos de teste, 80 rotas e 40+ domínios
de engine. Mudanças amplas ou exploratórias custam caro em revisão humana e
em risco de regressão silenciosa. Esta skill existe para manter cada mudança
do tamanho exato do problema.

## Antes de editar

1. **Leia antes de editar.** Nunca escreva uma edição em um arquivo que você
   não abriu nesta sessão. Não presuma a forma de uma função pelo nome.
2. **Não varra o repo inteiro sem necessidade.** Prefira Grep/Glob cirúrgico
   (nome de símbolo, padrão exato) a `ls -R` ou leitura sequencial de pastas
   inteiras. Se uma busca de 1-2 tiros não achar o alvo, aí sim amplie.
3. **Plano curto antes da edição** (5–10 linhas, não precisa ser formal):
   o que muda, em quais arquivos, por quê, e o que fica intocado.
4. **Separe refactor de feature.** Se notar algo para limpar que não é o
   pedido, anote — não misture no mesmo diff. Duas intenções, dois commits.

## Durante a edição

5. **Altere o menor número de arquivos possível** para resolver o problema
   real. Se a mudança está se espalhando para arquivos "só para deixar
   consistente", pare e pergunte se isso é realmente o escopo pedido.
6. **Nunca reformate arquivos não relacionados** (não rode formatter/lint
   --fix em arquivos fora do diff da tarefa).
7. **Risco antes de tocar em zona sensível.** Migration, RLS/policy, auth,
   billing, ou qualquer tabela com dado de resposta/identidade: pare e
   descreva o risco (o que pode vazar, quebrar ou ficar irreversível) antes
   de escrever o código — mesmo que o usuário não tenha pedido isso
   explicitamente.

## Depois de editar

8. **Rode o teste mínimo relevante primeiro** (o arquivo de teste do módulo
   tocado), não a suíte inteira, para feedback rápido.
9. **Rode o gate completo quando fizer sentido** — antes de propor commit,
   ou quando a mudança tocar múltiplos módulos: `bun run gate` (roda
   `bun test src` + `bun run parity` + `bunx tsc --noEmit`). Ver
   [token-context-economy-guard](../token-context-economy-guard/SKILL.md)
   para como não desperdiçar contexto lendo a saída inteira.
10. **Entregue um resumo curto**: o que mudou (arquivos), riscos identificados
    (ou "nenhum"), e o que foi validado (testes/build/parity).

## Regras de repositório (sempre válidas, não apenas nesta skill)

- Nunca dar push direto na `main` sem confirmação explícita do founder a
  cada push.
- Trabalho novo/exploratório entra em branch (`chore/*`, `feat/*`, `fix/*`),
  nunca direto na `main`.
- Nunca rodar migration, seed ou comando contra produção sem o founder pedir
  explicitamente e confirmar que entende o efeito.
- Nunca ler, copiar ou expor o conteúdo de `.env`, chaves de service role, ou
  qualquer segredo — mesmo para "confirmar que está configurado", basta
  confirmar a PRESENÇA da variável, nunca o valor.
