# PLANO ARCO DA PROVA 1.0 — Blueprint Premium de Transformação & Evolução (Transformar · Evoluir · Dossiê ESG)

> **Status:** Proposto (aprovado pelo founder em 2026-07-04 para escrita + 1ª fatia vertical).
> **Irmão editorial de:** `PLANO_ACADEMIA_VIVA_2.0.md` (Educar) e do
> `PLANO_MESTRE_EVOLUCAO_VITALOS_2026_2027.md` (cuja espinha S6–S8 este blueprint
> **estende sem quebrar** — o S6 comprometido É a primeira fase daqui).
> **Etiquetas de evidência:** `Confirmado no código` · `Mockado` · `Proposto`.
> **Doutrina ativa:** `SKILL_MESTRA_FABLE5.md` — ToT §3, composição §5.1, honestidade §8,
> invariantes §9. Nível 3 (Fundacional) do protocolo §0.2.

---

## §0 · Tese e sumário executivo

**O arco fecha quando a prioridade vira prova auditável.** O slogan do cânone — *"Provar,
não prometer"* — hoje é verdade até a metade do ciclo: a medição é real (S1–S4), a Academia
é viva (S5 + Academia Viva 2.0), mas o Transformar roda em memória (nenhum plano sobrevive
ao reload) e o Evoluir inteiro — curva longitudinal, reavaliação, Selo, Relatório ESG — é
alimentado por dados demonstrativos. **Zero por cento do dado real coletado chega ao eixo
que existe para provar** (`Confirmado no código`, §A).

Este blueprint fecha o arco com **uma cadeia causal única** — prioridade medida → plano com
dono/prazo/métrica → evidência honesta → reavaliação → Dossiê ESG com linhagem — apoiada em
**dois substratos** construídos antes das features:

1. **O Ledger de Transformação** (substrato T): as tabelas comprometidas do S6 nascidas
   como *event ledger* INSERT-only. O Transformar **escreve** história, nunca a reescreve.
2. **O Cofre de Ciclos** (substrato E): capsules seladas → série longitudinal canônica →
   todos os motores do Evoluir — que já existem, já são puros e já são testados, e passam
   a receber verdade **sem mudar uma linha** (§E2).

O ESG audita os dois: cada KPI do Dossiê carrega a linhagem até a onda que o gerou. Num
mercado onde relatório ESG sem lastro está virando passivo regulatório (CSRD, direção
anti-greenwashing), **a doutrina §8 deixa de ser limitação e vira moat comercial**.

Sobre os substratos, **7 inovações** (I-T1…I-E4, §D) — cada uma uma fatia vertical, cada
uma compondo motores existentes, nenhuma criando silo.

---

## §A · Inventário honesto — o que existe hoje

Auditoria desta sessão (2026-07-04), com **correções de fato** que a honestidade §8 exige:

> **Correção 1.** Relatórios anteriores desta sessão apontaram "devolutiva-engine sem
> testes". **Falso:** `src/engine/educar/devolutiva-engine.test.ts` existe (~11 testes —
> 4 blocos, divergência por audiência, honestyNote, guardrails VIA-T). A lacuna real é
> outra: a rota é 100% mock e não existe a *cerimônia* em volta da narrativa.
> **Correção 2.** A contagem do CLAUDE.md (1137 testes) está defasada — o real pós-Academia
> Viva é **1518 testes / 154 arquivos, 0 falhas**.

### A1 · Eixo Transformar (`Confirmado no código`)

| Ativo | Onde | Estado |
|---|---|---|
| action-plan-engine (plano 13 sem., esforço 4/7/13, balanceamento por embaixadoria) | `src/engine/action-plan/` | 14 testes · **sem dono/prazo/métrica por ação** (lacuna §13 declarada no S6) |
| evidence-engine (diff-in-diff: netEffect = delta bruto − deriva secular; k-anon; confiança CAPADA em "indicativo" por ser proxy, nunca "robusto") | `src/engine/lab/evidence-engine.ts` | 5 suítes · honestidade por construção |
| intervention-evidence-engine (COPSOQ invertido p/ melhora; **medida em desuso não ganha crédito de eficácia** — flag maintenance) | `src/engine/lab/intervention-evidence-engine.ts` | testado · o flag hoje é alimentado por mock |
| devolutiva-engine (narrativa 4 blocos, audience-aware, variante Forças com guardrails) | `src/engine/educar/devolutiva-engine.ts` | ~11 testes · rota mock |
| pgr-document-engine (medidas por tier NR-01; LEGAL_NOTICE verbatim) | `src/engine/nr1/pgr-document-engine.ts` | operante |
| reavaliacao-engine (DriverEvolution; eficácia withSourceMeasure/maintained/lapsed; disclaimer §11.4.4 verbatim) | `src/engine/nr1/reavaliacao-engine.ts` | 5 testes |
| 8 protocolos seed com ciência citada (Edmondson, JD-R, Locke & Latham, ISO 45003…) e efeito declarado como FAIXA honesta | `src/mocks/lab-mock.ts` | `Mockado` |
| Rotas /plano-acao /lab /experimentos /devolutiva /plano-nr1 | `src/routes/` | **100% efêmeras** (useState/useMemo, sem save) |
| Tabelas action_plans / action_items / evidence_records / devolutiva_sessions | `supabase/migrations/` | **ZERO — não existem** (15 migrations auditadas) |

