# PLANO MESTRE DE EVOLUÇÃO VITALOS™ 2026–2027

> **Status:** APROVADO PARA EXECUÇÃO POR FATIAS · **Data:** 2 de julho de 2026
> **Método:** Fable 5 — auditoria read-only do repo vivo + confronto com AUDITORIA_MASTER_PLUS_V2 e Maturidade SaaS (ambos sobre o snapshot `vitalos-julho.zip`) + Tree of Thoughts nas decisões estruturais.
> **Regra deste documento:** toda afirmação carrega etiqueta de evidência. Um teste que passa prova consistência do comportamento testado — não prova, por si só, a promessa de negócio.
>
> **Convenção de IDs (compartilhada com a Skill-Mestra):** evidências `EV-nn` · riscos `P0-01…P0-08`, `P1-nn`, `P2-nn`, `P3-nn` · sprints `S0…S8` · decisões `ToT-A…ToT-F` · skills `SK-01…SK-10`. Definição normativa vive em UM documento; o outro só referencia o ID. Skills: normativo em `docs/SKILL_MESTRA_VITALOS_EDUCACAO_TRANSFORMACAO.md`.

**Etiquetas de evidência:** `Confirmado no código` · `Confirmado por teste executado` · `Confirmado no banco ou migration` · `Confirmado apenas na documentação` · `Mockado` · `Planejado` · `Não confirmado` · `Contradito pelo código`

---

## A. Veredicto fundador

| Campo | Veredicto |
|---|---|
| **Estágio atual** | **Produto em validação avançada / MVP estruturado.** Não é ainda SaaS emergente pronto para dados reais sensíveis: a camada Cloud tem lacunas confirmadas de autorização, atomicidade e paridade de schema (P0-01…P0-08, todas `Confirmado no código` nesta auditoria, no repo vivo de 2026-07-02). |
| **Tese refinada** | **"Clima se mede. Vitalidade se opera."** — VitalOS é o sistema operacional que transforma escuta protegida (COPSOQ/PERMA/VIA-T/FIB-T) em prioridade interpretável, aprendizagem contextual (Academia por driver), ação com responsável (plano de 13 semanas) e evidência longitudinal auditável. A tese sobrevive à auditoria; a implementação Cloud ainda não a prova. |
| **Maior força** | Arquitetura de engines puros (68 engines, 1408 testes verdes `Confirmado por teste executado`), disciplina ética rara (k-anon, Domínio A≠B, gamificação anti-tóxica, IA determinística honesta) e a stack NR-1 completa (crosswalk 12 drivers × COPSOQ II × FIB-T, pgr-engine, documento estatutário). |
| **Maior fragilidade** | O **data plane Cloud**: nenhuma função privilegiada verifica quem é o ator (P0-04/P0-05), o schema versionado diverge da produção (P0-02), operações críticas não são atômicas (P0-05/P0-06) e a coleta setorial descarta dados silenciosamente (P0-01). A promessa de confiança ainda é front-end. |
| **P0 mais urgente** | **P0-04 + P0-03 (autorização):** qualquer usuário autenticado pode, em tese, agir sobre organização alheia (orgId do payload) ou autoelevar o próprio papel (policy `profile_own`). Sem isso resolvido, nenhum piloto com dados reais é defensável perante um DPO. |
| **Maior oportunidade** | A **NR-1 está vigente desde 26-mai-2026** (Portaria MTE 765/2025 — `Confirmado apenas na documentação`, Guia MTE 2026). Empresas precisam AGORA de gestão contínua de riscos psicossociais com Inventário + Plano de Ação. O VitalOS já tem os motores; falta a cadeia de confiança para operá-los com dados reais. |
| **ICP prioritário** | **Empresa / NR-1 / COPSOQ** (decisão ToT-D). Os outros 4 packs permanecem como prova de opcionalidade arquitetural — vitrine, não linha comercial. |
| **Frase de posicionamento** | *"A plataforma que transforma escuta protegida sobre riscos psicossociais e vitalidade organizacional em prioridades, aprendizagem, plano de ação e evidências — sem prometer laudo automático nem blindagem jurídica."* |

**Decisão de go-live (inalterada da auditoria externa, confirmada aqui):** demo comercial com dados sintéticos = GO (rotulada como demo) · piloto com dados reais de pesquisa = **NO-GO até fim do S3** · venda Enterprise/NR-1 com coleta real = NO-GO até S4 + pacote de evidências.

---

## B. Registro de evidências

Comandos executados nesta auditoria (2026-07-02, ambiente Windows local do founder):

```
bun test src        → 1408 pass / 0 fail (142 arquivos, 4880 expect)
bunx tsc --noEmit   → exit 0 (limpo)
bun run build       → verde (Vite 8 + Nitro, artefatos .output/)
bun run lint        → 78.962 problemas; 78.940 são CRLF do prettier ("Delete ␍");
                      apenas 22 semânticos, todos @typescript-eslint/no-explicit-any
                      na camada .server.ts (ponte para resultados não tipados do Supabase)
git ls-files .env   → .env RASTREADO no git
git log -10         → commits recentes: onboarding setorial, fix org real no /admin
```

