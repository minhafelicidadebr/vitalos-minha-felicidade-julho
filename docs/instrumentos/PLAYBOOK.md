# Work-Wellbeing Playbook 2.0 — Referência

> Camada 4 — Ação (Culture Lab → /lab)
> Transforma dados de PERMA + VIA-T + COPSOQ em intervenções baseadas em evidência.

---

## Papel no ecossistema

```
MEDE (PERMA/IVO/VIA-T/COPSOQ)
  → DIAGNOSTICA (qual pilar/força/risco está crítico?)
    → SELECIONA PROTOCOLO (Playbook)
      → EXPERIMENTA (Culture Lab)
        → EVIDENCIA (Relatórios + Selo)
```

O Playbook é a "biblioteca de remédios" para os dados que o app coleta.

---

## Princípios dos protocolos

1. **Baseado em evidência** — cada protocolo tem estudos publicados que sustentam efeito
2. **Dosável** — intensidade ajustada ao contexto da organização
3. **Mensurável** — antes/depois pelo mesmo instrumento que motivou a intervenção
4. **Honesto** — estatísticas reais, incluindo efeitos modestos e limites conhecidos
5. **Reversível** — pode ser descontinuado sem dano

---

## Categorias de intervenção (por camada de medição)

### Camada 1 — Risco (COPSOQ/NR-1)

| Risco | Protocolo base |
|---|---|
| Demandas altas | Revisão de carga; redistribuição; automação |
| Suporte social baixo | Programa de mentoria e suporte entre pares |
| Transparência baixa | Rituais de comunicação; town halls; OKRs abertos |
| Interface trabalho-família | Política de desconexão; horários flexíveis |
| Reconhecimento e justiça | Revisão de critérios; transparência de promoções |

### Camada 2 — Florescimento (PERMA)

| PERMA baixo | Protocolo base |
|---|---|
| P — Emoções Positivas | Rituais de gratidão; celebração de pequenas conquistas; linguagem apreciativa |
| E — Engajamento | Job crafting; microdesafios; metas co-construídas |
| R — Relacionamentos | Acordos de convivência; feedback peer-to-peer; conexões interdepartamentais |
| M — Significado | Storytelling de impacto; mapa de contribuição; conexão com propósito da empresa |
| A — Realização | Metas claras + acompanhamento; reconhecimento de progresso (não só resultado) |

### Camada 3 — Forças (VIA-T)

| Força/Virtude baixa | Protocolo base |
|---|---|
| Criatividade baixa | Laboratório de soluções simples para problemas reais |
| Curiosidade baixa | Rodas de perguntas antes de decisões importantes |
| Esperança baixa | Planejamento de futuro desejável; mapeamento de caminhos |
| Bravura baixa | Treinamento de conversas difíceis com segurança psicológica |
| Humildade baixa | Feedback 360 formativo; aprendizagem com erros |
| Gratidão baixa | Ritual semanal de reconhecimento específico |
| Perseverança baixa | Metas curtas; reforço de progresso; acompanhamento |

---

## Estrutura de um protocolo no Culture Lab

```typescript
interface ProtocolDef {
  id: string;
  title: string;
  targetPillars: string[];       // IVO pillars ou PERMA
  targetStrengths?: string[];    // VIA-T strengths
  targetRisks?: string[];        // COPSOQ dimensions
  playbook_ref?: string;         // código no Playbook 2.0
  evidenceLevel: "meta-analise" | "rct" | "quasi-experimental" | "observacional";
  durationWeeks: number;
  effortLevel: "baixo" | "médio" | "alto";
  summary: string;
  steps: string[];
  successMetric: string;         // "redução de X% em Y"
  honestStats: {                 // SEMPRE mostrar efeitos reais
    effectSize: string;          // ex: "d=0.3 (pequeno)"
    caveat: string;              // limitações conhecidas
  };
}
```

---

## Integração com dados do app

O Culture Lab (`/lab`) deve, na Fase 2:
1. Receber dados do IVO/PERMA atual
2. Sugerir automaticamente protocolos para os 2–3 pilares mais críticos
3. Criar experimento com datas, responsável e métrica de sucesso
4. Ao concluir, comparar IVO/PERMA antes × depois
5. Gerar evidência auditável para `/relatorios` e Selo Empresa Viva

---

## Conexão com Embaixadorias

Cada embaixadoria (`/embaixadorias`) pode ser o "agente humano" de um protocolo:
- Embaixador de Reconhecimento → executa protocolo "Gratidão baixa"
- Embaixador de Aprendizagem → executa protocolo "Curiosidade baixa"
- Embaixador de Bem-Estar Operacional → executa protocolo "Carga alta"

Isso cria o ciclo: dado → protocolo → embaixador → ação → evidência → IVO sobe.
