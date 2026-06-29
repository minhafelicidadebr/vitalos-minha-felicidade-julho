# Guia de Polimento Visual no Lovable — sobre o wiring pronto

> Para o product owner. As telas `/selo`, `/copilota` e `/panorama` já estão **conectadas
> aos dados reais** (server functions do arco de evidência). Este guia diz como pedir ao
> Lovable o **polimento visual** sem quebrar essa conexão. Cole os prompts; respeite a ordem.

---

## 1 · Fluxo seguro (a ordem importa)

1. **Confirme o sync.** No Lovable, veja se os commits mais recentes do GitHub já chegaram
   (a sincronização leva de segundos a poucos minutos). **Não comece antes disso.**
2. **Trabalhe só no Lovable** nessas telas enquanto estiver polindo. Regra de ouro:
   **nunca o Lovable e o Claude Code editam o mesmo arquivo ao mesmo tempo.**
3. **Ao terminar**, deixe o Lovable sincronizar de volta para o GitHub **antes** de pedir
   ao Claude Code qualquer mudança nesses arquivos.

---

## 2 · A trava que protege o wiring (cole SEMPRE junto)

O Lovable é uma IA por prompt — se você pedir "melhore a tela", ele pode reescrever a lógica
e quebrar o grounding/composição. Inclua isto em todo prompt:

> Altere APENAS a aparência visual (layout, espaçamento, cor, tipografia, animação). NÃO mude
> as chamadas de dados, as server functions (`getEarnedSeal`, `getBoardBrief`, `getCycleProof`),
> nem a lógica de `useEffect`/`useState`. Preserve todos os textos de disclaimer e as fontes citadas.

---

## 3 · Identidade visual (cole junto também)

> Padrão visual: títulos em serif (Source Serif 4), corpo em Inter ≥16px, rótulos ≥12px.
> Cores só via tokens oklch (verde profundo #0B3D2E, dourado #C9A227). Dark mode nativo.
> Premium corporativo humano — sem neon, sem infantilização. Respeitar redução de movimento (motion-safe).

---

## 4 · Prompts prontos, por tela

### `/selo` — card "Como o Domínio B foi conquistado" (ProvenanceCard)

> Na rota /selo, no componente ProvenanceCard, deixe as três métricas (Intervenções com efeito,
> Redução atribuível, Custo evitado) mais imponentes — números grandes em fonte serif, com um leve
> realce dourado de marca. Mantenha o selo de "ganho" elegante e sóbrio. NÃO altere a server
> function getEarnedSeal nem os textos de disclaimer — só o visual.

### `/copilota` — FlorescerIA + callouts de medição

> Na rota /copilota, refine os dois callouts "Medição real ·" e "Evolução medida ·" para parecerem
> evidência citada (um filete lateral de cor, ícone discreto), distintos do balão de conversa.
> Mantenha o avatar estilizado com a respiração suave. NÃO mude a lógica do answerCopilot nem o
> contexto de medição — só a apresentação.

### `/panorama` — card dos cinco céticos (BoardBriefCard)

> Na rota /panorama, transforme o BoardBriefCard num visual premium de conselho: cada cético
> (CHRO, CFO, Auditor, Colaborador, Investidor) com um ícone próprio, o check de satisfação em verde
> mais visível, e a métrica em destaque tabular. Premium corporativo, sem neon. NÃO altere
> getBoardBrief nem os textos — só o layout e o estilo.

---

## 5 · Checklist de verificação (depois que o Lovable aplicar)

Confirme que o wiring sobreviveu — os **números reais** ainda aparecem:

- [ ] `/panorama` mostra **R$ 38.019/ano** na linha do CFO e **3/5** (ou similar) de céticos satisfeitos.
- [ ] `/selo` mostra o card de proveniência com **intervenções, redução e custo evitado** preenchidos.
- [ ] `/copilota` — ao perguntar "qual o risco psicossocial e como evoluiu?", aparecem os callouts
      **"Medição real ·"** e **"Evolução medida ·"** com dados.

Se algum número sumiu ou virou placeholder, o Lovable tocou na lógica → peça ao Claude Code para reparar o wiring.

---

## 6 · O que NÃO pedir ao Lovable (é do Claude Code)

- Mudar engines (`src/engine/**`), mocks (`src/mocks/**`) ou server functions (`src/lib/**`).
- Alterar regras de privacidade, k-anonimato, disclaimers científicos ou guardrails.
- Trocar mocks por Lovable Cloud (Fase 2) — decisão de arquitetura, ver `docs/ADR/ADR-002`.

> Divisão de trabalho (CLAUDE.md): **Lovable** → telas, layout, preview, deploy.
> **Claude Code** → motores, mocks, lógica, refactors, testes.
