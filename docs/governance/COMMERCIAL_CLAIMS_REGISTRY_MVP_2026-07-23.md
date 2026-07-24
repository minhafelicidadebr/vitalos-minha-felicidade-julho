# Commercial Claims Registry — MVP (H2.1B)

> Onda H2.1B do `PLANO_MASTER_PLUS_PROXIMAS_FASES_VITALOS_2026-07-23.md`, sob
> super prompt operacional detalhado do founder (aprovação controlada
> H2.1B, 2026-07-23). Constrói sobre a contenção emergencial da H2.1A
> (`docs/AUDITORIA_MIGRATIONS_POS_G1...` não — ver `feat/h2.1a-claims-containment`,
> mergeado em `main` antes desta onda começar).

## 1. Problema resolvido

A H2.1A removeu os claims públicos de maior risco (calculadora de ROI,
Oxford, "Bateria COPSOQ II", multas, etc.) trocando texto livre por copy
aprovada — mas a proteção era só a redação em si. Nada impedia que a mesma
frase arriscada fosse reintroduzida amanhã, numa superfície nova, sem que
ninguém percebesse: a única rede de segurança automatizada era um teste de
blacklist textual (`landing-copy.copsoq-truth.test.ts`), que só pega frases
*idênticas* às já catalogadas — não paráfrases, abreviações, números órfãos,
causalidade ou alegação institucional nova.

O Commercial Claims Registry MVP substitui, para as 8 afirmações comerciais
de maior risco já aprovadas na H2.1A, o modelo:

```
copy pública livre → blacklist textual
```

por:

```
claim aprovado → variante autorizada → superfície autorizada
→ fonte e limitação → verificação automática
```

## 2. Escopo

**Dentro:** as 8 afirmações comerciais de alto risco identificadas e
aprovadas na H2.1A (identidade do instrumento, privacidade/agregação, papel
no GRO/PGR, escopo regulatório, VIA-T exploratório, relato de
sustentabilidade, baseline econômico, sanções/fiscalização).

**Fora (deliberadamente):** governar toda a comunicação pública do produto.
CTAs neutros, títulos navegacionais, labels funcionais ("Conheça o VitalOS",
"Próximo passo", "Agende uma conversa") nunca precisam de `claim_id`. Uma
varredura site-wide completa (PDFs, e-mails, todas as rotas de marketing)
é trabalho maior, reservado para uma onda futura — ver §11 riscos residuais.

## 3. Categorias (taxonomia fechada do MVP)

```
instrument_identity · regulatory_scope · privacy · scientific
institutional_affiliation · quantitative · performance · roi_causal
sanctions · methodological
```

Só 6 das 10 categorias têm claim registrado nesta fatia
(`instrument_identity`, `privacy`, `methodological`, `regulatory_scope`,
`performance`, `roi_causal`, `sanctions` — 7, na verdade). `scientific`,
`institutional_affiliation` e `quantitative` ficam disponíveis para uso
futuro, sem claim ainda.

## 4. Os 8 claims iniciais

| claim_id | categoria | superfície(s) | status |
|---|---|---|---|
| `CLAIM-COM-INSTRUMENT-LABEL-001` | instrument_identity | `marketing.nr1.journey.t1-instrument-label` | bindado |
| `CLAIM-COM-PRIVACY-AGGREGATION-001` | privacy | `marketing.modal.method-deep.mensurar-privacy-summary` | bindado |
| `CLAIM-COM-GRO-PGR-ROLE-001` | methodological | `marketing.nr1.hero.gro-pgr-role` | bindado |
| `CLAIM-COM-REGULATORY-SCOPE-001` | regulatory_scope | `marketing.nr1.regulatory-scope` | **registrado, sem consumidor ainda** (fora da lista de migração do §10 do super prompt) |
| `CLAIM-COM-VIAT-EXPLORATORY-001` | performance | `marketing.modal.lenses-deep.q4-viat-why` | bindado |
| `CLAIM-COM-SUSTAINABILITY-REPORT-001` | regulatory_scope | `marketing.nr1.journey.t4-sustainability` | bindado |
| `CLAIM-COM-ECONOMIC-BASELINE-001` | roi_causal | `marketing.home.economic-baseline` | bindado |
| `CLAIM-COM-SANCTIONS-ENFORCEMENT-001` | sanctions | `marketing.nr1.mudou.sanctions-body` | bindado |

Texto completo, fontes e limitações: `src/domain/commercial-claims/commercial-claims-registry.json`.

## 5. Arquitetura

