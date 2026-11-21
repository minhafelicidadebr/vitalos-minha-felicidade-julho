# Governança metodológica

## Camadas — nunca misturar

| Camada | Quem define | Estado atual |
|---|---|---|
| 1. Instrumento validado | Fonte científica + manifesto versionado | FIB-T `1.0.0` (`METHODOLOGY_CONFIRMED`) |
| 2. Cálculo do instrumento | Manifesto + engine puro | FIB-T: média por Fator (0–4) e escore bruto (0–12) |
| 3. Normalização | Aprovação metodológica | **Não autorizada** para FIB-T (manifesto recusa) |
| 4. Interpretação (faixas) | Aprovação metodológica | **Não autorizada** para FIB-T |
| 5. Mapeamento para dimensões | `dimension-mappings.json` com status | **Nenhum aprovado** |
| 6. Índice composto IVO | Aprovação metodológica | **Não aprovado** |
| 7. Recomendação | Plataforma sugere | Somente a partir de leituras autorizadas |
| 8. Decisão | Pessoa responsável | Sempre humana e registrada |

## Mapeamentos lente → dimensão

Cada mapeamento é um registro versionado com: `id`, origem, construto de
origem (ex.: Fator FIB-T), dimensão, justificativa, versão, responsável,
evidência científica, status `PROPOSTO | APROVADO | REJEITADO` e data de
aprovação. O carregador valida e congela o registro (fail-closed). Somente
`APROVADO` com responsável, evidência e data alimenta células da matriz.

A ação de origem FIB-T **não guarda dimensão**: a dimensão é derivada na
leitura a partir deste registro. Enquanto ele estiver vazio, a ação aparece
como "mapeamento pendente" — e nada além da atribuição dimensional fica
bloqueado (leitura Q2, prioridade, ação, evidência e aprendizagem funcionam).

## Conflitos registrados (não resolvidos)

| # | Conflito | Evidência | Tratamento até decisão |
|---|---|---|---|
| C1 | `calculateIVO` produz índice 0–1000 com pesos e faixas de maturidade, status `experimental`, sem aprovação; conta pilares com n<k como média neutra 3,0 | `src/engine/index/ivo-engine.ts`, `ivo-framework.json` | Não é usado pela jornada IVO. Teste-guarda (`ivo-journey.server.test.ts`) impede que rotas e módulos IVO importem `calculateIVO`/`ivo-engine`. As telas legadas (`/ivo`, `/devolutiva`, `/copiloto`) seguem como estão. |
| C2 | A jornada descreve T3 como "PERMA+V → IVO … aqui se forma o IVO basal" — IVO atado a uma lente | `src/domain/journey.ts` | Catálogo de lentes usa "PERMA+V"; IVO = integração das 4 lentes. Copy da jornada fica para decisão. |
| C3 | Seção "Orquestração temporal" do `CLAUDE.md` está desatualizada | `CLAUDE.md` | `journey.ts` prevalece. |
| C4 | "Lente" designa dimensão no JSON do pack e instrumento na jornada | `ivo-framework.json`, `journey.ts` | No código novo: dimensão = `IvoDimensionId`, lente = `IvoLensId`. Sem renomeação em massa. |
| C5 | Versão FIB-T em três notações (`1.0.0`, `fibt-1.0.0`, `2020.1-furtado`) | manifesto, `hml-contract.ts`, `instrument-registry-mock.ts` | Manifesto prevalece. A ação guarda a versão **derivada da onda** no banco. |
| C6 | `action_items.expected_ivo_lift` pressupõe previsão de índice composto | migration `20260705100000` | Ação de origem FIB-T tem lift fixado em 0 por CHECK (`20261002120000`) e a RPC recusa lift ≠ 0. A jornada IVO não exibe lift. `/plano-acao` legado continua exibindo "Lift IVO" como estimativa. |
| C7 | Fonte metodológica da FIB-T arquivada em pasta de cliente (`docs/fibt-isg/references/`) | manifesto `source_document` | Mover exige refazer custódia SHA-256; adiado. |
| C8 | **Critério de eficácia** de uma ação: o que conta como melhora e como compará-la entre leituras publicadas de ciclos diferentes (mesmo setor? mesmo n? mesma versão?) | spec `action-learning-loop.md` | Eficácia **não é registrável** (`evidence_scope` só aceita execução e aprendizagem) e aparece como "não avaliada". Concluir ação ou anexar documento não comprova melhora nem causalidade. Proposta de protocolo: `specs/efficacy-protocol-c8.md` (motor puro em `src/engine/ivo/efficacy-protocol.ts`; persistência e parâmetros D9 pendentes). |

Qualquer resolução destes itens é **gate metodológico**. Preparo das decisões (propostas, nada aprovado): `docs/vitalos/ivo-methodology-dossier.md` §11 (D1–D10).

## Decisões operacionais (não metodológicas) desta macro-onda

| Decisão | Onde | Por quê |
|---|---|---|
| Representação interna de ciclo `{year, quarter}`; forma canônica gravada `YYYY-Tn`; conversão explícita de `T1-2026` e `2026-t1`; slug de temporada é legado e não é adivinhado | `src/domain/ivo/cycle-key.ts` | Unificar sem reescrever dados remotos. |
| Ciclo de uma onda = trimestre civil da abertura, fuso America/Sao_Paulo | idem, `cycleOfInstant` | Regra de calendário, sem efeito em escore. |
| Agendamento padrão da ação FIB-T: semanas 1–13 | `fibt-action-loop.server.ts` | Colunas obrigatórias do ledger; não interpreta resultado. |
| Indicador da ação é de **execução** (definido pelo gestor), nunca o escore FIB-T | idem + UI | Evita ler conclusão como melhora. |
