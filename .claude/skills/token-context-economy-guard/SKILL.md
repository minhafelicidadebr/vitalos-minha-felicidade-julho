---
name: token-context-economy-guard
description: Ongoing discipline for every Claude Code session on this project (VitalOS) — guides selective reading, grep-before-open, summarizing long output, and keeping context lean. Reference this when a session is running long, before reading a large doc, or before running a command that could produce a huge output. Not a one-time setup step — apply continuously.
---

# Token / Context Economy Guard

Este repo é grande (180+ arquivos de teste, 80 rotas, dezenas de docs de
decisão em `docs/`). Ler tudo "para garantir" é o jeito mais rápido de
esgotar contexto sem aumentar qualidade. Esta skill é a disciplina padrão,
não uma otimização opcional.

## Regras

1. **Leitura seletiva.** Não abra um arquivo inteiro para checar uma coisa —
   use Grep para achar a linha/símbolo primeiro, leia só a janela relevante
   (`offset`/`limit` na ferramenta Read).
2. **Grep antes de abrir arquivo grande.** `docs/PLANO_MESTRE_*.md`,
   `docs/SKILL_MESTRA_FABLE5.md`, e qualquer `DECISAO_*.md` podem ter
   centenas de linhas — busque a seção pelo termo antes de ler tudo.
3. **Nunca cole logs completos na resposta ao usuário.** Resuma: o que
   passou, o que falhou, a causa provável. Cole só a linha de erro relevante
   se for cirúrgico.
4. **Comandos que retornam só falhas** — prefira `bun test src 2>&1 | tail -5`
   a rodar sem filtro; para build, cheque só as últimas linhas de status.
5. **Evite abrir docs longos sem objetivo declarado.** Se o doc não vai
   mudar a decisão da tarefa atual, não leia — referencie que existe e sega.
6. **Não releia arquivo já analisado nesta sessão** — o harness já mantém o
   conteúdo no contexto; reabrir para "confirmar" é desperdício, a menos que
   o arquivo tenha sido editado desde então.
7. **Subagentes só para tarefas isoladas e paralelizáveis** — pesquisa ampla
   que não depende do fio principal da conversa. Não delegue uma decisão que
   você mesmo pode tomar com uma busca de 2 minutos.
8. **`/clear` ao trocar de tarefa grande** e não relacionada — não carregue
   o histórico de uma sprint fechada para a próxima sprint sem relação.
9. **`/compact` com instrução clara** quando o contexto encher no meio de
   uma tarefa longa — diga o que preservar (decisões tomadas, estado do
   gate) e o que pode ser resumido.
10. **`/usage`** para acompanhar consumo quando a sessão estiver longa (nota:
    nem todo ambiente de execução do Claude Code expõe este comando — se não
    existir aqui, não invente a saída, diga que não está disponível).
11. **CLAUDE.md enxuto** — instruções de comportamento/processo genérico
    (não específicas deste projeto) não pertencem ao CLAUDE.md; viram Skill.
    O CLAUDE.md deve responder "o que é isto e como rodo" rápido; skills
    respondem "como devo me comportar em situação X".
12. **Registre comandos corretos** (já feito: `bun run gate`, `bun run
    parity`, `bun test src`) para não redescobrir o setup do projeto a cada
    sessão nova — isso é o que esta própria Sprint 0 deixou documentado.

## Sinal de que você está gastando contexto à toa

- Você abriu 3+ arquivos "só para ter certeza" sem uma pergunta específica
  em mente.
- Você colou uma saída de terminal de 100+ linhas na resposta ao usuário.
- Você releu um arquivo que já apareceu integralmente nesta conversa.
- Você rodou a suíte de testes completa para validar uma mudança em um único
  engine puro (rode só o teste daquele engine primeiro).
