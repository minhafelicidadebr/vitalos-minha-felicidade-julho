---
name: ux-ix-premium-accessibility-guard
description: Use when building or reviewing any UI/UX in this project (VitalOS) — new route, component, or visual change. Checks mobile-first layout, keyboard/focus accessibility, contrast, reduced motion, touch targets, the four required states (empty/loading/error/mobile), trustworthy microcopy, and absence of toxic gamification or individual ranking. Invoke for any src/routes/*.tsx or src/components change.
---

# UX/IX Premium & Accessibility Guard

Tom do produto: "premium corporativo humano" — sem neon, sem infantilização,
sem overclaim (CLAUDE.md §Voz e estética). Usuário primário de referência: a
operária de 55 anos no quiosque, no celular — se ela não usa, está errado.

## Checklist antes de declarar uma tela "pronta"

1. **Mobile first** — o layout funciona em 375px de largura antes de
   funcionar em desktop, não o contrário.
2. **Teclado** — toda ação clicável é alcançável e operável só com Tab/Enter/
   Espaço, sem mouse.
3. **Foco visível** — nunca `outline: none` sem substituto visível.
4. **Contraste** — texto legível em claro e escuro (o projeto tem dark mode
   nativo via token oklch — testar os dois).
5. **Redução de movimento** — animações Framer Motion respeitam
   `prefers-reduced-motion` via `A11yProvider` já existente; nunca contornar.
6. **Toque mínimo confortável** — alvos clicáveis ≥ 44px de altura (padrão
   já usado no repo: `min-h-11`).
7. **Os 4 estados obrigatórios** (CLAUDE.md invariante 9), sempre os 4,
   nunca só o caminho feliz:
   - **vazio** — quando não há dado ainda (nunca uma tela em branco muda).
   - **carregando** — skeleton/pulse, não spinner genérico sem contexto.
   - **erro** — mensagem humana + ação de recuperação quando fizer sentido.
   - **mobile** — testado de verdade, não só "deveria funcionar por ser
     responsivo".
8. **Microcopy de confiança** — onde há dado sensível (pesquisa, risco,
   privacidade), a tela diz o que é feito com o dado, não só pede.
9. **Disclaimer quando o pack exigir** — IVO "experimental"; Domínio B
   "educativo, não substitui PGR/profissional habilitado"; VIA-T
   "exploratório, não diagnóstico" — verbatim, nunca parafraseado.
10. **Próxima melhor ação** — toda tela de resultado aponta o que fazer a
    seguir, não só mostra um número.
11. **CTA não decorativo** — todo botão principal faz algo real; se a
    feature por trás não existe, o botão não deveria existir ainda.
12. **Navegação clara** — o usuário sabe onde está e como voltar sem usar o
    botão "voltar" do navegador.
13. **Linguagem não punitiva** — mesmo em telas de risco/baixo desempenho,
    o tom é construtivo, nunca de culpa individual.
14. **Ausência de ranking individual** — nenhuma tela ordena pessoas por
    "melhor/pior" (nem por XP, nem por saúde, nem por participação).
15. **Ausência de gamificação tóxica** — XP/badges nunca criam pressão social
    negativa, comparação punitiva, ou vínculo com desempenho/remuneração
    (CLAUDE.md invariante 5).

## Onde isso já está implementado (não redescobrir)

- `A11yProvider` (`src/app/shell/A11yProvider.tsx`) — redução de movimento,
  alto contraste, escala de fonte. Nunca remover ou contornar.
- Paleta via token oklch em `src/styles.css` — nunca hex solto em
  componente (exceção: cor vinda do pack/mock, ex. cor de lente/temporada).
- `font-serif` em títulos (assinatura editorial), sans no corpo, números
  grandes tabulares para métricas.

Se uma tela nova não passa neste checklist, ela não está pronta — mesmo que
o dado por trás esteja correto.