| ID | Afirmação | Fonte | Status | Evidência | Impacto |
|----|-----------|-------|--------|-----------|---------|
| EV-01 | Link setorial descarta respostas mesmo em Cloud | Auditoria V2 P0-01 | **Confirmado no código** | `src/lib/survey/sector-link.server.ts:108` retorna `ephemeral_demo` incondicionalmente; nenhum caminho de persistência existe | Perda silenciosa de dados de campanha — pior classe de falha |
| EV-02 | Drift código ↔ migrations versionadas | Auditoria V2 P0-02 | **Confirmado no código** | RPCs `is_invite_valid_for_wave`/`mark_invite_used` chamadas em `db-adapter.ts:73,87`, nunca definidas em `supabase/migrations/`; colunas `cnpj/team_size_band/phone/address/segment` (organizations), `plan` (org_invites), `emailed_at` (wave_invites) usadas no código, ausentes das migrations — aplicadas só via chat do Lovable | Ambiente não reproduzível; produção e repo divergem estruturalmente |
| EV-03 | `profiles` permite autoelevação de role/org_id | Auditoria V2 P0-03 | **Confirmado no banco ou migration** | migration 20260630161949: `CREATE POLICY "profile_own" ... FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid())` — sem restrição de coluna | Usuário autenticado pode trocar o próprio papel/tenant via UPDATE direto |
| EV-04 | Funções admin confiam em orgId do cliente | Auditoria V2 P0-04 | **Confirmado no código** | `wave-admin.functions.ts:39-49`: valida só formato UUID; `createWaveAsAdmin` usa service role sem resolver sessão/membership | Risco de ação cross-tenant conhecendo um UUID |
| EV-05 | Onboarding confia em userId do payload e não é transacional | Maturidade P0 + Auditoria V2 P0-05 | **Confirmado no código** | `onboarding.functions.ts:5` (`userId: z.string().uuid()` do cliente); `createOrgAndAdmin` = 5 passos sem transação/idempotência | Org órfã, convite reutilizável em corrida, associação indevida |
| EV-06 | Submissão de resposta não atômica e sem vínculo token↔onda | Auditoria V2 P0-06 | **Confirmado no código** | `saveWaveResponse` (db-adapter.ts:72-91) = 3 chamadas separadas; policy `response_submit` não verifica `wave_invites.wave_id = wave_responses.wave_id` | Duplicidade por corrida; token de uma onda usável em outra |
| EV-07 | Validação psicométrica pulada no caminho Cloud | Auditoria V2 P0-07 | **Confirmado no código** | `response-capture.server.ts:34-60`: Cloud persiste sem `validateBlindSubmission`; só o demo valida | Dados inválidos/fora de escala entram na agregação |
| EV-08 | k-anonymity sela a onda cedo | Auditoria V2 P0-08 | **Confirmado no código** | `capsule-aggregator.server.ts`: `collecting → sealed` direto ao detectar n≥5; sem estado `closed` | Campanha de 500 pessoas encerraria na 5ª resposta |
| EV-09 | `.env` exposto no repositório | Auditoria V2 P1-01 | **Confirmado no código** | `.gitignore` não cobre `.env*`; `git ls-files .env` retorna `.env`; contém URL + publishable key (anon) + PLATFORM_ADMIN_EMAILS. Service role key NÃO está no repo | Prática insegura; severidade moderada (sem service role), correção obrigatória |
| EV-10 | Engine importa Domínio em runtime | Auditoria V2 §4.1 | **Confirmado no código** | `src/engine/pack/PackProvider.tsx:12-13` importa `@/domain/packs/registry` e schema | Violação da regra inviolável nº 1 do CLAUDE.md; mover para camada app/composition |
| EV-11 | "IA" é determinística, sem LLM real | Auditoria V2 §4.4 | **Confirmado no código** | zero chamadas a APIs LLM em src/; `lib/ai/copilot.functions.ts` declara handler determinístico com promptEnvelope pronto | Virtude de honestidade SE a linguagem comercial refletir isso |
| EV-12 | CI ausente; qualidade não reproduzível automaticamente | Auditoria V2 P1-02 | **Confirmado no código** | `.github/` não existe; nenhum config de CI no repo | Gates de qualidade dependem de disciplina manual |
| EV-13 | Zero analytics/telemetria/audit log implementados | Auditoria V2 P1-06 | **Confirmado no código** | zero hits de tracking/telemetry/audit_log em src/ (guardrails de IA mencionam trilha, sem implementação) | Falha silenciosa não seria descoberta; pré-requisito de piloto |
| EV-14 | Landing não captura leads | Maturidade §3 | **Confirmado no código** | `LandingModal.tsx` (ExecutiveModal): form descarta dados com microcopy explícita "nenhum dado é enviado ou armazenado" | Honesto como demo; nulo como aquisição (nota 15/100 em §C) |
| EV-15 | Pós-onboarding leva sempre a /rh | Maturidade §9 | **Confirmado no código** | `ativar.$token.tsx:163`: `navigate({ to: "/rh" })` hardcoded | Errado para Escola/Governo/Saúde/Condomínio; corrigir por pack+papel |
| EV-16 | Suite de testes, typecheck e build verdes | Auditoria V2 E1 | **Confirmado por teste executado** | comandos acima, nesta máquina, neste commit (7da2708) | Base de engines confiável; nada disso testa RLS/concorrência reais |
| EV-17 | Limites de plano aplicados server-side na criação de ondas | Maturidade §3 ("sem enforcement") | **Contradito pelo código** | `wave-admin.server.ts:32-56` chama `checkInstrumentAllowed/checkInviteQuota/checkWaveQuota` ANTES de qualquer escrita | Enforcement existe neste fluxo — mas contra um orgId não autenticado (EV-04) |
| EV-18 | Onboarding com escolha de setor + cadastro completo + plano no convite | Maturidade §3 | **Confirmado no código** | `/ativar/:token` (PACK_CHOICES, CNPJ, faixa de equipe, telefone), `org_invites.plan` decidido pelo admin da plataforma | Construído em 2026-07-02; presente em produção via Lovable, AGRAVA EV-02 (não versionado em migrations) |
| EV-19 | Stack NR-1 completa como engines | Inventário | **Confirmado no código** (dados **Mockado**) | crosswalk-engine, pgr-engine, pgr-document-engine, reavaliacao-engine, survey-to-exposure-pipeline, exposure-derivation-engine; rotas /drivers, /matriz, /sst, /plano-acao | Diferencial real; opera sobre mocks até S3-S4 |
| EV-20 | Stack de aprendizagem pronta sem persistência | Inventário | **Confirmado no código** (progresso **Mockado**) | academia-engine, sm2-engine (+ testes), flashcard-session, driver-pillar-bridge, learning-dynamics; `docs/instrumentos/WWP.md` já mapeia as 9 dinâmicas → rotas | Eixo Educar destravável com baixo custo (S5) |
| EV-21 | Billing/contratos/CRM/health score ausentes | Maturidade §2 | **Confirmado no código** | nenhuma entidade de contrato/assinatura/webhook/lead em src/ ou migrations | Consistente com decisão: confiança antes de checkout (S7+) |
| EV-22 | Benchmark multi-tenant, ESG, Selo, P&L | Inventário | **Mockado** | engines testados; dados de demonstração | Não vender como prova real até dados reais existirem |
| EV-23 | NR-1 vigente desde 26-mai-2026; GRO exige processo contínuo | Guia MTE 2026 | **Confirmado apenas na documentação** | Guia §1, §8–13, §17: Inventário de Riscos + Plano de Ação obrigatórios; hierarquia evitar>eliminar>reduzir>controlar; plataforma não substitui profissional habilitado | Janela comercial aberta AGORA; âncora dos claims honestos |

---

## C. Scorecard de maturidade

`[obs]` = ancorado em código/teste lido nesta auditoria · `[est]` = inferência estratégica (incerteza ±10). Nota mede prontidão de produto/operação, não beleza de interface.

| # | Dimensão | Nota | Tag | Âncora |
|---|----------|-----:|-----|--------|
| 1 | Arquitetura de software | 78 | obs | camadas engine/domain/mocks/routes; exceção EV-10 |
| 2 | Qualidade de código / testes | 82 | obs | EV-16; zero testes RLS/concorrência reais |
| 3 | Segurança de acesso (RLS, multi-tenancy) | 35 | obs | EV-03, EV-04, EV-05 |
| 4 | Persistência / integridade de dados | 40 | obs | EV-02, EV-05, EV-06 |
| 5 | Privacidade / k-anonymity | 62 | obs | k=5 real nos engines; EV-07, EV-08 comprometem o ciclo |
| 6 | Mensuração (instrumentos, ciência) | 80 | obs | 4 camadas, crosswalk, docs/instrumentos; EV-19 |
| 7 | NR-1 / GRO / PGR | 68 | obs | pgr-engine + documento estatutário; dados mockados; auditoria de disclaimers pendente [est na copy] |
| 8 | Ciência e ética | 78 | obs | Domínio A≠B, exploratório declarado, desfechos isOutcome nunca viram driver |
| 9 | Aprendizagem / Academia | 58 | obs | EV-20: motores prontos, zero persistência |
| 10 | Gamificação ética | 76 | obs | tetos, orçamentos, cooldown, 9 princípios, k-anon no reconhecimento |
| 11 | IA e governança | 62 | obs | EV-11: determinística + qa-gates; honestidade é a nota, não a limitação |
| 12 | UX e acessibilidade | 63 | est | A11yProvider + WCAG como requisito; sem teste observado com leitor de tela |
| 13 | Transformar (planos, evidência) | 60 | obs | action-plan + evidence engines sem loop persistido |
| 14 | Conversão e marketing | 15 | obs | EV-14: zero captura de leads, zero analytics |
| 15 | Billing e entitlements | 45 | obs | EV-17 (enforcement existe) vs EV-21 (nada além) |
| 16 | Onboarding | 55 | obs | EV-18 construído; EV-05 e EV-15 abertos |
| 17 | Customer Success / observabilidade | 25 | obs | EV-13; nenhum health score, alerta ou trilha |
| 18 | Escalabilidade / prontidão para piloto pagante | 38 | est | bloqueada pelos P0s; destrava ao fim de S3 |

