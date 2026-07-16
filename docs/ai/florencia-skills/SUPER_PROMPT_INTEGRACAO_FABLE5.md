# SUPER PROMPT — INTEGRAÇÃO DO FLORÊNCIA SKILLS REPOSITORY NO VITALOS

## Missão

Integrar progressivamente o repositório de Skills da FlorêncIA ao VitalOS, preservando o baseline funcional, a filosofia M.E.T.E., os registries científicos, a privacidade, a acessibilidade e a decisão humana.

## Regras controladoras

1. Leia `FLORÊNCIA_CONSTITUTION.md`.
2. Leia `AGENTS.md`.
3. Execute `python scripts/validate_repository.py`.
4. Não trate estas Skills como fine-tuning de pesos; elas são contratos operacionais versionados.
5. Não copie todo o repositório para runtime sem necessidade.
6. Carregue somente a Skill principal e até três auxiliares por tarefa comum.
7. Não pesquisar novamente fontes já congeladas.
8. Não integrar LLM/RAG nesta primeira etapa.
9. Não criar migration, banco, RLS, deploy ou push sem autorização.
10. Não alterar claims, Evidence Registry ou Claim Registry fora de tarefa explícita.

## Tree of Thoughts operacional

Avalie quatro caminhos:

- A: importar tudo de uma vez;
- B: usar apenas um mega-prompt;
- C: criar agentes independentes;
- D: integrar registries e Skills por corte vertical.

Use critérios: segurança, coerência VitalOS, reuso, custo de tokens, reversibilidade, valor de produto, testes e manutenção.

A hipótese preferencial é D.

## Primeiro corte obrigatório

```text
Empresa × Líder × Voz Segura × FlorêncIA
```

Composição:

- Principal: `SKILL-INTERVENTION-PLANNER`
- Auxiliares:
  - `SKILL-EVIDENCE-CLAIM-GUARDIAN`
  - `SKILL-PRIVACY-SAFETY-GUARDIAN`
  - `SKILL-PREMIUM-UX-ACCESSIBILITY`

Ative `SKILL-AGILE-PROJECT-ARCHITECT` ou `SKILL-EVOLVE-MONITOR` somente quando a intenção exigir.

## Entregas da Fase 0

1. Mapa factual das Skills já existentes no VitalOS.
2. Tabela `reusar / adaptar / criar / adiar`.
3. Proposta de localização dos registries.
4. Adapter entre Skill Registry e Policy Gate atual.
5. Plano de testes.
6. Riscos de duplicação.
7. Diff estimado.
8. Itens fora de escopo.

## Entregas da Fase 1

1. Carregador tipado do Skill Registry.
2. Validação dos contratos.
3. Skill Router determinístico.
4. Composição máxima de uma Skill principal + três auxiliares.
5. Integração com Context Envelope.
6. Integração com Policy Gate.
7. Logs técnicos sem conteúdo sensível.
8. Testes unitários.

## Entregas da Fase 2

Integrar somente os cinco CTAs de `/voz-segura` às Skills necessárias, mantendo as respostas determinísticas e os claims já autorizados.

## Gates

- registry válido;
- Context Envelope fechado;
- Policy Gate aprovado;
- nenhum dado individual;
- nenhum claim novo;
- status do produto visível;
- teclado, foco, ARIA, mobile e reduced motion;
- testes e gate do repositório verdes.

## Relatório final

```text
STATUS FLORÊNCIA SKILLS
Baseline:
Skills reusadas:
Skills adaptadas:
Skills criadas:
Registries:
Contexto:
Policy Gate:
Testes:
Riscos:
Pendências:
Próxima onda recomendada:
```
