# Decisão — Copiloto Setorial Aterrado (CuidarIA · CidadanIA · ConvivIA · AlegrIA · FlorescerIA)

> Data: 2026-06-21 · Autor: execução autônoma (Protocolo Fable-5) · Status: Sprints 1–5 entregues

## Contexto e pedido

O produto deve oferecer um **copiloto de IA por setor**, em **formato de chat**, com **avatar**
e **nome sugerido**, **treinado com o ecossistema do app (RAG)** para orientar **sem alucinação**,
operando em quatro pontos de vista: **técnico, criativo, empático, inovador**.

## Enquadramento honesto (F — FRAME)

O VitalOS é **mock-first determinístico** (Fase 1). Auth real, Lovable Cloud, vetor-store e LLM
são **Fase 2** (ver `CLAUDE.md` §Regras 10 e `HANDOVER_OPUS48.md`). Três restrições inegociáveis:

1. **Sem chaves/credenciais no cliente** (regra de segurança + doutrina). Logo, **não** há LLM real
   nem RAG vetorial agora.
2. **Honestidade como feature**: "mostre a conta, cite a fonte". O anti-alucinação não é um modelo
   maior — é **grounding**: só afirmar o que vem de fonte real (framework do pack + métricas
   computadas pelos motores) **com citação**; fora disso, dizer "não sei / fora do meu escopo".
3. **Avatar foto-realista de uma IA é risco ético** (parecer profissional/servidor real). Adotamos
   **marca de persona estilizada** premium; foto-realismo humano fica como decisão de asset da Fase 2,
   sempre com rótulo claro de IA.

### Tradução mock-first do "RAG sem alucinação"

| Pedido             | Fase 1 (agora, determinístico)                                                                                           | Fase 2 (plugável)                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| RAG do ecossistema | **Knowledge Base determinística** montada do pack + framework + mapa de módulos; recuperação por sobreposição de tópicos | Embeddings + vetor-store; este KB vira o corpus            |
| Sem alucinação     | Resposta **montada só de chunks recuperados + métricas reais**, com citações; abaixo do limiar → recusa honesta          | Mesmo grounding como _contexto_ do LLM (RAG-then-generate) |
| Chat com IA        | UI de chat determinística (intenção → chunk → resposta aterrada)                                                         | Streaming do LLM com o mesmo contrato de turno             |
| Avatar + nome      | Marca SVG por branding + nome sugerido (Cora, Cida, Vivi, Aila, Flora)                                                   | Asset definitivo, sempre rotulado como IA                  |
| POVs               | Lente sobre o turno (técnico/criativo/empático/inovador)                                                                 | Idem, como _system prompt_ por POV                         |

## A — ASSESS (auditoria)

- `engine/ai/grounding-engine.ts` já cita métricas reais (cânone do anti-alucinação). **Compor**, não duplicar.
- `routes/floresceria.tsx` é pack-aware só no _grounded answer_; modos/papéis são enterprise hardcoded.
- `audience-engine` é genérico e testado — reutilizável para gatear capacidades.

## Sprints

### Sprint 1 — Fundação do Copiloto Aterrado ✅ (esta entrega)

- `engine/ai/copilot-engine.ts` (puro, setor-agnóstico): recuperação determinística + POV +
  guardrails + montagem de turno com **citações** e **recusa honesta**. + testes de fronteira.
- `mocks/copilot-knowledge.ts`: KB por pack montado do pack+framework+mapa de módulos; personas
  (nome sugerido, tagline) e specs de avatar/POV.
- `components/copilot/CopilotAvatar.tsx`: avatar estilizado premium (gradiente de marca, glifo,
  iniciais, anel sutil; respeita redução de movimento).
- `routes/copilota.tsx`: chat pack-aware, 4 estados, a11y, seletor de POV, cabeçalho de persona,
  citações visíveis e rodapé de guardrail.
- Wiring aditivo: `NAV_ROUTES.copilota`, item de nav em todos os packs, ação "ai" das homes → `/copilota`.

### Sprint 2 — Estratégico: cobertura e gating por audiência ✅

- KB ampliado: pulses, Domínio B (risco psicossocial, separação A/B), trilha Provar (12 chunks).
- Gating por audiência: participante não recebe o número coletivo (resposta protegida, não recusa);
  `sector-audience.ts` reusa os resolvers de cada setor. Sugestões por audiência.

### Sprint 3 — Inovativo: ponte para Fase 2 ✅

- `engine/ai/copilot-prompt.ts`: `buildPromptEnvelope` (RAG-then-generate determinístico) — `context`
  só com chunks recuperados + métricas quando permitido.
- `lib/ai/copilot.functions.ts`: contrato de edge `{CopilotRequest, CopilotResponse}` com handler
  determinístico (registry → KB → métricas → turno + envelope). Fase 2 troca só o passo de geração.

### Sprint 4 — Premium: persistência, exportar, deep-link ✅

- Conversa efêmera por pack (Zustand em memória, não persistida — privacidade).
- Exportar transcrição (.txt + copiar) com fontes citadas; limpar; deep-link `/copilota?q=`.

### Sprint 5 — Prontidão: eval anti-alucinação + guardrails + docs ✅

- `lib/ai/copilot-eval.test.ts`: golden-set nos 5 packs — no escopo sempre cita fonte; fora do
  escopo recusa sem fonte; guardrail recusado; rodapé sempre presente (110 asserções).
- Cobertura de guardrails ampliada (dados pessoais: nome/telefone/endereço/quem faltou).
- Docs e handoff atualizados.

### Próximas frentes (Fase 2, fora deste arco)

- LLM real via proxy seguro (sem chaves no cliente) consumindo o `PromptEnvelope`; embeddings do KB.
- Avatar definitivo rotulado como IA; voz (TTS); modo quiosque; histórico persistente opt-in.

## Invariantes respeitados

Engine ≠ Domínio (KB injetado como parâmetro) · k-anon e nunca-individual (recusa por guardrail) ·
disclaimers do framework · sem chaves no cliente · mudanças aditivas e reversíveis.