**Nota global: 57/100** — faixa "validação avançada" (convergente com o 61 da auditoria externa; a diferença reflete evidência direta dos P0s no repo vivo, parcialmente compensada por EV-17/EV-18). **Mensagem de gestão: reduzir superfície, aprofundar confiança — não ampliar produto.**

---

## D. Matriz de riscos P0 · P1 · P2 · P3

### P0 — bloqueiam qualquer piloto com dados reais

| Campo | P0-01 · Coleta setorial fantasma | P0-02 · Drift de schema | P0-03 · Autoelevação em profiles | P0-04 · orgId sem autoridade |
|---|---|---|---|---|
| Problema | Link setorial nunca persiste em Cloud | Migrations não descrevem a produção | Dono da linha pode mudar role/org_id | Server functions confiam no payload |
| Evidência | EV-01 | EV-02 | EV-03 | EV-04 |
| Impacto | Perda silenciosa de campanha inteira | Ambiente irreproduzível; quebras em runtime | Escalada de privilégio / troca de tenant | Leitura e escrita cross-tenant |
| Probabilidade | Certa (é o comportamento atual) | Certa | Média (exige cliente Supabase direto) | Média-alta |
| Prioridade | P0 | P0 | P0 | P0 |
| Plano | RPC `submit_sector_response` + modalidades explícitas de link (ToT-C) | Migration de reconciliação idempotente + parity-check estático (ToT-B) | Revogar UPDATE de role/org_id; memberships/role_grants como autoridade | Cadeia sessão→ator→membership→tenant→permissão→entitlement em TODA função privilegiada |
| Dependências | S1 (identidade), S3 (RPC de submissão) | nenhuma — é o S0 | S0 (migration versionada) | S1 |
| Critério de aceite | Em Cloud, submissão válida por link setorial persiste e conta; em demo, UI declara descarte | Banco limpo + migrations = tudo que o código usa; parity-check verde no `bun run gate` | UPDATE de role/org_id pelo cliente falha em banco real | Admin da org A é negado (com trilha) ao tentar agir sobre B, mesmo com UUID válido |
| Teste obrigatório | E2E sector-link Cloud + demo | `scripts/schema-parity-check.ts` como teste | teste adversarial de UPDATE via anon client | teste adversarial cross-tenant nas 6 funções admin |

| Campo | P0-05 · Onboarding forjável/não atômico | P0-06 · Submissão não atômica | P0-07 · Validação pulada no Cloud | P0-08 · k-anon encerra coleta |
|---|---|---|---|---|
| Problema | userId do cliente; 5 passos sem transação | validar/inserir/consumir em 3 chamadas; sem vínculo token↔onda | Cloud persiste sem validar instrumento/escala | `collecting → sealed` automático em n≥5 |
| Evidência | EV-05 | EV-06 | EV-07 | EV-08 |
| Impacto | Org órfã; convite reusado; identidade forjada | Duplicidade; resposta em onda errada | Agregação contaminada | Campanha planejada p/ 500 fecha na 5ª resposta |
| Probabilidade | Média (corrida) / alta (forja com token válido) | Média | Alta (qualquer payload malformado) | Certa |
| Prioridade | P0 | P0 | P0 | P0 |
| Plano | userId da SESSÃO server-side; RPC `provision_organization_from_invite` transacional e idempotente | RPC única `submit_wave_response` (lock condicional + vínculo wave + validação + insert + consumo + recibo) | `validateBlindSubmission` ANTES de `saveWaveResponse`; definição versionada do instrumento por onda | Máquina de estados `draft→collecting→threshold_reached→closed→aggregating→sealed→archived`; k controla PUBLICAÇÃO, fechamento é decisão autorizada |
| Dependências | S1 | S1, P0-02 (RPCs versionadas) | S3 | S4; P0-06 |
| Critério de aceite | 2 requisições simultâneas c/ mesmo token = exatamente 1 org, 1 profile, 1 convite consumido | 2 submits simultâneos c/ mesmo token = 1 resposta; wave divergente recusada | payload com item inexistente/escala inválida é rejeitado sem inserir | onda continua coletando após n≥5; só fechamento formal agrega |
| Teste obrigatório | teste de concorrência do provisionamento | teste de concorrência + adversarial cross-wave | teste de payload malformado no caminho Cloud | teste da máquina de estados + E2E de fechamento |

### P1 — corrigir antes do piloto, não bloqueiam desenvolvimento

| ID | Problema | Evidência | Plano | Critério de aceite |
|----|----------|-----------|-------|--------------------|
| P1-01 | `.env` rastreado; `.gitignore` sem `.env*` | EV-09 | remover do índice git, ignorar `.env*` (exceção `.env.example`), avaliar histórico; rotacionar publishable key por higiene | `git ls-files .env` vazio; `.env.example` documentado |
| P1-02 | Sem CI; qualidade manual | EV-12 | `bun run gate` (tests+parity+lint semântico) como ritual pré-commit em S0; GitHub Actions em S8 | gate verde obrigatório antes de commit; CI no S8 |
| P1-03 | Lint: 78.940 erros CRLF (prettier) mascarando os 22 reais | comandos §B | `bun run format` em commit dedicado + `.gitattributes` eol=lf; tratar os 22 `no-explicit-any` gradualmente ao tipar a camada server | lint com 0 erros de formatação; anys documentados ou tipados |
| P1-04 | Zero analytics/telemetria | EV-13 | eventos mínimos de coleta (response_submit_attempted/accepted/rejected, wave_created/closed, capsule_published, authorization_denied) em S3–S4; sem dado sensível em log | falha de persistência gera evento visível |
| P1-05 | Zero captura de leads | EV-14 | S7: tabela leads + consentimento + origem UTM; manter honestidade do modo demo | lead persiste com consentimento e origem |
| P1-06 | Redirect pós-onboarding hardcoded /rh | EV-15 | rota inicial derivada de pack+papel (Empresa→/rh, Escola→/escola, Governo→/governo, Saúde→/saude, Condomínio→/condominios) em S2 | cada pack aterrissa na home certa |
| P1-07 | Engine importa domain (PackProvider) | EV-10 | mover provider/wiring para `src/app/composition/` em S8; engine sem React/registry | `grep "@/domain" src/engine` só em testes |