### A2 · Eixo Evoluir + ESG (`Confirmado no código`)

| Ativo | Onde | Estado |
|---|---|---|
| esg-engine (FrameworkDef ESRS S1/ODS/GRI/FIB **injetado**; pilares ocultos por k-anon REPORTADOS; 4 bandas) | `src/engine/esg/` | 9 testes |
| esg-report-engine (AnnualEsgReport compõe 5 instrumentos; KPIs com dim E/S/G + ODS + trend) | `src/engine/esg-report/` | 10 testes |
| fibt-engine (32 itens, 3 fatores, 9 domínios, ponte E) | `src/engine/fibt/` | 10 testes |
| certification-engine (Selo: 5 critérios, 3 essenciais, 4 tiers, computado nunca comprado) | `src/engine/certification/` | 15 testes |
| trend-engine (momentum + projeção linear) · benchmark-engine (k-anon POR COORTE: nOrgs<5 esconde a coorte) · forecast (25) · panorama (18) · season (Evoluir = T4 sem. 10–13) · cycle-close | `src/engine/…` | ~100 testes somados |
| Rotas /esg /relatorio-global /evolucao /evolucao-nr1 /selo /fechamento /impacto | `src/routes/` | **100% mock-fed** |
| earned-seal server (getEarnedSeal → buildCycleProof) | `src/lib/proof/` | único server function do eixo — e lê `capsule-history-MOCK` |

### A3 · As três lacunas que este blueprint fecha

1. **§13 do Guia MTE:** nenhuma ação tem responsável, prazo ou métrica — o critério de
   aceite do S6 não é implementável com os tipos atuais.
2. **0% de dado real no Evoluir:** o caminho Cloud (wave_capsules seladas, S4) nunca
   alimenta trend/reavaliação/Selo/ESG. O eixo da prova roda sobre ficção declarada.
3. **ESG sem linhagem:** o relatório existe e é honesto no texto, mas nenhum KPI sabe de
   qual onda veio — inassegurável por construção.

**Fato que muda o custo de tudo** (`Confirmado no código`): `capsule-history-mock.ts`
devolve exatamente o tipo `MeasurementContextCapsule` que TODOS os motores longitudinais
consomem, e o `capsule-aggregator.server.ts` real já grava `wave_capsules` com
`dimensions {mean, high_risk_pct, n}` + `suppressed_dims` + `outcomes`. **O pipeline real
é uma troca de fonte atrás do mesmo tipo — não uma reescrita.**

---

## §B · Melhores práticas globais — o que adotamos, adaptamos e rejeitamos

### B1 · Transformar (metodologias de intervenção)

| Prática global | Decisão | Como entra |
|---|---|---|
| **Intervenções organizacionais participativas** (Nielsen 2013; Nielsen & Noblet) — participação do trabalhador no desenho é preditor de efetividade | **Adotar** | Cerimônia da Devolutiva (I-T2): voto de prioridades vira pauta de co-criação que semeia o plano |
| **WHO Guidelines on mental health at work (2022)** — intervenção organizacional como primeira linha, antes da individual | **Adotar** | já convergente com o risco central do S6; vira guarda estrutural no I-T1 (só tiers NR-01) |
| **ISO 45003:2021** — consulta e participação; gestão de risco psicossocial | **Adotar** | a pauta de co-criação é a evidência documental da consulta |
| **Avaliação realista** (Pawson & Tilley 1997) — contexto-mecanismo-resultado | **Adotar** | hipótese CMO por ação (I-T1): o diff-in-diff deixa de ser conta solta e vira teste de hipótese declarada |
| **PDSA/Deming** | **Adotar** | cada ação é um ciclo: a métrica (baseline→alvo) é o "Study" |
| **After-action review** | **Adaptar** | a cerimônia de reavaliação em T4 usa o motor da devolutiva com roteiro AAR |
| **GRADE (confiança de evidência)** | **Já existe em espírito** | os tiers do evidence-engine (exploratório/indicativo, cap por proxy) são a versão honesta; a Ata de Vitória (I-E2) os exibe |
| Kotter 8 passos | **Rejeitar** | modelo de mudança top-down por senso de urgência — conflita com a via participativa escolhida e não acrescenta mecânica ao que M.E.T.E. já dá |

### B2 · Evoluir/ESG (padrões de reporte)

