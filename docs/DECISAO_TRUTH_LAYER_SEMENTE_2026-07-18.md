# DECISÃO — Truth Layer, semente (Onda 5 do Plano de Elevação 180%)

**Data:** 2026-07-18 · **Nível:** 3 Fundacional (Fable 5) · **Branch:** `feat/truth-layer-onda5`

## Problema

A doutrina "nenhuma superfície exibe mais certeza do que o registro canônico
autoriza" está estrutural para a CIÊNCIA (`buildPassport`), mas para
CAPACIDADES DE PRODUTO o status REAL/PARCIAL/DEMO ainda era digitado à mão
nas superfícies (ex.: `productStatus = "DEMO"` hardcoded no entry point da
FlorêncIA). Paridade de produção exige que a classificação seja derivada,
nunca declarada.

## Tree of Thoughts (≥5 ramos, matriz Valor·Risco·Custo·Tese·Reuso)

- **A — Mínimo viável** (testes fixando os strings digitados): não cria fonte única. Rejeitado.
- **B — Robusto** (novo `truth-registry.json` + engine + migrar todas as rotas): criaria um
  SEGUNDO registro de maturidade ao lado do `learning-dynamics-registry` (que já governa
  runtime/conteúdo/persistência/IA/exposição/risco por capacidade, com a mesma doutrina
  escrita) — duplicação de cânone + churn multi-rota. Rejeitado nesta fatia.
- **C — Simular**: não cria o primitivo de governança. Rejeitado.
- **D — Adiar**: o repo já nomeia a Truth Layer como dependência do LD-001 e a sequência foi
  autorizada pelo founder. Rejeitado.
- **E — Comprar/integrar**: n/a.
- **F — Compor no engine existente** ✅: `deriveProductStatus()` puro em
  `learning-dynamics-resolution.ts` (elo mais fraco runtime × conteúdo, allowlist, piso DEMO
  falha-fechado) + consumidor real (entry point da FlorêncIA deriva o default do LD-001).
  Maior score: composição sobre acúmulo, zero registro novo, reusável para as 14 dinâmicas
  e para qualquer pack.

## Decisão

Ramo F. Regra do elo mais fraco: só `REAL × VERIFIED/CURATED` se apresenta
REAL; conteúdo DEMO/DRAFT/ABSENT rebaixa tudo para DEMO; runtime de
roadmap/desconhecido nunca sobe do piso DEMO (dupla defesa com a resolução
de CTA, que já bloqueia roadmap antes).

## Risco e critério de aceite

Risco: baixo — aditivo, sem mudança visual (LD-001 deriva DEMO, o mesmo
valor antes digitado). Aceite: testes de fronteira do derive + teste
canônico anti-overclaim no registro (nenhuma dinâmica deriva acima do
próprio runtime) + badge da FlorêncIA continua "Demo" no browser, agora
derivado. Gate verde com exit code verificado.

## Próximos cortes da Onda 5 (não iniciados)

1. Migrar os `status="DEMO"` digitados das demais superfícies de `/voz-segura`
   para derivação (LD-003 flashcards, LD-014 mapa mental etc.).
2. Skill status do Policy Gate (`skillStatus`) alimentado de fonte canônica.
3. Gatilho do §5 do SAFE-VOICE-BRIDGE (registry operacional da ponte) quando
   houver superfície que LEIA a ponte.
