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

## Próximos cortes da Onda 5

1. ✅ Migrar os `status="DEMO"` digitados das demais superfícies de
   `/voz-segura` para derivação (LD-003 flashcards, LD-011 mapa mental).
2. ✅ Skill status do Policy Gate (`skillStatus`) alimentado de fonte
   canônica — corte 2 (2026-07-18), decisão de governança abaixo.
3. Gatilho do §5 do SAFE-VOICE-BRIDGE (registry operacional da ponte) quando
   houver superfície que LEIA a ponte. **BLOQUEADO** por duas tasks
   pré-requisito (ver seção "Bloqueadores antes do §5" abaixo).

---

## Corte 2 — Skill status do Policy Gate (2026-07-18)

### Problema

`PolicyGateOptions.skillStatus` existia desde a Onda 3.5, mas era opcional
— e, na produção, o entry point da FlorêncIA nunca o preenchia. Resultado:
`evaluatePolicyGate` sem `skillStatus` deixava passar TODAS as
`candidateSkillIds` sem checagem nenhuma (autorização implícita por
omissão). A fonte canônica do status real (`docs/ai/florencia-skills/
registries/skill-registry.json`) é documentação de governança versionada,
não código de runtime (CLAUDE.md §FlorêncIA) — não pode ser importada pelo
bundle.

### Tree of Thoughts — alternativas

- **A — Promover o skill-registry.json inteiro para `src/domain/`**: resolveria
  a lacuna de fonte, mas muda o CARÁTER do artefato (deixa de ser
  documentação de governança humana e vira runtime) — decisão que pertence
  ao founder, não a uma implementação de corte. Traz também 12 campos por
  Skill (`path`, `category`, `supported_segments`, `allowed_modes`...) para
  dentro do bundle sem nenhum consumidor real deles hoje. **Rejeitado**: o
  Policy Gate só precisa de `skill_id`+`status` — promover o documento
  inteiro é mais acoplamento do que o problema exige, e decide algo que não
  foi pedido (recategorizar o repositório de skills).
- **B — Espelho runtime mínimo e curado + teste de paridade** ✅: projeção
  com só `skill_id`+`status`+metadado de auditoria em
  `src/domain/florencia/contracts/skill-status-projection.json`, gerada
  mecanicamente (`scripts/sync-skill-status-projection.ts`, mesmo padrão
  de `sync-florencia-contracts.ts`), verificada por paridade INTEGRAL contra
  o canônico ao vivo em teste (quebra o gate se divergir). **Adotado por
  decisão explícita do founder** (2026-07-18).
- **C — Adiar até existir Skill que realmente mude de status**: hoje as 15
  Skills do registry são todas REAL/PARCIAL (zero ROADMAP) — o filtro não
  teria efeito observável ainda. Defensável, mas deixaria a lacuna de
  "omissão = autorização implícita" aberta indefinidamente, e o Policy Gate
  é exatamente o lugar que a doutrina do projeto marca como "nunca confia
  em dado de fora sem checagem" (mesmo comentário já presente no topo do
  arquivo, sobre `allowedClaimIds`). **Rejeitado**: o risco (fail-open
  silencioso) já existe hoje, independente de haver Skill ROADMAP ativa
  agora — corrigir a lacuna estrutural não deveria esperar o primeiro
  incidente.

### Decisão

**B.** `docs/ai/florencia-skills/registries/skill-registry.json` continua
sendo a ÚNICA fonte de governança humana (quem decide o status de uma
Skill). A projeção em `src/domain/florencia/` é runtime, nunca o inverso.

### Risco de duplicação controlada

Duplicar `skill_id`+`status` entre o doc e a projeção É uma duplicação real
— mas **controlada**, no sentido formal: (1) escopo mínimo (2 campos, não
12); (2) gerada por script, nunca editada à mão (elimina erro de
transcrição); (3) verificada por teste de paridade que roda em todo `bun
test src` — divergência de qualquer natureza quebra o gate antes de chegar
a produção. É o mesmo padrão já em produção neste repo para
`context-envelope.schema.json` (`florencia-contract-parity.test.ts`) e para
o Claim Registry × Evidence Registry legacy fields — não é um mecanismo
novo, é reaplicação de um já validado.

### Mecanismo de paridade

`computeSkillStatusParity()` (engine puro, `src/engine/florencia/
skill-status.ts`) compara duas listas de entradas + duas versões e reporta,
cada um isoladamente: skill ausente da projeção, skill órfã na projeção,
status divergente, id duplicado (dos dois lados), status fora do enum
conhecido, versão da fonte incompatível. `skill-status-projection-parity.
test.ts` chama essa função com os dados REAIS (canônico lido via
`readFileSync` de `docs/`, só em teste — nunca no bundle) e falha o gate
com a lista de erros e a instrução de regenerar. Separado disso, uma
auto-checagem estrutural (`validateSkillStatusEntries`) roda também em
RUNTIME dentro de `resolveSkillStatusMap()` — duplicata ou status
desconhecido nunca entram no mapa devolvido, mesmo que a paridade de build
tenha sido pulada por algum motivo (defesa em profundidade, não confia só
no teste).