| Prática global | Decisão | Como entra |
|---|---|---|
| **CSRD (Dir. UE 2022/2464) + ESRS S1** own workforce — dupla materialidade, prontidão para asseguração limitada | **Adotar** | Dossiê ESG Auditável (I-E1): linhagem por KPI, materialidade DECLARADA, snapshot imutável |
| **GRI 403:2018** (SST) e **GRI 3:2021** (materialidade) | **Adotar** | FrameworkDefs novas INJETADAS via pack — zero mudança de engine (prova viva do Engine≠Domínio) |
| **ISO 30414:2018** (human capital reporting) | **Adotar** | séries longitudinais do Cofre + capítulo de capital humano no Livro do Ciclo |
| **ISSB/SASB human capital** | **Adaptar** | mapeamento leve via as mesmas defs; sem claim de conformidade |
| **Anti-greenwashing** (direção regulatória UE — proposta Green Claims) | **Adotar como moat** | as regras verbatim do §F3; a §8 já era isso antes de ser tendência |
| Selos/rankings comprados (GPTW-style como PRODUTO) | **Rejeitar** | o Selo Empresa Viva é computado do arco, nunca comprado — já é cânone; reafirmado |
| Blockchain para credencial/snapshot | **Rejeitar** | teatro técnico; hash + INSERT-only + verificação pública dão a auditabilidade sem a complexidade |

**O argumento do moat:** todo concorrente pode escrever "relatório ESG". Nenhum pode
escrever *"cada número deste relatório tem um botão que mostra a onda, o n, o k-anon e a
fórmula que o geraram"* — a menos que tenha construído a cadeia medir→provar inteira.
A honestidade não é o preço do produto; é o produto.

---

## §C · Decisão central — ToT exposto

**Pergunta:** Transformar, Evoluir e ESG viram o quê, editorial e arquiteturalmente?

**Comitê (§3.1):** psicologia organizacional/intervenções · direito regulatório (NR-1,
CSRD) · dados/privacidade · estratégia SaaS B2B · UX premium.

| Ramo | Descrição | Valor | Risco | Custo | Tese | Reuso | **Ponderado** |
|---|---|---|---|---|---|---|---|
| A | Dois blueprints separados (Transformar vs Evoluir) | 6 | 7 | 6 | 4 | 6 | 5,70 |
| B | Um blueprint "arco da prova" unificado | 8 | 6 | 6 | 9 | 8 | 7,55 |
| C | ESG-first (puxado por compliance) | 7 | 4 | 5 | 5 | 7 | 5,60 |
| D | Mínimo: executar S6 como spec'd + cano ESG pequeno | 5 | 9 | 9 | 5 | 5 | 6,40 |
| E | Portal de auditoria para terceiros | 8 | 3 | 2 | 7 | 7 | 5,70 |
| **F** | **"Arco da Prova com Espinha Dupla"** — B + 2 substratos primeiro | **9** | **7** | **5** | **10** | **9** | **8,25** |

Pesos: Valor 25 · Risco 20 (10=seguro) · Custo 15 (10=barato) · Tese 25 · Reuso 15.

**Escolha: F.** A reavaliação é simultaneamente o fim do Transformar e o começo do
Evoluir — separá-los (A) corta a cadeia causal no meio. ESG-first (C) é greenwashing
arquitetural: ESG sem dado real embaixo inverte a tese (ESG é *saída* da prova, nunca
fachada). O mínimo (D) entrega o comprometido mas abandona a interface que a Academia
Viva I4 já reivindicou (o delta real da derrota do antagonista). O portal (E) é a visão
certa na hora errada — sem piloto rodando, cria classe nova de RLS sem cliente; fica o
gancho (snapshots com hash, §F4). A simetria com o ramo F da Academia (8,25) não é
acidente: é a mesma doutrina — substrato antes de feature — aplicada ao eixo seguinte.

**Risco assumido:** substrato atrasa tela nova. **Mitigação:** a 1ª fatia vertical entrega
engine + experiência visível em `/plano-acao` no mesmo movimento (§I).

---

## §D · As 7 inovações

> Formato por inovação: o que é · âncora científica/normativa (verificada) · composição
> (arquivos exatos) · o que é novo · pack · ética.

### I-T1 · Plano Vivo — dono, prazo, métrica e hipótese em cada ação

