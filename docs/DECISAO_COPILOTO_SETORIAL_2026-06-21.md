# Decisão — Copiloto Setorial Aterrado (CuidarIA · CidadanIA · ConvivIA · AlegrIA · FlorescerIA)

> Data: 2026-06-21 · Autor: execução autônoma (Protocolo Fable-5) · Status: Sprint 1 entregue

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

### Sprint 2 — Estratégico: cobertura e profundidade (próximo)

- KB ampliado por setor (jornada M.E.T.E., Domínio B, ESG/Selo) e por papel (audiência gateia chunks).
- Histórico de conversa (Zustand efêmero), perguntas sugeridas por papel, exportar resumo.
- Telemetria de "lacunas de conhecimento" (perguntas sem chunk) → backlog de KB.

### Sprint 3 — Inovativo: ponte para Fase 2 (futuro)

- Contrato `copilot.functions.ts` (edge) espelhando o turno; este KB como corpus de embeddings.
- RAG-then-generate: LLM recebe chunks recuperados como contexto; mesma UI/contrato de turno.
- Avatar definitivo (asset rotulado IA), voz opcional (TTS), modo quiosque.

## Invariantes respeitados

Engine ≠ Domínio (KB injetado como parâmetro) · k-anon e nunca-individual (recusa por guardrail) ·
disclaimers do framework · sem chaves no cliente · mudanças aditivas e reversíveis.