### P2 — importantes, após o núcleo de confiança

| ID | Tema | Decisão |
|----|------|---------|
| P2-01 | `PLATFORM_ADMIN_EMAILS` como allowlist | migrar para RBAC de plataforma persistido (role_grants) quando memberships existirem (pós-S1); manter allowlist como break-glass |
| P2-02 | Billing real (gateway, webhooks, assinatura) | piloto Enterprise = contrato/fatura manual; gateway só quando autosserviço fizer sentido (pós-S7) |
| P2-03 | Observabilidade APM completa | eventos mínimos em S3–S4; APM antes do 2º piloto |
| P2-04 | LLM real no Copiloto | só após data plane segura (fim S4) + proxy server-side + logs + avaliação de alucinação; promptEnvelope já pronto (EV-11) |
| P2-05 | Expansão comercial de packs | congelada até o Pack Empresa provar uso e retenção (gate G3 da auditoria externa) |
| P2-06 | Coluna `organizations.plan` como fonte de verdade | aceitável no piloto; evoluir para contrato→entitlement→autorização quando houver billing (S7+) |

### P3 — não agora

| ID | Tema | Decisão |
|----|------|---------|
| P3-01 | Automação de métricas de documentação | gerar contagem de testes no gate; nunca editar à mão |
| P3-02 | Refinamento visual adicional | reservado ao Lovable, após jornada de confiança completa |
| P3-03 | Dinâmicas ultra (X1/X2/X3) e VideoLab | adiadas por custo de conteúdo/complexidade (ToT-E); catálogo já as descreve |

---

## E. Blueprint Mensurar → Educar → Transformar → Evoluir

> Diferenciação obrigatória, em toda superfície: **escuta organizacional ≠ diagnóstico clínico ≠ avaliação de desempenho ≠ laudo automático.** Instrumentos exploratórios (VIA-T, FIB-T, IVO) declaram-se exploratórios. COPSOQ orienta o GRO; não substitui profissional habilitado (EV-23).

### E1 · MENSURAR

| Aspecto | Conteúdo |
|---|---|
| Estado atual | Engines maduros (IVO, pulse, COPSOQ agregado, VIA-T, FIB-T, benchmark k-anon) `Confirmado no código`; coleta Cloud parcial: convite nomeado persiste com falhas P0-06/P0-07; setorial não persiste (P0-01); ciclo de onda quebrado (P0-08) |
| Lacunas | atomicidade, vínculo token↔onda, validação server-side, máquina de estados, deduplicação declarada por modalidade, consentimento persistido, telemetria de coleta |
| Capacidades propostas | RPC única de submissão; 3 modalidades explícitas de credencial (ToT-C): convite individual cego (Domínio B/NR-1) · código temporário por pessoa (escala sem e-mail) · link setorial aberto (só pulse leve, sem promessa de dedupe); definição versionada de instrumento por onda; leitura parcial protegida quando n≥k e política permitir |
| Personas | RH_ADMIN/SST (opera), colaborador (responde), DPO (audita) |
| Dados necessários | waves + estados, wave_invites (+vínculo), wave_responses (write-only), instrument_versions, consent_events, eventos de coleta |
| Riscos | prometer anonimato absoluto + dedupe perfeito + zero autenticação simultaneamente — tecnicamente desonesto; comunicar limites por modalidade |
| CTAs | "Criar onda" (ação, RH) · "Responder com link seguro" (ação, colaborador) · "Ver participação protegida" (compreensão, RH) |
| Métricas | taxa de submissão aceita, rejeições por motivo, tempo até n≥k, cobertura por unidade |
| Fatia vertical | **S3 + S4** |

### E2 · EDUCAR

| Aspecto | Conteúdo |
|---|---|
| Estado atual | academia-engine (prioridade coletiva IVO × afinidade VIA-T opcional), sm2-engine testado, flashcard-session, learning-dynamics com as 9 dinâmicas mapeadas (`docs/instrumentos/WWP.md`) — tudo `Confirmado no código`, progresso **Mockado** |
| Lacunas | persistência de progresso, conteúdo real por driver (curadoria WWP), quiz engine genérico, letramento NR-1 estruturado, trilhas de implementação para o cliente |
| Capacidades propostas | ver plano educacional completo em §F |
| Personas | colaborador (aprende), líder (pratica), RH/SST (letramento NR-1), sponsor (formação de governança) |
| Dados necessários | learning_progress, sm2_card_state, quiz_attempts, IFT/XP ledger (participation-ledger existente) |
| Riscos | sobrecarga do colaborador (respeitar tetos de gamificação); conteúdo virar biblioteca morta (toda trilha nasce ligada a um driver priorizado pela MEDIÇÃO da própria org) |
| CTAs | "Estudar o driver prioritário da sua organização" (aprendizagem) · "Revisar cartões de hoje" (aprendizagem) · "Concluir trilha de letramento antes de abrir a onda" (governança) |
| Métricas | conclusão de trilha, retenção SM-2 (fresh/young/mature), transferência declarada (Action Log), % gestores com letramento antes da 1ª onda |
| Fatia vertical | **S5** |

### E3 · TRANSFORMAR

| Aspecto | Conteúdo |
|---|---|
| Estado atual | action-plan-engine (plano trimestral 13 semanas, orçamento de esforço), evidence-engine + intervention-evidence-engine (diff-in-diff honesto), devolutiva-engine, pgr-engine com intervenções por driver — `Confirmado no código`, loop **Mockado** |
| Lacunas | persistir plano/ações/evidências; ligar devolutiva a capsules reais seladas; Action Log; rituais de devolutiva guiados; responsável+prazo+métrica por ação (exigência do Guia MTE §13) |
| Capacidades propostas | fluxo completo prioridade→hipótese→intervenção (catálogo WWP por driver)→responsável→prazo→métrica→evidência→reavaliação (reavaliacao-engine já existe); PDF do plano no idioma do pgr-document-engine |
| Personas | RH/SST (conduz), líder (executa), C-Level (acompanha), trabalhadores (participam — Guia MTE exige participação e comunicação) |
| Dados necessários | action_plans, action_items, evidence_records, devolutiva_sessions |
| Riscos | **nunca transformar risco organizacional em problema individual de resiliência** — intervenções priorizam condições/organização/carga/autonomia/apoio/justiça/participação, não "aulas de mindfulness como resposta a sobrecarga" |
| CTAs | "Gerar plano de 13 semanas" (ação) · "Registrar evidência" (evidência) · "Preparar devolutiva coletiva" (ação) |
| Métricas | ações com responsável e prazo, % concluídas no ciclo, evidências registradas, delta de exposição na reavaliação |
| Fatia vertical | **S6** |

### E4 · EVOLUIR