**O que é.** O loop S6 elevado. Cada `ActionItem` ganha: **dono** (papel/membership — a
pessoa responsável pela MEDIDA, exigência §13), **prazo** (data), **métrica** (label +
baseline + alvo — o que a reavaliação compara depois), **hipótese CMO** ("no contexto X,
o mecanismo Y deve produzir Z" — Pawson & Tilley) e **intenção de implementação**
(Gollwitzer, já cânone). Máquina de status com transições válidas registradas no
**Action Log** (event ledger INSERT-only) e evidência nos 4 tipos canônicos
(texto/foto/checklist/métrica). O **medidor §13** — % de ações com dono+prazo+métrica —
vira número visível na tela: o critério de aceite do S6 transformado em feature.

**Ciência/norma:** Guia MTE 2026 §13; PDSA/Deming; Locke & Latham 2002; Pawson & Tilley
1997; Nielsen 2013 (as ações nascem da pauta da Cerimônia I-T2).

**Compõe:** `action-plan-engine.ts` (estende `ActionItem` sem quebrar os 14 testes),
`priority-engine.ts` (a montante), `pgr-engine.ts` (a ação carrega `control_tier` da
hierarquia NR-01), `action-plan-mock.ts`, rota `/plano-acao`.

**Interface com a Academia (I7 Diário de Prática Viva) — DECLARADA, tabelas separadas:**
`practice_records` (pessoal, S5, conteúdo reflexivo privado) e `evidence_records` (org,
evidência de medida organizacional) **não se fundem** — domínios e RLS diferentes. A ponte
é referência consentida: `evidence_records.source_kind='practice_record_ref'` aponta o id
de um registro que o dono ESCOLHEU vincular; conteúdo nunca é copiado. O enum dos 4 tipos
de evidência é vocabulário compartilhado via pack (uma definição, dois consumidores).

**Pack:** labels de status, tipos de evidência, papéis elegíveis a dono, templates CMO
por driver.

**Ética (guarda estrutural).** O risco central do S6 verbatim — *"nunca transformar risco
organizacional em problema individual de resiliência"* — vira construção: `control_tier`
só aceita os 4 tiers NR-01 (eliminação>organização>administrativa>monitoramento). Não
existe tier "resiliência individual"; o plano **não consegue** individualizar o risco.
O dono responde pela medida, jamais é associado ao dado de exposição de ninguém.

### I-T2 · Cerimônia da Devolutiva — a devolutiva participativa guiada

**O que é.** A devolutiva deixa de ser uma tela e vira um **rito facilitado** sobre a
capsule selada REAL: agenda derivada dos 4 blocos do `devolutiva-engine`
(Medimos→Aprendemos→Significa→Próximo), roteiro determinístico por driver (sem LLM,
P2-04), e o momento participativo — os presentes **votam prioridades** entre os drivers
expostos. A saída é a **pauta de co-criação**: drivers ranqueados pela voz do trabalhador,
que semeiam o Plano Vivo. Privacidade por schema (idioma do I5 da Academia):
`devolutiva_sessions` não tem coluna de conteúdo — só metadados + presença + votos
agregados.

**Ciência/norma:** Nielsen 2013 / Nielsen & Noblet (participação prediz efetividade);
WHO 2022; ISO 45003 (consulta); AAR na variante de reavaliação (T4).

**Compõe:** `devolutiva-engine.ts` (testado — o trabalho é o `devolutiva-ceremony-engine`
novo + wiring real), `capsule-report.functions.ts` (a capsule real que já sai do Cloud),
rota `/devolutiva`, SK-08 (S6).

**Novo:** devolutiva como rito estruturado com voz do trabalhador virando input RASTREÁVEL
do plano — e a pauta de co-criação é a prova documental da participação que a ISO 45003
pede. Nenhum concorrente tem isso.

**Pack:** nomes do rito por setor, blocos, quórum. **Ética:** votos só agregados (k≥5);
linguagem blame-free verbatim (o problema é o sistema, nunca quem sofre dele).

### I-P1 · Cofre de Ciclos — o pipeline de dados reais (substrato E)

**O que é.** A peça mais fundacional: capsules seladas (S4) → série longitudinal canônica
→ todos os motores do Evoluir. Três componentes:

1. **`org_cycle_registry`** — a decisão humana de governança: "esta capsule representa o
   ciclo 2026-T1 do instrumento COPSOQ desta org". Espelha o princípio do S4 (publicar é
   k-anon; *registrar* é decisão humana, nunca automática).
2. **`cycle-history.server.ts`** — fronteira server-only que lê `wave_capsules` + registry
   e devolve `MeasurementContextCapsule[]` — **o mesmo tipo que o mock devolve hoje**, então
   `buildLongitudinalReading`, `evaluateInterventionBatch`, reavaliação, trend e
   `buildCycleProof` funcionam **sem mudar uma linha de engine**.
3. **`cycle-history-engine.ts`** puro — valida/mapeia o shape do banco
   (`{mean, high_risk_pct, n}` + `suppressed_dims`) para o tipo canônico, detecta lacunas
   de série e aplica a política de fallback **declarada**: org sem ciclos registrados vê a
   demo mock ROTULADA como demo — nunca silenciosamente.

**Ciência/norma:** ISO 30414 (séries temporais de capital humano); GRI 3 (ciclos de
reporte); a tese do moat — o dataset longitudinal de eficácia É o ativo.

**Compõe:** `capsule-aggregator.server.ts` (escreve), `cycle-proof.server.ts` +
`earned-seal.server.ts` (trocam mock→real atrás do mesmo tipo), `reavaliacao-engine.ts`,
rotas `/evolucao` `/evolucao-nr1` `/fechamento` `/selo` `/impacto`.

**Novo:** fecha o gap central ("0% dado real") e **entrega a interface que a Academia
Viva I4 reivindicou** — o delta real que derrota antagonistas nasce aqui.

**Pack:** nada — o Cofre é infraestrutura; rótulos de ciclo vêm do season-engine.
**Ética:** capsule bruta nunca sai da fronteira server; `suppressed_dims` viaja junto e
vira declaração positiva no Dossiê ("dimensão omitida por desenho de privacidade");
demo e real jamais se misturam sem rótulo.

### I-E1 · Dossiê ESG Auditável — o relatório pronto-para-asseguração

