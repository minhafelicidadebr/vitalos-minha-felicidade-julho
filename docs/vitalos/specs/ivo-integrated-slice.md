# Spec — Fatia integrada: leitura → prioridade → educação → ação → evidência → avaliação → releitura

**Status:** desenho (PROPOSTA) sobre ativos existentes. Nada aqui cria módulo novo além do mínimo marcado "novo".
Inventário feito em 2026-10-05 (leitura de código; não houve execução de testes dos módulos de educação).

## 1. Inventário: o que já existe

| Área | Existe | Real × mock | Reuso na fatia |
|---|---|---|---|
| Ciclo de ação (prioridade → execução → aprendizagem) | `lib/ivo/fibt-action-loop.server.ts`, `lib/api/ivo-action-loop.functions.ts`, `/ivo-integral/acoes` | **real** (staging) | espinha da fatia |
| Academia/trilhas | `routes/academia.tsx`, `mocks/academia-mock.ts`, `engine/academia/*` | **mock** (conteúdo); ligado a pilares do pack, não a Fator FIB-T | só como modelo de ordenação (`engine/learning/driver-pillar-bridge.ts`) |
| Revisão espaçada (SM-2) | `engine/learning/sm2-engine.ts`, tabela `sm2_card_state` | motor **real**; cartões **mock** | retenção do conteúdo curado (fase posterior) |
| Diário de prática | `routes/diario.tsx`, `practice_entries`, agregação k≥5 | **real** | prática aplicada no trabalho (fase posterior) |
| Padrões de aprendizagem/intervenção | `domain/evidence/learning-patterns.json`, `intervention-patterns.json` | **modelos**, sem consumidor | contrato de conteúdo e de plano (orçamento de evidência) |
| Registro de evidências | `domain/evidence/evidence-registry.json` + `passport-engine` (`buildPassport`) | **real**, congelado | fonte única de status científico; `safe_claim` |
| FlorêncIA governada | `engine/florencia/*` (policy gate, CTAs: `explain_mechanism`, `create_team_mission`, …) | **determinística**, sem LLM | explicação por template; nunca cálculo/autorização |
| Copiloto | `lib/ai/copilot.functions.ts` | determinístico, base de conhecimento **mock** | fora da fatia |
| Gamificação | `participation-ledger`, `seed-economy` | real, mas ética: só participação | **fora do IVO** (pontos não entram no índice) |
| COPSOQ | `domain/survey/copsoq-instrument-manifest.json` | **demonstrativo** (41 itens autorais, 14 dimensões, sem licença de versão) | ver §4 |

**Lacuna central:** não existe vínculo `factorId` (FIB-T) → conteúdo educativo, nem catálogo de conteúdo persistido.

## 2. Fatia (reutiliza o fluxo existente)

1. **Leitura publicada** — `loadIvoQ2Reading` (snapshot protegido; k≥5; sem `orgId` do cliente). *Existente.*
2. **Prioridade** — `createFibtPriorityActionsFn` grava só referências (setor, fator, versão, data). *Existente.*
3. **Conteúdo educativo (novo, mínimo)** — registro versionado `factor → conteúdo` (`domain/ivo/factor-content.json` + carregador
   fail-closed, no padrão de `dimension-mappings.ts`): `id`, `factorId`, `objetivo`, `publico`, `formato` (um dos padrões de
   `learning-patterns.json`), `fontes` (códigos do `evidence-registry`), `safeClaimId`, `status` (`PROPOSTO|APROVADO`),
   `responsavel`, `versao`. Só `APROVADO` com fontes e `safe_claim` aparece. Exibição no cartão da ação: "Para entender esta
   prioridade", com link para o conteúdo e **explicação determinística** (FlorêncIA `explain_mechanism` ou template fixo) —
   sem dados da organização no texto. Nenhuma afirmação além do `safe_claim`.
4. **Ação** — responsável, prazo, indicador de execução, ativação, estados. *Existente.*
5. **Evidência** — execução e aprendizagem em cartões separados. *Existente.* A aprendizagem pode referenciar o
   `id` do conteúdo em `contentRef` (texto livre hoje; referência estruturada é PI-8).
6. **Avaliação** — protocolo C8 (`efficacy-protocol.ts`): registrado antes; observação na janela; parecer do revisor;
   estados independentes do estado da ação. *Motor pronto; persistência e UI pendentes (PI-2/PI-3).*
7. **Releitura persistente** — recarregar lê tudo do banco; para indicador `leitura_publicada`, o valor observado vem da
   **próxima leitura publicada** (resolvido na leitura, nunca copiado); comparação só se a regra do protocolo for satisfeita.

```
leitura publicada ──► prioridade ──► conteúdo (novo, curado) ──► ação ──► execução / aprendizagem
       ▲                                                                        │
       └────────── nova mensuração (ciclo seguinte) ◄── avaliação C8 (parecer do revisor) ◄┘
```

## 3. Restrições (herdadas; não negociáveis)

Isolamento por organização e papel da sessão · nenhum valor de leitura copiado para ação/evidência/log (A4) · sem nomes
de pessoas em texto livre · sem LLM na fatia · concluir ação não altera índice nem avaliação · pontos de gamificação não
entram no IVO · conteúdo sem claim novo (regra 2 do `CLAUDE.md`) · UX: 4 estados, foco visível, alvos ≥ 44 px.

## 4. COPSOQ no mesmo núcleo (antecipação)

- O núcleo já aceita a lente `copsoq` no catálogo (planejada). Integração = **adaptador** que emite `ivo-lens-reading/1`
  com os construtos do manifesto (14 dimensões: `demands_quant`, `work_pace`, `demands_emotional`, `influence`, `meaning`,
  `predictability`, `role_clarity`, `leadership_quality`, `social_support`, `recognition`, `community`, `insecurity`,
  `burnout`, `offensive_behaviors`) e o mesmo pipeline de publicação protegida.
- **Candidatas (NÃO são mapeamentos)** a cobrir as lacunas, para a revisão de D2/D5: NÓS ← `social_support`,
  `community`, `recognition`; LIDERANÇA ← `leadership_quality`, `role_clarity`, `predictability`; EU ← `meaning`,
  `influence`; ORGANIZAÇÃO ← `insecurity`, `predictability`. Direção: exposições são **reversas** (frequência alta =
  pior); toda inversão precisa ser explícita e versionada.
- **Bloqueios antes de qualquer cálculo publicado:** (i) o manifesto do repositório é demonstrativo, sem licença de versão
  validada; (ii) política vigente de **não misturar Domínio A (bem-estar) e Domínio B (risco)**; (iii) decisão jurídica sobre
  licença (D5). Até lá: contrato e testes com leitura **sintética** são seguros; dados reais, não.
- Mesmo núcleo para educação e eficácia: conteúdo por dimensão COPSOQ no registro §2.3; protocolo C8 idêntico.

## 5. Critérios de aceite da fatia (quando implementada)

S1 prioridade exibe conteúdo aprovado do fator, ou "sem conteúdo aprovado" explícito · S2 conteúdo mostra objetivo, fonte e
`safe_claim`, sem claim novo · S3 aprendizagem registrada referencia o conteúdo e reaparece após recarregar · S4 protocolo
C8 criado e avaliado nos três desfechos (favorável, desfavorável, inconclusivo) · S5 troca de organização não vaza conteúdo
nem protocolo · S6 a página nunca mostra número do IVO sem método aprovado (guarda existente + `IvoCoveragePanel`).
