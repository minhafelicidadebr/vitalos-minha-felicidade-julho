# Spec — Dashboards IVO

## Componente da matriz (`src/components/ivo/IvoLensMatrix.tsx`)

- Tabela semântica: `<caption>`, `<th scope="col">` por lente, `<th scope="row">` por dimensão.
- Cada célula responde, em texto, três perguntas separadas: **Lente**
  (disponível/planejada), **Resultado da lente** (disponível em N de M setores,
  protegido, em coleta, sem leitura) e **Esta dimensão** (mapeamento pendente,
  proposto ou aprovado). Contagens são de setores, nunca de participantes.
- Nenhum número de pontuação é renderizado; ausência, proteção e pendência nunca aparecem como zero.
- Avisos (`warnings`) aparecem em região `role="status"`.
- Região rolável da matriz é focável por teclado (`tabIndex=0`, rótulo próprio).
- Estado vazio: sem organização → texto explicativo, matriz de catálogo.

## Rotas

| Rota | Conteúdo |
|---|---|
| `/ivo-integral` | Resumo da leitura Q2 da organização (ou recusa explicada) + matriz. Sem sessão autorizada, a matriz é o catálogo. |
| `/ivo-integral/q2` | Identidade metodológica (versões, cálculo, `k_min`, escalas), setores com estado nativo, fatores e escore bruto **só** de setores publicados, link para o centro de controle FIB-T e para definir prioridade por fator. |
| `/ivo-integral/acoes` | Ciclo de ação (spec `action-learning-loop.md`). |

Todas atrás do `AuthGate` global; a leitura organizacional depende só da
autorização no servidor. Carregamento com `role="status"`; recusa de acesso
em tom neutro (`role="note"`, sem "tentar novamente"); falha técnica com
`role="alert"` e repetir.

## Verificação visual executada (local)

`demo:ivo:visual` (Edge headless via CDP): login real por link mágico,
1366 px e 390 px sem overflow horizontal de página, ordem de foco com
indicador visível, registro de evidência por teclado persistido após recarga,
admin de outra organização sem acesso. Não substitui teste com tecnologia
assistiva nem revisão de acessibilidade especializada.

## Visão executiva

Ciclo anual, estado das 4 lentes, prioridades, ações e evidências — reutiliza
`season-engine` e o ledger quando habilitados. Ainda não implementada.

## Dashboard da lente FIB-T

Reutiliza `FibtManagerControlCenter` sem alteração de apresentação.