**O que é.** O `AnnualEsgReport` elevado a artefato que sobrevive a asseguração limitada:

- **Linhagem por KPI:** cada `EsgKpi` ganha `lineage {instrument, waveId, capsuleId, n,
  kAnonStatus, formula}` — clique no número e veja a onda que o gerou.
- **Anexo metodológico gerado:** instrumentos, psicometria citada, k-anon, limitações.
- **Dupla materialidade DECLARADA:** a org declara (nunca o engine inventa) materialidade
  de impacto e financeira por tema, com autor e data.
- **Normas 100% injetadas:** defs de **GRI 403** e **ISO 30414** entram AO LADO das ESRS
  S1/ODS/GRI existentes como config de pack — zero mudança de engine (prova viva §5.8).
- **Regras anti-greenwashing verbatim** (§F3), checadas pelo engine.
- **Snapshot imutável:** `esg_report_snapshots` INSERT-only com hash do payload — o gancho
  do futuro portal de auditoria, sem construí-lo agora.

**Ciência/norma:** CSRD 2022/2464 + ESRS S1; GRI 403:2018 e GRI 3:2021; ISO 30414:2018;
ISSB/SASB; direção anti-greenwashing UE — convergente com §8.

**Compõe:** `esg-report-engine.ts` (extensão retrocompatível — 10 testes intactos),
`esg-engine.ts` (defs novas só em mock/pack), novo `assurance-annex-engine.ts`, Cofre de
Ciclos (linhagem real), rota `/relatorio-global`.

**Pack:** frameworks por setor, temas de materialidade, entidade declarante, verbatims.
**Ética:** nunca prometer aprovação em auditoria; materialidade com autoria; omissões
k-anon documentadas, jamais escondidas.

### I-E2 · Ata de Vitória — a derrota do antagonista com prova auditável