| Aspecto | Conteúdo |
|---|---|
| Estado atual | trend/evolucao, forecast, panorama, certification (Selo computado), esg-report, benchmark k-anon entre tenants — engines testados, dados **Mockado** (EV-22) |
| Lacunas | health score de conta, maturidade organizacional, adoção por persona, relatório executivo sobre dados reais, base de renovação/expansão |
| Capacidades propostas | Customer Health Score (participação segura + aprendizagem concluída + intervenções implementadas + evidências); relatório executivo anual compondo capsules reais; benchmark só quando ≥2 tenants reais (nunca antes — claim proibido) |
| Personas | sponsor/C-Level (renova), platform admin (opera carteira), CFO (lê P&L) |
| Dados necessários | adoption_events, customer_health_snapshots, renewal_opportunities |
| Riscos | correlação vendida como causalidade — toda inferência classificada: Observação · Estimativa · Hipótese · Evidência preliminar · Evidência robusta · Necessita validação (o evidence-engine já pratica isso) |
| CTAs | "Ver evolução ciclo a ciclo" (compreensão) · "Preparar relatório de renovação" (comercial/governança) |
| Métricas | North Star: **organizações que atingem 1ª leitura protegida + 1 ação priorizada com responsável + 1 trilha concluída dentro do ciclo**; retenção, NRR (futuro) |
| Fatia vertical | **S8** (+ contínuo) |

---

## F. Plano educacional premium

**Princípio:** não é biblioteca de conteúdo; é o ciclo compreensão → prática → feedback → aplicação → evidência → reavaliação, sempre ancorado no driver que a MEDIÇÃO da própria organização priorizou (crosswalk `rankDriversByExposure`).

### F1 · Decisão ToT-E — recorte do MVP educacional

- **Alternativas:** (A) 12 drivers × 9 dinâmicas de uma vez · (B) 3 drivers × 4 dinâmicas ancorados nos engines existentes · (C) só letramento NR-1 · (D) adiar Educar até pós-piloto · (E) comprar LMS externo
- **Critérios (pesos §4 do mandato):** valor (20) · segurança/ética (20) · tese (15) · viabilidade 90d (15) · reutilização (10) · crescimento (10) · complexidade (5) · moat (5)
- **Pontuação:** A=5,4 (inviável em 90d, conteúdo raso) · **B=8,9** · C=6,8 (necessário mas insuficiente — vira parte de B) · D=3,1 (quebra a tese no meio) · E=5,0 (LMS genérico não conecta prioridade coletiva→trilha; perde o moat)
- **Escolha:** **B**, com letramento NR-1 (C) incluído como trilha obrigatória de governança.
- **Trade-offs:** 9 drivers ficam como stubs de catálogo ("em breve") — a Academia parece completa sem prometer conteúdo raso.
- **Riscos:** curadoria de conteúdo dos 3 drivers é trabalho editorial real (founder + Playbook CC BY-NC-ND, citando com atribuição, sem reproduzir).
- **Critério de aceite:** colaborador de org real vê trilha do driver top-ranqueado pela exposição REAL da sua org, conclui quiz+cartões, progresso persiste entre sessões.

### F2 · Recorte

**3 drivers MVP** (ids canônicos de `src/mocks/nr1-crosswalk-mock.ts`, macrocamadas Condições/Relações):

| Driver | Por quê | Dimensões COPSOQ ligadas |
|---|---|---|
| `carga` · Carga & Recuperação | risco psicossocial nº 1 do Guia MTE (§17: excesso de demandas) | demands_quant, work_pace |
| `justica` · Justiça & Reconhecimento | densidade de evidência alta no WWP (Appreciation/Compensation) | recognition |
| `apoio` · Apoio & Comunidade | amplificador de todos os demais (contextNote do próprio crosswalk) | social_support, community |

**4 dinâmicas MVP** (reuso direto, mapeamento já feito em `docs/instrumentos/WWP.md` §2):

| Dinâmica | Engine existente | O que falta |
|---|---|---|
| D1 Quiz de Verificação | learning-dynamics + gamification-engine (XP) | conteúdo (10–15 itens/driver) + persistência de tentativas |
| D2 Cartões SM-2 | sm2-engine + flashcard-session (completos, testados) | só persistência (`sm2_card_state`) + baralhos dos 3 drivers |
| D4 Explorador de Evidências (read-only) | intervention-evidence-engine | catálogo de evidências dos 3 drivers (citações WWP com link/DOI, política de verificação G2 do PatchPack) |
| D5 Plano de 90 Dias (ponte p/ Transformar) | action-plan-engine + idioma PDF do pgr-document-engine | template de plano por driver |

**Adiados (P3-03):** D3 VideoLab, D6 Pausa Reflexiva como dinâmica formal, X1 Simulador, X2 Co-design, X3 Arena Socrática, chatbots por driver (bloqueados na data plane segura — P2-04).

**Ordem de persistência:** `learning_progress` → `sm2_card_state` → `quiz_attempts` + ledger IFT/XP (participation-ledger existente) → artefatos de plano (último — PDF já exportável sem banco).

### F3 · Estrutura da Academia (visão completa, rollout gradual)

| Componente | Descrição | Quando |
|---|---|---|
| **Trilha do Driver** (Driver World) | por driver: panorama → quiz → cartões → evidências → missão prática → Action Log | S5 (3 drivers) |
| **Learning Paths por papel** | academia-engine já ranqueia por papel × prioridade coletiva × afinidade | S5 |
| **Letramento NR-1** (trilha de governança) | "O que a NR-1 exige", "Como ler dados agregados", "O que NUNCA fazer com os dados", "Como conduzir devolutiva" — para RH/SST/líderes; pré-requisito recomendado antes da 1ª onda | S5–S6 |
| **Formação de gestores** | interpretar prioridade sem culpar indivíduos; conduzir conversa de equipe; Playbook por driver | S6 |
| **Implementation Academy** (cliente) | trilhas Fundamentos/Governança/Transformação do onboarding institucional (sponsor, DPO, implementation lead) | S6–S7 |
| **Rituais de prática** | missões micro (20–25 XP) ligadas ao driver em foco; loops semanais da economia existente | S5+ |
| **Scenario Lab / Intervention Builder / Arena** | dinâmicas ultra X1/X2/X3 sobre /trajetoria, /experimentos, /lab | pós-S8 |
| **Action Log** | registro de aplicação real ("apliquei X com minha equipe") — elo Educar→Transformar→evidência | S6 |

**Resposta padrão às 9 perguntas do mandato (por iniciativa):** cada trilha declara, no próprio registro do catálogo: problema (driver de exposição), persona, driver mobilizado, mecanismo de aprendizagem (base científica da tabela WWP.md §2), prática real gerada (missão/Action Log), medição de transferência (Action Log + reavaliação de exposição no ciclo seguinte), risco de sobrecarga (tetos da economia), evidência disponível (catálogo D4 com citação verificada), próxima ação concreta (CTA único ao fim da trilha).

---

## G. Arquitetura de IA e Skills

> **Normativo em `docs/SKILL_MESTRA_VITALOS_EDUCACAO_TRANSFORMACAO.md`** (tese, invariantes, personas, tom, regras de dados/RAG/citação, templates, testes de regressão e a spec completa de 13 campos de cada skill). Aqui: catálogo, arquitetura compartilhada e rollout.

### G1 · Postura

