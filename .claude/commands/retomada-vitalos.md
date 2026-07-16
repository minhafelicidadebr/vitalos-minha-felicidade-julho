---
description: Passagem de bastão — retoma o trabalho do VitalOS de onde a sessão anterior parou (Onda 4B concluída → Onda 4C)
---

# Retomada VitalOS — passagem de bastão entre contas/sessões

Você está retomando o trabalho no repositório `vitalos-minha-felicidade-julho` a partir de uma sessão anterior encerrada em outra conta do Claude Code. Siga estas etapas na ordem, sem pular nenhuma:

## 1. Carregar o contexto (obrigatório, antes de qualquer ação)

Leia por completo, nesta ordem:

1. `docs/handoff/PASSAGEM_BASTAO_ONDA4B_PARA_4C_2026-07-15.md` — estado congelado, classificação de maturidade, armadilhas de ambiente, sequência oficial pós-4B e os dois prompts prontos (validação humana + Onda 4C).
2. `CLAUDE.md` — regras invioláveis do projeto (se ainda não carregado).
3. `docs/SKILL_MESTRA_FABLE5.md` — meta-skill obrigatória.

## 2. Verificar o baseline

Execute e confirme:

```
git log --oneline -3        # 8de62b0 deve ser alcançável (pode haver commits mais novos — eles prevalecem)
git status --short          # deve estar limpo (descartar src/routeTree.gen.ts se aparecer)
git branch --show-current   # main
```

Opcional, se houver dúvida sobre o ambiente: `bun install && bun run gate` (baseline: 2219 testes / 0 falhas; atenção à flakiness pré-existente de `participation-store.test.ts` — protocolo na seção 3 do documento de handoff).

Se a `main` avançou além de `8de62b0`, leia os commits novos antes de assumir qualquer coisa do documento como atual.

## 3. Apresentar o estado e AGUARDAR

Apresente ao founder um resumo curto contendo:

- hash atual da `main` e se bate com o baseline do handoff;
- classificação de maturidade da Onda 4B (tabela da seção 2 do handoff);
- a sequência oficial pós-4B (validação humana → aceite → Onda 4C → só depois ActionLog → PLANNED inativas);
- as armadilhas de ambiente que você registrou (preview `vitalos-julho-dev`, `routeTree.gen.ts`, flakiness, limite da automação de navegador).

**Depois, aguarde o próximo super-prompt do founder. NÃO inicie nada por conta própria** — nem a validação humana (é o founder quem executa no navegador dele), nem a Onda 4C (exige o superprompt da seção 7 do handoff), nem ActionLog, nem capacidades PLANNED, nem push/merge/deploy.

Argumentos opcionais passados ao comando: $ARGUMENTS
