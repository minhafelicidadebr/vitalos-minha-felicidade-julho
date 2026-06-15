# COPSOQ II / NCOPSII — NR-1 / Guia MTE 2026

> Camada 1 — Risco Psicossocial (Domínio B exclusivamente)
> NUNCA misturar com Domínio A (florescimento/forças).

---

## Instrumentos e referências

| Instrumento | Descrição |
|---|---|
| **COPSOQ II** | Copenhagen Psychosocial Questionnaire II — padrão internacional |
| **NCOPSII** | Adaptação brasileira do COPSOQ II — validada para o contexto nacional |
| **NR-1 (2024)** | Norma Regulamentadora 1 — obriga GRO com fatores psicossociais |
| **Guia MTE 2026** | Guia oficial do Ministério do Trabalho para avaliação de riscos psicossociais |

---

## COPSOQ II — Estrutura (versão curta BR)

9 dimensões na versão curta aplicada no app (`/sst`, card COPSOQ):

| Dimensão | Direção | Faixa de risco |
|---|---|---|
| Demandas quantitativas | ↓ melhor (menos demanda) | Alta demanda = risco |
| Influência e desenvolvimento | ↑ melhor | Baixa influência = risco |
| Sentido do trabalho | ↑ melhor | Baixo sentido = risco |
| Comprometimento | ↑ melhor | Baixo comprometimento = sinal |
| Previsibilidade | ↑ melhor | Baixa previsibilidade = risco |
| Transparência da liderança | ↑ melhor | Baixa transparência = risco |
| Suporte social | ↑ melhor | Baixo suporte = risco |
| Feedback | ↑ melhor | Pouco feedback = risco |
| Interface trabalho-família | ↑ melhor | Conflito alto = risco |

**Escala:** 0–100 (sempre agregado — nunca score individual para cliente)

**Faixas de prontidão:**
- 🟢 Favorável
- 🟡 Intermediário
- 🔴 Risco

---

## NR-1 / GRO — O que obriga

A NR-1 (atualizada 2024, Guia MTE 2026) obriga que o **GRO (Gerenciamento de Riscos Ocupacionais)** inclua fatores de risco psicossocial. Isso significa:

1. **Inventário de riscos psicossociais** — identificar os fatores presentes
2. **Avaliação de exposição** — medir nível de exposição (COPSOQ/instrumento equivalente)
3. **Plano de ação (GRO)** — medidas de controle por categoria de risco
4. **Monitoramento periódico** — revisão e evidência documental
5. **PGR** — documento formal que consolida tudo acima

**Categorias de risco psicossocial (NR-1):**
- Organização do trabalho
- Carga e jornada
- Relações / assédio
- Autonomia e clareza de papel
- Reconhecimento e justiça
- Ambiente e condições físicas

---

## O que o app entrega (Domínio B)

| Tela/Feature | O que entrega | Instrumento base |
|---|---|---|
| `/sst` — Inventário de riscos | Exposição estimada por categoria | COPSOQ + NR-1 |
| `/sst` — COPSOQ card | 9 dimensões com faixas | NCOPSII versão curta |
| `/sst` — Canal de escuta | Volume agregado de relatos | Interno |
| `/sst` — Checklist GRO | Prontidão documental | Guia MTE 2026 |
| `/relatorios` — Evidências | Rastro auditável para PGR | Todos |
| `/relatorios` — Relatório SST | PDF para profissional habilitado | NR-1 |

---

## Distinção crítica produto × compliance

| O app faz | O app NÃO faz |
|---|---|
| Organiza evidências e dados agregados | Elaborar o PGR (exige profissional habilitado) |
| Aplica COPSOQ com rigor de anonimato | Substituir Avaliação Ergonômica Preliminar (AEP) ou AET |
| Educação sobre NR-1 e riscos psicossociais | Emitir laudo ou relatório técnico com validade legal |
| Plano de ação orientativo no Culture Lab | Assinar como responsável técnico pelo GRO |

**Disclaimer obrigatório (presente em todas as telas Domínio B):**
> Este módulo tem caráter educativo e preparatório. A elaboração do PGR e a avaliação
> de riscos psicossociais nos termos da NR-1 exigem profissional legalmente habilitado.
> A plataforma organiza evidências, dados agregados e planos de ação para apoiar
> esse trabalho — não para substituí-lo.

---

## Correlação COPSOQ × Pilares IVO (Domínio B → Domínio A)

Esta correlação existe analiticamente, mas **NUNCA deve ser exibida** ao usuário como um único dado (violaria a separação A/B). Uso interno para: análise de tendência entre ciclos, alertas para o RH.

| COPSOQ (risco) | Pilar IVO correlato (florescimento) |
|---|---|
| Demandas quantitativas altas | condicoes_carga (↓) |
| Suporte social baixo | cooperacao_confianca (↓), cuidado_ativo (↓) |
| Sentido do trabalho baixo | proposito_significado (↓) |
| Influência/Desenvolvimento baixo | equilibrio_autonomia (↓), crescimento_maestria (↓) |
| Transparência da liderança baixa | clareza_direcao (↓), justica_coerencia (↓) |
| Interface trabalho-família | equilibrio_autonomia (↓), energia_vitalidade (↓) |

---

## Regras de separação no código

```typescript
// Exemplo de verificação no engine
if (role === "SST_PROFISSIONAL" || role === "CIPA_MEMBRO") {
  // acesso ao Domínio B
} else if (hasDomainBAccess(pack, roleId)) {
  // RH_ADMIN/CHRO com permissão explícita
} else {
  // Domínio A apenas — nunca expor dados COPSOQ
}
```

A rbacInvariant `domainA_domainB_strictly_separated` no `enterprise.pack.json` é a âncora.
