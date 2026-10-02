# Princípios de produto

## Ciclo de transformação (obrigatório em toda lente)

1. **Medir** — aplicar uma lente metodologicamente válida.
2. **Compreender** — interpretar o resultado da lente dentro da sua própria semântica.
3. **Priorizar** — pessoa responsável escolhe temas de atenção.
4. **Transformar** — ação com responsável, prazo, métrica e ritual.
5. **Acompanhar** — eventos e evidências (ledger INSERT-only).
6. **Comprovar** — comparação entre ciclos, sem índice inventado.
7. **Aprender** — aprendizagem registrada alimenta o ciclo seguinte.

Corresponde ao M.E.T.E. já implementado (`src/engine/season/season-engine.ts`:
mensurar → educar → transformar → evoluir).

## Regras

- **Compor, não acumular** (ADR-002): cada lente é um adaptador; o núcleo IVO
  não conhece fórmula de instrumento.
- **Sugerir, nunca decidir**: a plataforma pode sugerir temas; priorizar e criar
  ação são atos humanos registrados.
- **Honestidade de estado**: lente sem dados mostra estado, não número.
  Lente planejada nunca exibe resultado.
- **Fail-closed**: na dúvida (versão divergente, organização divergente,
  cobertura incompleta), a leitura é retida.
- **Mock-first, verdade depois**: capacidades sem contrato de produção ficam
  desligadas no `src/lib/capabilities/registry.ts`.
- **Uma lente por vez**: só a FIB-T é funcional nesta fundação.