```
src/domain/commercial-claims/
├── commercial-claim-types.ts                tipos (categoria, status, entry, resolved)
├── commercial-claims-registry.schema.json   contrato Ajv (draft-07) do registry COMPLETO
├── commercial-claims-registry.json          dado congelado (frozen: true), os 8 claims
├── commercial-claims-registry.ts            loader: valida, deep-freeze, getters
├── commercial-claims-registry.test.ts       19 testes de integridade + gate de expiração
├── commercial-claims-resolver.ts            resolveCommercialClaim() completo — SÓ server/build/teste
├── commercial-claims-resolver.test.ts       14 testes (caminho feliz + 8 fail-closed + pureza)
├── commercial-surface-ids.ts                inventário de IDs semânticos usados no MVP
├── commercial-surface-ids.test.ts           paridade inventário × registry
├── commercial-claims-public-bindings.ts     fonte única dos {claimId,variant,surfaceId} públicos
├── commercial-claims-public-projection.schema.json   contrato da projeção mínima
├── commercial-claims-public-projection.json          {claimId,variant,surfaceId,text} — SEM metadados
├── commercial-claims-public-projection.test.ts       paridade projeção × registry+bindings
├── commercial-claims-public-resolver.ts     resolvePublicCommercialClaim() — o ÚNICO client-reachable
├── commercial-claims-public-resolver.test.ts  determinismo, ausência de Date(), fail-closed
├── commercial-claims-scanner.ts             scanner auxiliar de uso órfão
└── commercial-claims-scanner.test.ts        16 testes (classificação + gate real, zero órfãos)

scripts/generate-commercial-claims-public-projection.ts   gera a projeção (Node/Bun, nunca navegador)

src/features/landing/data/landing-copy.ts   consome resolvePublicCommercialClaim()
                                             nos 7 pontos bindados — NUNCA importa o registry completo
src/features/landing/data/landing-copy.h2-1b-binding.test.ts  11 testes de binding
```

### Duas camadas de resolução — por que existem as duas

**Camada completa** (`commercial-claims-resolver.ts` + `commercial-claims-registry.ts`) — usada só em
Node/Bun: scripts de build e arquivos de teste. Faz TODAS as checagens
fail-closed, incluindo `isClaimExpired()` (que chama `Date.now()`).

```ts
resolveCommercialClaim({
  claimId: "CLAIM-COM-INSTRUMENT-LABEL-001",
  variant: "short",
  surfaceId: COMMERCIAL_SURFACE_IDS.NR1_JOURNEY_T1_INSTRUMENT_LABEL,
}).text
```

**Camada pública** (`commercial-claims-public-resolver.ts`) — a ÚNICA que
`landing-copy.ts` importa, porque `landing-copy.ts` é bundlado tanto para o
servidor quanto para o navegador. Lê só a projeção estática já resolvida —
nenhum `Date()`, nenhum acesso a `limitations`/`source_refs`/`owner_role`/
datas, nenhuma checagem de expiração em runtime.

```ts
resolvePublicCommercialClaim(PUBLIC_COMMERCIAL_BINDINGS.nr1InstrumentLabelT1).text
```

Fail-closed nas duas camadas: claim/surface/variant sem correspondência
sempre lança (`CommercialClaimResolutionError` na completa,
`PublicCommercialClaimNotFoundError` na pública). Nunca string vazia, nunca
fallback, em nenhuma das duas.

### Decisão de design registrada: expiração não derruba o módulo inteiro