Fase atual (mantida): **copiloto determinístico orientado por evidências e regras auditáveis** (EV-11). Linguagem proibida: "IA generativa que analisa sua organização". LLM real (P2-04) só após fim do S4, via proxy server-side, sobre o promptEnvelope já existente, sem nunca acessar respostas individuais.

### G2 · Catálogo (resumo — spec completa na Skill-Mestra)

| ID | Skill | Persona-alvo | Gate de dados | Ativa após |
|----|-------|--------------|---------------|------------|
| SK-01 | Interpretação Segura de Resultados | RH/SST/líder | só capsules seladas n≥k | S4 |
| SK-02 | Letramento NR-1 e GRO | RH/SST/gestores | nenhum dado da org (só doutrina) | S5 |
| SK-03 | Facilitação de Plano de Ação | RH/SST | capsule + catálogo de intervenções | S6 |
| SK-04 | Aprendizagem por Driver | colaborador/líder | driver priorizado + progresso próprio | S5 |
| SK-05 | Liderança e Gestão | líder | agregados da própria equipe (n≥k) | S6 |
| SK-06 | Comunicação com Trabalhadores | RH/sponsor | templates + capsule | S6 |
| SK-07 | Curadoria de Evidências | RH/SST | catálogo WWP verificado (gate G2) | S5 |
| SK-08 | Preparação de Devolutivas | RH/líder | capsule selada da própria org | S6 |
| SK-09 | Missões e Microintervenções | colaborador | missões do pack + tetos de economia | S5 |
| SK-10 | Avaliação de Adoção e Evolução | sponsor/C-Level | métricas de adoção agregadas | S8 |

### G3 · Arquitetura compartilhada

- **Grounding:** KB chunks versionados por driver (namespace) + GroundingFacts computados (grounding-engine existente); recusa por design abaixo do limiar de relevância.
- **RAG (fase LLM):** pipeline do PatchPack WWP transposto — chunking semântico ~1200 chars, top_k=8, citação obrigatória, verificação de links antes de recomendar (gate G2), namespace por tenant, NUNCA resposta individual no contexto.
- **Guardrails:** os 9 de `src/engine/ai/qa-gates.ts` (sem diagnóstico clínico, só agregados n≥k, sem vínculo com desempenho, sem mistura Domínio A/B, aprovação humana em proposta sensível…) + os 5 gates do PatchPack (G1 anti-alucinação/proveniência, G2 links verificados, G3 a11y, G4 LGPD/sem ranking público, G5 completude por driver).
- **Escalonamento humano:** qualquer menção a sofrimento individual, assédio ou risco grave → interromper análise, oferecer canais institucionais, registrar evento SEM conteúdo sensível, nunca "aconselhar" clinicamente.
- **Eventos de auditoria:** skill_invoked, skill_refused (motivo), skill_escalated, source_cited — metadados apenas.
- **Métricas de qualidade:** taxa de recusa correta (testes de regressão da Skill-Mestra), utilidade declarada pelo usuário, zero citação inventada (G1).
- **Rollout:** cada skill ativa somente após o sprint indicado (coluna "Ativa após") — nenhuma skill opera sobre dado que a data plane ainda não protege.

---

## H. Matriz de CTAs

Classificação: compreensão · aprendizagem · ação · evidência · governança · suporte · comercial. Todo CTA declara: intenção, persona, pré-requisito, evento, sucesso, erro, métrica, próxima etapa (os oito campos; tabela mostra o essencial — nenhum CTA decorativo).

| Página | Persona | CTA principal (tipo) | CTA secundário (tipo) | Evento | Métrica |
|--------|---------|----------------------|------------------------|--------|---------|
| `/` e `/nr1` (landing) | decisor RH/SST | Solicitar demonstração estratégica (comercial) | Iniciar piloto institucional (comercial) | lead_submitted (S7) | visita→lead |
| `/plataforma` | platform admin | Gerar link de convite com plano (governança) | Copiar link (ação) | org_invite_created | convites→ativações |
| `/ativar/:token` | sponsor | Concluir cadastro e ativar (ação) | Trocar setor (compreensão) | org_provisioned | ativação completa |
| home real por pack (`/rh`, `/escola`…) | org admin | Criar primeira onda (ação) | Concluir letramento antes (governança) | first_wave_created | contrato→1ª onda |
| `/admin` | RH_ADMIN | Criar onda e gerar links (ação) | Copiar mensagem WhatsApp (ação) | wave_created | tempo até n≥k |
| `/convite/:token` | colaborador | Responder com segurança (ação) | Entender o que é visível (compreensão/confiança) | response_accepted | taxa de conclusão |
| `/rh` com capsule | RH/SST | Ver prioridades (compreensão) | Preparar devolutiva (ação, SK-08) | capsule_viewed | leitura→plano |
| `/drivers`, `/matriz` | RH/SST | Estudar driver prioritário (aprendizagem) | Ver intervenções (compreensão) | driver_opened | driver→trilha |
| `/academia`, `/revisar` | colaborador/líder | Continuar trilha (aprendizagem) | Revisar cartões de hoje (aprendizagem) | module_completed | conclusão, retenção SM-2 |
| `/plano-acao` | RH/líder | Gerar plano de 13 semanas (ação) | Exportar PDF (evidência) | plan_generated | ações c/ responsável |
| `/experimentos` | RH/SST | Registrar evidência (evidência) | Ver diff-in-diff (compreensão) | evidence_recorded | evidências/ciclo |
| `/sst` | SST/CIPA | Ver exposição agregada (compreensão) | Abrir inventário PGR (governança) | pgr_viewed | exposição→ação |
| `/relatorios`, `/relatorio-global` | sponsor/C-Level | Gerar relatório executivo (evidência) | Preparar renovação (comercial, SK-10) | report_generated | renovação |
| `/privacidade` | todos | Gerenciar consentimento (governança) | Entender k-anonimato (compreensão/confiança) | consent_changed | confiança declarada |

Regra transversal: **um CTA primário por página** ("próxima melhor ação"); pré-requisito não cumprido → CTA aparece desabilitado com explicação, nunca some silenciosamente.

---

## I. Roadmap de sprints (fatias verticais)

### Decisões ToT estruturais (formato exposto: alternativas/critérios/pontuação/escolha/trade-offs/riscos/aceite)

**ToT-A · Coleta Cloud** — Alternativas: A patch no link setorial (6,3) · **B RPCs atômicas por fluxo (9,1)** · C setorial só-demo (4,2) · D adiar persistência (2,9) · E comprar survey externo (6,8) · F núcleo genérico de submissão (8,6). **Escolha: B+F** — fatia "submissão segura" como capacidade genérica com adapters (convite nomeado, código temporário, setorial). Trade-off: mais SQL versionado antes de UI nova. Risco: transações via RPC exigem disciplina no runbook Lovable. Aceite: campanha abre→coleta→atinge k sem fechar→fecha por decisão→capsule sem resposta individual sair do boundary.

