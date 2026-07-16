# Mapa de Capacidades — FlorêncIA

**Camada de governança documental — este documento não é consumido pelo runtime.**
Não é schema, não é registry operacional, não gera binding automático. É o
registro de intenção entre a capacidade canônica do produto e sua superfície
real, até que cada capacidade ganhe intent, claim, Skill, Policy Gate e teste
de contrato próprios — só então ela pode entrar em `cta-registry.json`.

| capability_id | superfície | rota | intent atual | claim | status |
|---|---|---|---|---|---|
| `prepare_safe_conversation` | Voz Segura | `/voz-segura` | `prepare_conversation` | `CLAIM-EDMONDSON1999-VOICE-002` | **ACTIVE** |
| `interpret_aggregated_results` | Resultados agregados | a confirmar entre `/rh`, `/prioridades` e `/panorama` | — | — | PLANNED |
| `transform_findings_into_action` | Plano de ação | `/plano-acao` | — | — | PLANNED |
| `create_educational_activity` | Conteúdo educativo | `/academia` | — | — | PLANNED |
| `register_next_step` | Evolução | `/evolucao` | — | — | PLANNED |

## Regras

- **ACTIVE** significa que existe binding governado completo: `cta_id` em
  `cta-registry.json`, intent resolvido, claim autorizada pelo Claim Registry,
  Skill candidata, Policy Gate e cobertura de teste.
- **PLANNED não autoriza renderização, execução ou chamada.** Nenhuma
  capacidade PLANNED pode aparecer na interface, em `cta-registry.json`, em
  `response-templates.ts` ou em qualquer CTA real.
- `create_team_mission` (CTA existente e ACTIVE de Voz Segura) poderá
  futuramente se tornar uma ação especializada de `transform_findings_into_action`
  — sem perder seu `intent` nem sua claim atuais.
- `organize_evidence` (governança/evidência/ESG) e `register_next_step`
  (ActionLog/evolução operacional) são operações diferentes — não se fundem.
- `explain_mechanism` e `suggest_observation` permanecem CTAs auxiliares
  governados de Voz Segura, fora do conjunto das 5 capacidades canônicas.

## Ativação futura de uma capacidade PLANNED

1. Localizar a rota real (já feito nesta tabela) e confirmar o componente.
2. Definir intent operacional + claim(s) no Claim Registry (nunca reaproveitar
   claim existente só por semelhança textual).
3. Definir Skill candidata (`docs/ai/florencia-skills/registries/skill-registry.json`).
4. Adicionar entrada em `cta-registry.json` com Policy Gate cobrindo o novo
   intent.
5. Cobertura de teste (resolução de CTA + policy gate + parity, mesmo padrão
   das capacidades ACTIVE).
6. Só então o status muda para ACTIVE nesta tabela.