O super prompt pedia "loader rejeita claim vencido". Implementei diferente,
por decisão deliberada (documentada no topo de `commercial-claims-registry.ts`):
o **loader** só rejeita malformação estrutural (schema, ID duplicado, data
inválida, `review_due_at < reviewed_at`) — essas são falhas de configuração,
faz sentido derrubar o import. **Expiração** é estado temporal que muda sem
nenhum deploy; se o loader jogasse o módulo inteiro fora assim que UMA data
vencesse, o app quebraria pelo motivo errado. Por isso `isClaimExpired()` é
função pura que o **resolver** consulta por claim (rejeita só aquele claim,
não o módulo inteiro), e há um teste dedicado
(`commercial-claims-registry.test.ts`, "gate: nenhum claim approved do
registry real está vencido hoje") que falha o CI quando alguma
`review_due_at` passar — isso *é* o "gate falha" do §13, só que no lugar
certo da pirâmide de falha.

## 6. Processo para adicionar um claim novo

1. Editar `commercial-claims-registry.json` — novo objeto em `claims[]`
   seguindo o schema (`claim_id` único no padrão `CLAIM-COM-<SLUG>-NNN`,
   `category` de dentro da taxonomia fechada, `status: "draft"` até revisão).
2. Rodar `bun test src/domain/commercial-claims` — o schema e as regras
   estruturais são verificados automaticamente.
3. Revisão humana (fonte real, limitação, `owner_role`, datas) — só depois
   o `status` vira `"approved"`.
4. Adicionar o `surfaceId` a `commercial-surface-ids.ts` e a
   `allowed_surface_ids` do claim (os dois lados precisam bater, ou o
   resolver lança).
5. Adicionar o binding a `commercial-claims-public-bindings.ts` e rodar
   `bun run scripts/generate-commercial-claims-public-projection.ts` —
   isso resolve o claim contra o registry completo (com checagem de
   expiração) e grava a entrada mínima na projeção pública.
6. Consumir via `resolvePublicCommercialClaim(PUBLIC_COMMERCIAL_BINDINGS.<key>)`
   na superfície pretendida — nunca importar o registry completo de
   `landing-copy.ts` ou de qualquer arquivo client-reachable.
7. Adicionar teste de binding (mesmo padrão de
   `landing-copy.h2-1b-binding.test.ts`).

## 7. Processo de revisão e expiração

- Todo claim `approved` carrega `reviewed_at` e `review_due_at` (6 meses
  neste MVP, mesmo horizonte usado noutras revisões deste repo).
- `review_due_at` vencida ⇒ `resolveCommercialClaim()` lança para aquele
  claim especificamente ⇒ a superfície que o consome quebra em runtime
  (fail-closed, nunca silencioso) ⇒ força revisão antes de qualquer nova
  publicação.
- Renovar exige: reconfirmar a fonte, decidir se o texto continua correto,
  bump de `reviewed_at`/`review_due_at`, commit explícito. **Nenhum script
  altera isso sozinho** — nem o scanner, nem nenhuma automação futura.

## 8. Usos proibidos (por desenho)

- Scripts/automação **nunca** editam `allowed_surface_ids`, `status`,
  fontes, datas ou `limitations` — só um commit humano faz isso.
- Uso observado (o scanner rodando e encontrando um padrão "governado")
  **nunca** vira autorização de uma superfície nova por conta própria.
- Nenhuma UI de edição de claims, nenhum CMS, nenhuma IA gerando ou
  aprovando claim.

## 9. Diferença entre claim e modelo computacional

**O Commercial Claims Registry não valida modelos financeiros, não autoriza
cálculos de ROI e não substitui revisão jurídica, científica ou
regulatória.** Ele governa *texto* — a string exata que pode aparecer numa
superfície pública. A Calculadora de Impacto (retirada de circulação na
H2.1A) é um exemplo do que o registry **não** resolve: um número computado a
partir de constantes (`RECOVERY_PCT`, `INVEST_PCT`) não vira seguro só por
ganhar um `claim_id` — a decisão certa, tomada na H2.1A, foi tirar o cálculo
de circulação inteiramente, não "aprovar" a fórmula.

## 10. Scanner auxiliar — o que ele prova e o que não prova

`commercial-claims-scanner.ts` varre texto por padrões de risco
(percentuais, moedas, razões, "garantido", "chancela"...) e classifica cada
achado como `governed` (dentro do span literal de um claim `approved`),
`suspicious` (bate uma exceção estrutural conhecida — Q1/Q2, versão, data,
contagem, n≥5) ou `orphan` (nem um nem outro — é o único caso que falha o
gate).

**Escopo deliberadamente estreito nesta fatia**: o teste de regressão
(`commercial-claims-scanner.test.ts`) varre só as 7 superfícies REGISTRADAS
(bindadas na B4), não o arquivo `landing-copy.ts` inteiro. Rodar contra o
arquivo inteiro (1700+ linhas, com dezenas de usos legítimos de
"diagnóstico"/"anonimato"/"benchmark" como nome de feature real — ex.
`/benchmark`, o Benchmark Setorial anônimo) gerou ~40 falsos positivos numa
varredura de teste — confirma exatamente o diagnóstico do founder de que
regex sozinho não basta, mas também mostra que aplicar isso ao site inteiro
é trabalho de uma onda maior (varredura site-wide), não desta fatia MVP.

### Achado fechado (era 1 achado aceito; corrigido no fechamento H2.1B)

A entrega original desta fatia relatava 1 achado aceito: "anonimato" no
prefixo livre de `NR1_LANDING.hero.sub`. O founder rejeitou aceitar isso por
exceção — "o scanner deve falhar para qualquer uso público livre de
'anonimato' que não esteja ligado a um claim_id autorizado". Fechado
trocando o texto (Opção B do pedido) por "acesso por token e publicação
agregada com limiar mínimo de grupo" — mesma exatidão técnica, sem o termo
que disparava o achado. `"anonimato"` **nunca** foi adicionado a
`SAFE_EXCEPTIONS` — a trava é textual (`commercial-claims-scanner.test.ts`,
"'anonimato' nunca é uma exceção estrutural do scanner"), não uma
allowlist. O gate das 7 superfícies registradas agora afirma **zero**
achados órfãos.

## 11. Riscos residuais (após o fechamento §13)

1. **`CLAIM-COM-REGULATORY-SCOPE-001` sem consumidor** — registrado, mas o
   §10 do super prompt original não listou "escopo regulatório" entre as
   superfícies a migrar nesta fatia. Fica disponível para quando um
   consumidor real aparecer.
2. **Varredura site-wide completa** (todas as rotas de marketing, PDFs,
   e-mails) segue como trabalho futuro maior — o MVP prova o mecanismo em 7
   superfícies reais, não substitui uma auditoria completa. O scanner
   continua gerando ~40 falsos positivos se rodado contra `landing-copy.ts`
   inteiro (usos legítimos de "diagnóstico"/"anonimato"/"benchmark" como
   nome de feature real, ex. `/benchmark`) — precisa de uma allowlist de
   features antes de ampliar o escopo do gate.
3. **`copilota-*.mjs`** contém um comentário de código pré-existente e não
   relacionado com a substring "garantido por construção" (sobre o capsule
   engine) — confirmado inofensivo (comentário, não claim), fora do escopo
   desta onda.

## 12. Decisões adiadas

- Ampliar o scanner para varredura site-wide com uma allowlist de features
  reais (`/benchmark`, etc.) que hoje geram falso positivo.
- Trazer `CLAIM-COM-REGULATORY-SCOPE-001` para um consumidor real quando
  a superfície aparecer.

## 13. Fechamento (mesma data, aprovação controlada "FECHAMENTO DA H2.1B")

Quatro ajustes pedidos após a entrega original, antes de autorizar push:

1. **"sem dor" removido de toda superfície pública NR-1** — `NR1_LANDING.meta.title`
   e `.meta.description` trocados pelo texto aprovado ("Gestão Psicossocial
   NR-1: da escuta à prevenção em ação" / "Estruture a gestão psicossocial
   NR-1, da escuta agregada ao plano de prevenção e acompanhamento.").
   Fecha o residual #3 da entrega H2.1A original. Regressão adicionada em
   `landing-copy.h2-1a-containment.test.ts` para "sem dor", "conformidade
   sem dor" e "compliance sem dor".
2. **Uso livre de "anonimato" eliminado** (não aceito por exceção) — ver §10.
3. **Fronteira dos artefatos e projeção pública mínima** — busca separada em
   executáveis (`.js`/`.mjs`) vs. `.map` confirmou que `limitations`/
   `source_refs`/`owner_role`/datas do registry completo vazavam para o
   bundle do cliente (porque `landing-copy.ts` importava o resolver
   completo, que importa o registry inteiro). Corrigido criando a **camada
   pública** (§5): `commercial-claims-public-bindings.ts` (fonte única dos
   bindings) → `scripts/generate-commercial-claims-public-projection.ts`
   (roda o resolver completo em build-time, grava só
   `{claimId,variant,surfaceId,text}`) → `commercial-claims-public-resolver.ts`
   (o único que `landing-copy.ts` importa agora). Rebuild confirmou: zero
   ocorrências de `owner_role`/`review_due_at`/`source_refs` em qualquer
   artefato (o único hit residual era `p_owner_role_label`, um parâmetro de
   RPC de Action Plan sem relação nenhuma).
4. **Expiração é gate-time, nunca runtime** — `commercial-claims-public-resolver.ts`
   não contém `new Date()` no código executável (testado por leitura
   estática do próprio source, filtrando comentários) e devolve resultado
   idêntico com o relógio do sistema mockado para datas diferentes. A
   expiração real continua sendo verificada em
   `commercial-claims-registry.test.ts` (roda em `bun test`, ambiente
   Node/Bun) e na geração da projeção (mesmo ambiente) — nunca no código que
   chega ao navegador.