**ToT-B · Schema-as-code sob Lovable Cloud** — Alternativas: A aceitar drift e documentar (3,0) · B supabase CLI local obrigatório + CI Postgres (7,2 — atrito alto p/ founder solo Windows) · **C migrations canônicas + migration de reconciliação idempotente + parity-check estático + runbook 1 migration=1 paste=1 commit (8,8)** · D abandonar Lovable Cloud (2,5). **Escolha: C**, com CLI local como nice-to-have S2 (gated em Docker) e CI GitHub só no S8. Trade-off: parity estático não prova RLS comportamental — mitigar com testes adversariais via anon client contra o próprio ambiente Cloud. Aceite: `bun run gate` falha se código referencia RPC/coluna ausente das migrations.

**ToT-C · Modalidades de credencial** — decisão da auditoria externa mantida: convite individual cego = padrão Domínio B/NR-1 (9,0) · código temporário por pessoa para escala (8,3) · link aberto só para pulse leve com limites declarados (4,6 como universal, aceitável como modalidade explícita). Verdade de produto: é desonesto prometer link único público + anonimato absoluto + dedupe perfeito + zero autenticação. Aceite: cada modalidade declara na UI o que garante e o que não garante.

**ToT-D · ICP e modelo comercial** — convergência das duas auditorias externas mantida: **Empresa/NR-1 primeiro (9,2), modelo híbrido sales-assisted → SaaS (9,0)**; Educação em seguida; Governo por rota técnico-contratual; sem checkout aberto agora. Aceite: 1 piloto Enterprise percorre contrato→ativação→onda→devolutiva→plano→evidência.

**ToT-E · Educação MVP** — ver §F1. **ToT-F · IA** — determinística agora, LLM pós-S4 (P2-04); pontuação dominada por segurança/honestidade.

### Sprints (donos: **CC** Claude Code · **F** founder/paste Lovable · **L** Lovable UI)

Espinha: segurança (S0–S3) → produto (S4–S6) → comercial (S7–S8). Cada sprint termina com build+tsc+testes verdes, migration colada e commitada (quando houver), e demo de 60 segundos.

---

**S0 · Fundação honesta** (CC+F)
- **Objetivo:** repo volta a ser fonte única da verdade. **Hipótese:** o drift é a causa-raiz da classe inteira de bugs de produção já vividos. **Persona:** founder/operação.
- **Escopo:** migration de reconciliação idempotente (RPCs + colunas de EV-02); `.env` fora do git + `.gitignore` + `.env.example` (P1-01); `scripts/schema-parity-check.ts` como teste; script `bun run gate`; `bun run format` + `.gitattributes` (P1-03).
- **Fora de escopo:** qualquer feature; CI GitHub; RLS comportamental.
- **Arquivos:** `supabase/migrations/`, `.gitignore`, `.gitattributes`, `scripts/`, `package.json` (scripts).
- **Dependências:** nenhuma. **Risco:** paste da reconciliação no Lovable — idempotência protege.
- **Aceite:** parity-check verde; `git ls-files .env` vazio; gate obrigatório documentado.
- **Testes:** parity como teste bun; suite completa verde.
- **Demo 60s:** "parity-check vermelho → colamos a migration → verde. O repo descreve a produção."
- **Métrica:** 0 referências órfãs código→schema. **ToT:** B.

**S1 · Identidade não forjável** (CC+F)
- **Objetivo:** matar P0-03 e P0-04. **Hipótese:** membership server-side elimina a classe cross-tenant. **Persona:** DPO/auditor.
- **Escopo:** tabelas `organization_memberships` + `role_grants` (+RLS); revogar UPDATE de role/org_id em profiles; helper `resolveAuthorizedOrgContext(accessToken)` usado por TODAS as funções privilegiadas (wave-admin, capsule-*, org-invite); eventos authorization_denied.
- **Fora de escopo:** UI de gestão de membros; múltiplos membros por org (schema suporta, UI depois).
- **Arquivos:** migrations, `src/lib/api/*.server.ts`, novo `src/lib/auth/authorize.server.ts`.
- **Dependências:** S0. **Risco:** migrar profile existente do founder-cliente piloto → script de backfill na própria migration.
- **Aceite:** critérios P0-03/P0-04 da matriz §D. **Testes:** adversariais cross-tenant nas 6 funções; autoelevação falha.
- **Demo 60s:** "logado como org A, forjo orgId de B no payload → negado com trilha; meu próprio painel segue normal."
- **Métrica:** 100% funções privilegiadas com cadeia sessão→membership. **ToT:** decisão B da auditoria externa (memberships), adotada.

**S2 · Onboarding atômico** (CC+F+L)
- **Objetivo:** matar P0-05 + P1-06. **Hipótese:** provisionamento transacional zera órfãos e forja. **Persona:** sponsor de cliente novo.
- **Escopo:** RPC `provision_organization_from_invite` (idempotente, transacional); userId derivado da sessão (accessToken→getUser), NUNCA do payload; redirect pós-ativação por pack+papel; opcional: supabase CLI local para testes RLS (gated em Docker).
- **Fora de escopo:** billing; múltiplos stakeholders no ato.
- **Arquivos:** migration (RPC), `onboarding.server.ts/.functions.ts`, `ativar.$token.tsx` (L revisa UX).
- **Dependências:** S1. **Risco:** compat com orgs já criadas — RPC só para novas.
- **Aceite:** critério P0-05 §D; Escola aterrissa em /escola. **Testes:** concorrência (2 submits, 1 org); e2e de ativação.
- **Demo 60s:** "dois cliques simultâneos no mesmo convite → uma organização; diretora de escola cai na home escolar."
- **Métrica:** 0 orgs órfãs; ativação→home correta 100%. **ToT:** A(F).

**S3 · Resposta selada** (CC+F)
- **Objetivo:** matar P0-06 + P0-07. **Hipótese:** uma resposta sensível entra exatamente uma vez, validada, na onda certa. **Persona:** colaborador vulnerável.
- **Escopo:** RPC `submit_wave_response` (lock condicional do convite + vínculo token↔wave + status/prazo da onda + validação de instrumento/itens/escala versionados + insert + consumo + recibo mínimo); `validateBlindSubmission` no caminho Cloud; eventos de coleta (P1-04 parcial).
- **Fora de escopo:** link setorial (S4); UI nova.
- **Arquivos:** migration (RPC + instrument_versions), `db-adapter.ts`, `response-capture.server.ts`.
- **Dependências:** S0 (RPCs versionadas), S1. **Risco:** validação server duplica a do cliente — extrair definição compartilhada do survey.
- **Aceite:** critérios P0-06/P0-07 §D. **Testes:** concorrência mesmo token; adversarial cross-wave; payload malformado.
- **Demo 60s:** "duplo submit → 1 resposta; item inventado → recusado com motivo; admin vê só a contagem subir."
- **Métrica:** 0 duplicatas; 100% rejeições com motivo em evento. **ToT:** A(B).