### Critério de aceite

1. `PolicyGateOptions.skillStatus` deixou de ser opcional — TypeScript
   recusa compilar qualquer chamada que o omita (fail-closed por
   construção, não por convenção).
2. `allowedSkillIds` é sempre um allowlist explícito de REAL/PARCIAL — nunca
   um blocklist de ROADMAP (a differença importa: id desconhecido do mapa
   cai fora por padrão, não dentro).
3. Teste de paridade real passa (projeção ao vivo × canônico ao vivo, zero
   erros) e os 6 modos de falha são cada um demonstrado com dados sintéticos
   (não é só "o feliz caminho passa").
4. Comportamento observável preservado: `bun test src` completo (2367
   testes) e verificação manual no browser de `/voz-segura` — as 4 CTAs da
   FlorêncIA renderizam e abrem drawer idêntico ao anterior (as 15 Skills
   reais são todas REAL/PARCIAL, então nada muda hoje; o que muda é que
   agora é IMPOSSÍVEL esquecer o filtro, não que o filtro produza resultado
   diferente).
5. `bun run gate` (test + parity + tsc) e `bun run build` verdes, exit code
   0 cada, capturados sem pipe.

### Limitações remanescentes da Truth Layer (honestas, não escondidas)

- A projeção é sincronizada por **execução manual do script** — não há hook
  de CI que rode `sync-skill-status-projection.ts` automaticamente a cada
  mudança no doc canônico. Se alguém editar o skill-registry.json e
  esquecer de rodar o script, o teste de paridade PEGA isso no próximo `bun
  test`/`bun run gate` — mas não impede o commit do doc sozinho, só barra
  quando o código for testado/buildado junto.
- `SkillStatusEntry.status` no engine é tipado como `string` (não
  `SkillLifecycleStatus`) deliberadamente — representa dado potencialmente
  corrompido ANTES da validação. Isso é intencional (fail-closed exige
  aceitar entrada não confiável para poder rejeitá-la), mas significa que o
  TypeScript sozinho não impede um JSON com `"status": "BETA"` — só a
  validação em runtime (`isKnownSkillStatus`) e o teste de paridade pegam
  isso.
- `candidateSkillIds` continua vindo do `cta-registry.json` sem checagem de
  que toda skill referenced ali exista na projeção — adicionei um teste
  (`skill-status-projection-parity.test.ts`) que cobre isso especificamente,
  mas não é um invariante reforçado em runtime (uma CTA nova que referencie
  uma Skill inexistente na projeção simplesmente teria essa Skill sempre
  indisponível — comportamento seguro, mas silencioso até o teste rodar).
- O corte NÃO resolve a paridade completa do NascentesBridgeEntry (§5 do
  SAFE-VOICE-BRIDGE) — está explicitamente fora de escopo deste corte e
  bloqueado por duas tasks à parte (ver abaixo).

## Bloqueadores antes do §5 do SAFE-VOICE-BRIDGE (registry operacional da ponte)

Registrados em 2026-07-18, por instrução explícita do founder — nenhum dos
dois foi implementado neste corte; ambos precisam de decisão/implementação
próprias antes de avançar para o registry operacional da ponte:

1. **Semântica do ActionLog** — hoje o evento `evidence_recorded` mistura
   duas coisas sob o mesmo `kind`: "a orientação da FlorêncIA foi consultada
   (o drawer abriu)" e "há evidência de fato registrada" (ex.: rodada
   registrada). Antes de qualquer consumidor novo (a ponte NASCENTES
   incluída) depender do ActionLog para saber "isso foi consultado" vs
   "isso foi registrado como prova", a semântica precisa ser separada —
   provavelmente um `kind` novo (`orientation_consulted` ou similar)
   distinto de `evidence_recorded`, preservando compatibilidade com os
   eventos já existentes.
2. **Contexto completo na seleção de claims** — `findClaimForStudy()`
   (passport-engine) resolve por `study × intended_use` apenas; não exige
   `role`/`segment`/`target_context` na seleção do claim em si (essas
   dimensões só são checadas DEPOIS, dentro de `trustGate`, quando um
   `RequestContext` é passado). Para a ponte NASCENTES eventualmente
   precisar "qual claim vale para ESTA combinação exata de papel/segmento/
   uso/contexto", a função de seleção precisa aceitar esse contexto
   completo na entrada, não só validar depois.

Ver TASK.md para o registro formal dessas duas tasks bloqueadoras.