**O que é.** A peça criativa do Evoluir e a **interface formal com a Academia Viva I4**.
Quando a reavaliação REAL mostra que o driver do antagonista da temporada recuou, o
`victory-engine` computa a condição de vitória: **delta de exposição real** (reavaliação)
∧ **medida mantida** (Vigia I-E4) ∧ **evidência reportável** (k-anon). A saída é uma
**Ata** — documento da família pgr-document — que declara: o antagonista, o driver, o
delta com **tamanho de efeito honesto** ("recuo pequeno" quando é pequeno), as medidas que
a associação sugere (correlação, não causalidade — disclaimer §11.4.4 verbatim), as
atestações do cycle-close. Sem delta ou sem manutenção → **não há Ata** ("atividade não é
evidência"). A Academia encena a derrota; este blueprint a prova.

**Ciência/norma:** Guia MTE §11.4.4; tiers de confiança do evidence-engine (à la GRADE,
cap "indicativo" herdado e exibido); §8.

**Compõe:** `reavaliacao-engine` + `evidence-engine` + `cycle-close-engine` + idioma
`pgr-document` + crosswalk driver→antagonista (canônico, já usado pela Academia I4).
Tabela `victory_records` INSERT-only (payload + hash).

**Novo:** um "boss fight" cuja derrota exige delta psicométrico real com disclaimer de
causalidade é categoria nova em gamificação corporativa.

**Pack:** bestiário via `collectiveNarrative` (seção já prevista pela Academia — reuso);
template da Ata por setor. **Ética:** antagonista sempre sistêmico; efeito modesto
declarado modesto; demo mostra Ata-exemplo ROTULADA, nunca vitória inventada.

### I-E3 · Livro do Ciclo — a crônica anual da organização viva

**O que é.** O artefato editorial premium do ano: um documento serif que compõe as 4
temporadas em capítulos — a jornada canônica (T1 IVO → T2 VIA-T → T3 COPSOQ → T4 Re-IVO),
as pautas de co-criação, as Atas de Vitória **e as não-vitórias com igual dignidade**, o
Dossiê ESG, o Selo computado, a lente FIB-T. O "relatório anual que uma empresa viva
escreve": não um dashboard exportado, mas uma narrativa com prova embutida — o que o CHRO
leva ao board e o que o marketing PODE usar (porque cada frase tem linhagem). Render
client-side com a camada `jspdf`+`html2canvas` que a Academia já comprou (ramo E
compartilhado).

**Ciência/norma:** ISO 30414 (reporte narrativo); GRI (equilíbrio entre desempenho
positivo e negativo — registrar o que piorou é o que torna o resto crível); arquitetura
narrativa §5.7.

**Compõe:** novo `cycle-book-engine.ts` (assembly puro de sections), devolutiva-engine,
victory-engine, esg-report-engine, certification-engine, fibt-engine, season-engine,
idioma pgr-document.

**Pack:** título por setor ("Livro do Ciclo" / Escola: "Anuário Vivo"), capítulos
habilitados. **Ética:** capítulo de limitações obrigatório; nada sem fonte computada.

### I-E4 · Vigia de Manutenção — a sentinela da eficácia

**O que é.** Pequena e de alto valor regulatório: medidas concluídas do Plano Vivo entram
em **vigilância** — check-ins periódicos "a medida segue em funcionamento?" registrados no
Action Log. Medida em desuso → `maintenanceByDriver[driver]=false` → reavaliação e
intervention-evidence **já retiram o crédito de eficácia** (`Confirmado no código` — o
flag existe e é testado; falta quem o alimente com verdade; hoje é mock).

**Ciência/norma:** Guia MTE §11.4.4 ponto 2 (manutenção como condição); Nielsen & Randall
2013 (avaliação de processo — sustentação importa tanto quanto desenho).

**Compõe:** action-log-engine (kind `maintenance_check`), reavaliacao-engine (consome, sem
mudança), victory-engine (condição de vitória), rota `/plano-acao`.

**Pack:** cadência, papéis que atestam. **Ética:** o check-in atesta a MEDIDA, nunca
avalia pessoas.

---

## §E · Spec dos dois substratos

### E1 · Ledger de Transformação (substrato T — o Transformar escreve)

- `action_plans` (header) + `action_items` (as ações §13) são atualizáveis; **toda mudança
  material vira evento no `action_log`** (INSERT-only) — status não é opinião, é fold.
- **O §13 vira constraint:** em plano `active`, dono/prazo/métrica são NOT NULL. Um plano
  não consegue ser ativado incompleto — o critério de aceite do S6 passa a ser fisicamente
  garantido pelo banco.
- Evidência (`evidence_records`, INSERT-only) referencia a ação e carrega
  `source_kind ∈ {direct, practice_record_ref}` — a ponte consentida com o Diário da
  Academia (§D I-T1).

### E2 · Cofre de Ciclos (substrato E — o Evoluir lê)

- **Registro é governança humana:** o RH/SST registra capsule→ciclo em
  `org_cycle_registry`; `superseded_by` permite corrigir sem apagar (INSERT-only).
- **Troca de fonte atrás do tipo:** `getCapsuleHistory()` (hoje mock) passa a ter
  implementação real com a MESMA assinatura — todos os consumidores (reavaliação, trend,
  cycle-proof, earned-seal) ficam intocados.
- **Fallback declarado:** org real sem ciclos → estado vazio honesto ("registre seu 1º
  ciclo") ou demo ROTULADA — configurável, nunca silencioso. Demo pura (sem sessão)
  continua mock, como sempre.

---

## §F · Spec do Dossiê ESG Auditável

### F1 · Linhagem (o coração)

```
EsgKpi.lineage = {
  instrument,           # COPSOQ | PERMA/IVO | VIA-T | FIB-T
  waveId, capsuleId,    # a onda e a cápsula seladas que geraram o número
  n,                    # respondentes agregados
  kAnonStatus,          # ok | partially_suppressed (+ dims omitidas)
  formula               # a conta, visível (idioma do Vitality P&L)
}
```

KPI sem linhagem completa **não entra** no Dossiê (regra F3.1) — aparece na seção de
lacunas ("medição planejada, ainda não realizada").

### F2 · Dupla materialidade declarada

A organização declara, por tema (ex.: saúde psicossocial, jornada, equidade): relevância
de impacto (pessoas) e financeira (negócio), autor da declaração, data. O engine só
valida completude — **nunca infere materialidade**. A declaração entra no snapshot.

### F3 · Regras anti-greenwashing (verbatim, checadas pelo engine)

1. **"Nenhum indicador sem linhagem"** — KPI sem cadeia onda→capsule→fórmula não publica.
2. **"Pronto para asseguração ≠ assegurado"** — verbatim obrigatório: *"Este relatório
   organiza evidência com linhagem auditável; não constitui verificação independente."*
3. **"Nenhuma afirmação de resultado sem ciclo medido"** — claims de melhora exigem ≥2
   ciclos no Cofre e delta com disclaimer §11.4.4.
4. **Omissão documentada** — dimensão suprimida por k-anon aparece como decisão de
   privacidade declarada, nunca como lacuna escondida.
5. **Equilíbrio GRI** — o que piorou reporta com a mesma tipografia do que melhorou.

### F4 · Snapshot imutável

`esg_report_snapshots` INSERT-only: payload completo + `content_hash` + gerador + data.
Regerar = nova linha. O hash permite a um terceiro verificar que o PDF que recebeu é o
snapshot íntegro — o gancho do portal de auditoria (pós-S8) sem construí-lo agora.

---

## §G · Arquitetura de dados (Supabase)

Padrão **org** (S1–S4: RPC atômica + autorização por sessão; agregado sai por função) para
tudo — nada aqui é dado pessoal do padrão S5, exceto a *referência* a `practice_records`
(que permanece na tabela da Academia). **INSERT-only onde história importa.**

| Tabela | Colunas-chave | Nota |
|---|---|---|
| `action_plans` | org_id, cycle_key, season_id, source_capsule_id, status(draft\|active\|closed), created_by | header; mudanças materiais viram eventos |
| `action_items` | plan_id, driver_id, lever_id, title, control_tier (SÓ os 4 NR-01), owner_membership_id, owner_role_label, due_on, metric_label, metric_baseline, metric_target, cmo_context/mechanism/outcome, status, maintenance_status | **dono/prazo/métrica NOT NULL em plano ativo** |
| `action_log` | item_id, event_kind(status_change\|checkin\|note\|maintenance_check), actor_membership_id, payload, occurred_at | **INSERT-only** — trilha de auditoria |
| `evidence_records` | org_id, item_id, driver_id, evidence_kind(texto\|foto\|checklist\|metrica), content_ref, source_kind(direct\|practice_record_ref), consent_ref, occurred_on, recorded_by | **INSERT-only**; foto via storage ref |
| `devolutiva_sessions` | org_id, capsule_id, facilitator_membership_id, script_version, held_on, attendance_count, priority_votes JSONB (agregado) | **zero coluna de conteúdo** |
| `org_cycle_registry` | org_id, instrument, cycle_key, capsule_id, registered_by, registered_at, superseded_by | **INSERT-only**; UNIQUE(org, instrument, cycle_key) vivo |
| `victory_records` | org_id, cycle_key, antagonist_id, driver_id, payload JSONB, content_hash, issued_at | **INSERT-only** — Ata selada |
| `esg_report_snapshots` | org_id, year, payload JSONB, content_hash, generated_by, generated_at | **INSERT-only** — trilha de asseguração |

**Lição REVOKE (inviolável nesta conta):** toda migration inclui
`REVOKE ALL … FROM anon, authenticated` + GRANTs mínimos + **queries
`has_table_privilege` de verificação no próprio SQL** — o default da conta concede ALL a
tabela nova, e o REVOKE já foi no-op silencioso duas vezes (achados S1 e S5,
`RUNBOOK_MIGRACOES_LOVABLE.md`).

---

## §H · Mapa de engines

| Engine novo (puro, kebab-case, teste co-localizado) | Compõe | Testes est. |
|---|---|---|
| `engine/action-plan/plan-enrichment-engine.ts` | action-plan, tiers NR-01 injetados — dono/prazo/métrica/CMO + medidor §13 + máquina de status | ~20 |
| `engine/action-plan/action-log-engine.ts` | fold do ledger → timeline, % concluídas, evidências/ação, maintenance flags | ~12 |
| `engine/educar/devolutiva-ceremony-engine.ts` | devolutiva-engine, consent — agenda, quórum, votos k-anon, pauta | ~14 |
| `engine/evolucao/cycle-history-engine.ts` | shape DB→MeasurementContextCapsule, validação de série, fallback declarado | ~14 |
| `engine/esg-report/assurance-annex-engine.ts` | esg-report, esg — linhagem, materialidade, checagem anti-greenwash | ~16 |
| `engine/evolucao/victory-engine.ts` | reavaliacao, evidence, cycle-close, idioma pgr-document | ~14 |
| `engine/evolucao/cycle-book-engine.ts` | devolutiva, victory, esg-report, certification, fibt, season | ~12 |

**Extensões retrocompatíveis:** action-plan-engine (+6), esg-report-engine (+4 —
`lineage`/`materiality` opcionais). **Zero mudança:** reavaliacao, evidence, trend,
cycle-close — só passam a receber dado real. Fronteira server nova:
`src/lib/api/cycle-history.server.ts` (I/O fora do engine). Total: **~112 testes novos
sobre os 1518 atuais**; nenhum engine importa `domain/`.

---

## §I · Rollout (a espinha S6–S8 permanece)

| Fase | Conteúdo | Demo de 60s |
|---|---|---|
| **Fatia imediata** (esta sessão) | I-T1 mock-first: plan-enrichment + action-log engines em `/plano-acao` | "Cada ação agora tem dono, prazo e métrica; o medidor §13 sai de 0% para 100%; o Action Log conta a história da semana — status não é opinião, é fold de eventos." |
| **S6 (comprometido — este blueprint É o S6 elevado)** | Substrato T (tabelas+RPCs); Cerimônia v1 sobre capsule real; PDF do plano (jspdf compartilhado); Action Log real (interface I7); SK-03/05/06/08 | "Da capsule selada ao PDF do plano com dono/prazo/métrica; a equipe vota prioridades; o líder registra evidência." |
| **S6.75 · "Cofre de Ciclos"** (rider novo; S6.5 é da Academia) | Substrato E: registry + cycle-history.server + `/evolucao` `/evolucao-nr1` `/fechamento` `/selo` sobre dado real + Vigia v1 | "Duas ondas reais seladas → registro o ciclo → a curva sai do mock: o delta na tela é o delta do banco. O Selo agora é ganho de verdade." |
| **S7 (+ carona leve)** | Regras anti-greenwash na copy comercial (claims da landing só de dado computado) | "A landing afirma só o que o banco prova." |
| **S8 (+ riders)** | Dossiê ESG v1 (linhagem+materialidade+snapshot) compondo o brief executivo comprometido; **Ata de Vitória v1 → destrava as Expedições da Academia (I4)**; Dossiê lê `csr_pledges` cumpridos como KPI de G | "O KPI abre e mostra a onda que o gerou; A Sobrecarga recua com d declarado e a Ata sela; o compromisso CSR cumprido vira linha do G." |
| **S9/pós** | Livro do Ciclo v1 (no 1º fechamento anual real); portal de auditoria sobre os snapshots | "O ano inteiro num documento que um auditor folheia." |

**Interfaces declaradas com a Academia Viva 2.0:** Action Log↔I7 (referência consentida,
tabelas separadas) · camada jspdf única (Diploma Vivo + PDF do plano + Ata + Livro) ·
victory-engine↔Expedições (a Academia encena, este blueprint prova) · `csr_pledges`
(tabela da Academia) lida pelo Dossiê como KPI de Governança.

---

## §J · Riscos e ética

| Risco | Mitigação de design |
|---|---|
| Individualizar o risco ("faça yoga" como resposta a sobrecarga) | guarda estrutural: só os 4 tiers NR-01 existem no schema — não há onde registrar intervenção de resiliência individual como MEDIDA |
| Dono da ação vira culpado do risco | o dono responde pela MEDIDA; nunca é associado a dado de exposição; copy verbatim "responsável pela medida, não pelo risco" |
| Greenwashing via Dossiê | regras F3 checadas pelo engine; KPI sem linhagem não publica; "pronto ≠ assegurado" verbatim |
| Demo confundida com dado real | fallback DECLARADO do Cofre; rótulo "demonstração" persistente; jamais mistura silenciosa |
| Cerimônia expõe voz individual | votos só agregados k≥5; sem coluna de conteúdo; roteiro blame-free |
| Vitória inflada (efeito pequeno vendido como grande) | tamanho de efeito herdado do evidence-engine (cap "indicativo"); Ata declara magnitude honesta; sem delta → sem Ata |
| Manutenção teatral (check-in de fachada) | check-ins são INSERT-only com autor e data — auditáveis; RH vê taxa de atestação |
| LGPD (dono, facilitador, autor de snapshot) | papéis/memberships, nunca dados sensíveis; DPO review no S6; retenção declarada |
| Sobrecarga de processo (rituais demais) | tudo ≤15 min (cânone §1.6); cerimônia 1×/ciclo; check-in de manutenção 1 clique |

**O que NUNCA faremos:** ranking de equipes por delta; prometer conformidade NR-1 ou
aprovação em auditoria; claim de causalidade; misturar Domínio A/B; publicar recuo de
antagonista sem k-anon.

---

## §K · Métricas e critérios de aceite

**North Star do arco:** **% de prioridades medidas que chegam ao Dossiê com linhagem
completa** — prioridade→plano ativo→evidência→reavaliação→KPI publicado. É a taxa de
fechamento do ciclo inteiro, e só sobe se TODAS as peças funcionarem.

| Métrica | Fonte | Guarda |
|---|---|---|
| % ações com dono+prazo+métrica (medidor §13) | action_items | por plano; nunca por pessoa |
| % concluídas no ciclo · evidências/ação (métricas S6 verbatim) | action_log fold | agregado |
| Participação na cerimônia · pauta gerada | devolutiva_sessions | k≥5 |
| Ciclos registrados · lacunas de série | org_cycle_registry | por org |
| Delta de exposição na reavaliação (métrica S6) | Cofre + reavaliacao | com tamanho de efeito declarado |
| Taxa de manutenção de medidas | maintenance_checks | por medida, nunca por pessoa |
| KPIs com linhagem completa / total | Dossiê | a régua anti-greenwash |
| Atas emitidas (e negadas — igual dignidade) | victory_records | contagem |

**Aceite da fatia imediata (I-T1):** engines puros sem import de domain; ~32 testes novos
verdes (1518→~1550); medidor §13 COMPUTADO (não afirmado); pack valida no Ajv; demo de
60s em `/plano-acao` no browser; zero regressão.

---

## Autoauditoria (§10 da SKILL_MESTRA)

- [x] Tríade planejada para cada inovação (engine → teste → mock → rota → wiring).
- [x] Engine ≠ domínio: tiers, bestiário, frameworks ESG, verbatims — tudo via pack.
- [x] k-anon, A/B, disclaimers e termos vedados endereçados por inovação (§D, §F3, §J).
- [x] Honestidade: correções de fato registradas (§A); citações verificadas (Nielsen 2013,
      Pawson & Tilley 1997, WHO 2022, ISO 45003:2021, ISO 30414:2018, GRI 403:2018,
      CSRD 2022/2464, Guia MTE §13/§11.4.4); zero conteúdo inventado; "pronto ≠ assegurado".
- [x] Composição sobre acúmulo: 7 engines novos compõem 14 existentes; 4 engines centrais
      do Evoluir recebem dado real com ZERO mudança.
- [x] Vaidade rejeitada e registrada: Kotter, blockchain, selo comprado, portal prematuro.
- [x] Rollout preserva S6–S8; interfaces com a Academia declaradas, não improvisadas.
- [x] Usuário do quiosque: cerimônia presencial com quórum, check-in de 1 clique,
      linguagem adulta — o chão de fábrica participa do desenho, não só do dado.