**S4 · Ciclo de vida da onda** (CC+F+L)
- **Objetivo:** matar P0-08 + P0-01. **Hipótese:** k-anon protege publicação; fechamento é decisão humana. **Persona:** RH que planejou onda de 200.
- **Escopo:** máquina de estados da onda (7 estados, ToT do P0-08); fechamento autorizado (usa S1); agregação idempotente; leitura parcial protegida (n≥k e política); persistência real do link setorial via RPC `submit_sector_response` com modalidade declarada (ToT-C); UI de estados (L).
- **Fora de escopo:** benchmark; LLM.
- **Aceite:** critérios P0-08/P0-01 §D. **Testes:** máquina de estados; e2e setorial Cloud + demo declarado; agregação 2× = 1 capsule.
- **Demo 60s:** "5ª resposta chega → onda CONTINUA aberta com leitura protegida; fecho formalmente → capsule final; link setorial em demo avisa que descarta."
- **Métrica:** 0 ondas seladas sem decisão; taxa de persistência setorial = 100% dos aceitos. **ToT:** A, C.
- **→ Gate G2 da auditoria externa atingido: piloto com dados reais desbloqueado.**

**S5 · Academia viva v1** (CC+F+L)
- **Objetivo:** eixo Educar com progresso real. **Hipótese:** trilha ancorada na prioridade medida gera conclusão > biblioteca genérica. **Persona:** colaborador e líder.
- **Escopo:** recorte F2 (3 drivers × D1/D2/D4/D5-template); tabelas learning_progress, sm2_card_state, quiz_attempts; ranking da academia sobre exposição real (capsule) quando existir; trilha de letramento NR-1; skills SK-02/SK-04/SK-07/SK-09 ativam (conteúdo determinístico).
- **Fora de escopo:** X1/X2/X3, VideoLab, chatbots.
- **Aceite:** critério F1. **Testes:** sm2 persistido entre sessões; ranking usa capsule real; tetos de XP respeitados.
- **Demo 60s:** "a org mediu → carga é P0 → colaborador abre a Academia e a trilha de Carga & Recuperação está no topo; revisa cartões; progresso sobrevive ao logout."
- **Métrica:** conclusão de trilha; retenção SM-2. **ToT:** E.

**S6 · Transformar com prova** (CC+L)
- **Objetivo:** fechar prioridade→plano→evidência. **Persona:** RH/SST + líder.
- **Escopo:** persistir plano de ação (13 semanas) + Action Log + evidence_records; devolutiva-engine sobre capsules seladas; PDF do plano (idioma pgr-document); skills SK-03/SK-05/SK-06/SK-08 ativam; formação de gestores (trilha §F3).
- **Aceite:** plano com responsável+prazo+métrica por ação (Guia MTE §13); evidência ligada a ação; reavaliação compara ciclos.
- **Demo 60s:** "da capsule ao PDF do plano de 13 semanas com responsáveis; líder registra evidência; reavaliação mostra delta."
- **Métrica:** ações com responsável/prazo = 100%; evidências/ciclo. **ToT:** decisão de manter intervenções organizacionais (nunca individualizar risco).

**S7 · Porta de entrada** (CC+L)
- **Objetivo:** aquisição real sem quebrar honestidade. **Persona:** decisor RH/SST visitante.
- **Escopo:** tabela leads + consentimento + UTM (P1-05); formulários da landing passam a persistir (sem dado sensível); analytics de funil (P1-04 completo); matriz §H implementada com eventos; página de confiança/privacidade comercial; oferta piloto 90 dias documentada.
- **Fora de escopo:** gateway de pagamento (P2-02); checkout.
- **Aceite:** lead entra com consentimento e origem; nenhum claim proibido (§ honestidade) na copy.
- **Demo 60s:** "visitante pede demonstração → lead no banco com origem → founder recebe; funil visível."
- **Métrica:** visita→lead; lead→reunião. **ToT:** D.

**S8 · Confiança comprovável** (CC+F)
- **Objetivo:** operação madura + higiene arquitetural. **Persona:** founder + futuro auditor técnico.
- **Escopo:** fix PackProvider→app/composition (P1-07); GitHub Actions (gate no CI, P1-02); Customer Health Score v1 + relatório executivo sobre dados reais (E4); checklist de prontidão de piloto (gates G0–G3); SK-01/SK-10 ativam.
- **Aceite:** CI verde no push; `grep "@/domain" src/engine` limpo (exceto testes); brief executivo gerado de capsule real.
- **Demo 60s:** "push → CI roda gate completo → verde; painel do sponsor mostra health da conta e o arco medição→evidência."
- **Métrica:** North Star (E4) da 1ª org piloto. **ToT:** B (fase CI).

---

## J. Plano de 10 ações (ordem exata)

1. Escrever e colar a **migration de reconciliação** (EV-02) — repo = produção. (S0)
2. **Tirar `.env` do git** e corrigir `.gitignore` + `.env.example`. (S0)
3. Criar **`scripts/schema-parity-check.ts`** + `bun run gate` como ritual obrigatório. (S0)
4. Criar **memberships/role_grants** e revogar autoelevação em profiles. (S1)
5. Colocar a cadeia **sessão→membership→tenant→permissão** em TODAS as server functions privilegiadas. (S1)
6. **RPC transacional de onboarding** com userId da sessão + redirect por pack. (S2)
7. **RPC atômica de submissão** com vínculo token↔onda e validação psicométrica no Cloud. (S3)
8. **Máquina de estados da onda** (k publica, humano fecha) + persistência real do link setorial. (S4)
9. **Academia viva** (3 drivers, quiz+cartões persistidos, letramento NR-1) sobre a exposição real. (S5)
10. **Plano de ação + evidência persistidos** e, só então, aquisição real de leads. (S6–S7)

---

## Autoauditoria final (mandato §16)

- [x] Não confunde documentação com realidade — toda afirmação etiquetada; EV-17 registra inclusive onde o código CONTRADIZ a documentação externa.
- [x] Cada P0 possui evidência (arquivo:linha) e critério de aceite (§D).
- [x] Núcleo separado do domínio — violação existente registrada (EV-10/P1-07) com correção agendada (S8).
- [x] Roadmap em fatias verticais com demo de 60s por sprint (§I), não camadas desconectadas.
- [x] Cada proposta educacional tem mecanismo de aprendizagem + prática real (§F, tabela WWP.md §2 + Action Log).
- [x] Toda IA tem guardrails, fonte, limite e escalonamento humano (§G + Skill-Mestra).
- [x] Recomendação comercial respeita segurança/contrato/entitlement — piloto só pós-S4; billing depois da confiança (P2-02/P2-06).
- [x] Nenhuma promessa de conformidade automática — claims proibidos listados (§9.3 da auditoria externa, adotados; EV-23).
- [x] Experiência considera o usuário menos técnico e mais vulnerável (persona dos sprints S3/S4; modalidades de credencial declaradas; §E1).
- [x] Cada sprint tem demo, métrica e teste (§I).
- [x] A tese aparece nos 4 eixos (§E) e no filtro de ouro das decisões ToT.
- [x] Features de vaidade eliminadas/adiadas: X1-X3, VideoLab, chatbots, benchmark como claim, expansão de packs, checkout aberto (P2/P3).

---

*Documento gerado por auditoria read-only Fable 5 em 2026-07-02, sobre o commit `7da2708`. Reauditar após S4 (gate de piloto) produzindo `AUDITORIA_DE_PRODUCAO_VITALOS_G1.md` com resultados contra banco real.*
