# Checklist de Prontidão de Piloto — VitalOS (S8, E4)

> Estado em **2026-07-09** (commit `b1f703a`). Cada linha cita a evidência
> verificável — nada é "afirmado". Reverificar antes de assinar o 1º piloto.
> Ver também `docs/AUDITORIA_DE_PRODUCAO_VITALOS_G1.md` — reauditoria
> completa dos 8 P0 + 7 P1 do Plano Mestre, item por item, contra o código
> atual (commit `90a1f10`).
> Nota de fonte: os gates G0–G3 nomeados vêm da auditoria externa (documento
> não versionado neste repo); aqui eles são operacionalizados a partir da
> decisão de go-live do Plano Mestre §A, que É versionada.

## 1. Decisão de go-live (Plano Mestre §A) — status atual

| Modalidade | Decisão original | Status hoje | Evidência |
|---|---|---|---|
| Demo comercial com dados sintéticos | GO (rotulada como demo) | **GO** | vitrine de demos atrás de senha; toda tela demo declara "demonstração" |
| Piloto com dados reais de pesquisa | NO-GO até fim do S3 | **GO** — S0–S4 executados E verificados em produção | migrations 1–18 aplicadas; 6 verificações de privilégio conferidas no banco vivo (2026-07-09); memória `project_vitalos_fase2.md` |
| Venda Enterprise/NR-1 com coleta real | NO-GO até S4 + pacote de evidências | **GO técnico** — S4 completo com os 3 followups fechados | packId da org (`3db9ad7`), sector links reais (`53903bc`), telemetria (`a981db5`) |

## 2. Espinha de segurança (S0–S4) — toda verificada

- [x] **S0 Fundação honesta** — parity-check como teste (`bun run parity`); `.env` fora do git; `bun run gate` ritual.
- [x] **S1 Identidade não forjável** — `requireOrgAdmin`/`resolveOrgMembership` em toda função privilegiada; REVOKE de autoelevação **conferido com `has_column_privilege` no banco vivo** (não só a migration).
- [x] **S2 Onboarding atômico** — `provision_organization_from_invite` transacional; userId sempre da sessão.
- [x] **S3 Resposta selada** — `submit_wave_response` atômica; validação psicométrica no Cloud (mesma função pura do demo).
- [x] **S4 Ciclo de vida** — k-anon publica, humano fecha; agregação idempotente; sector links reais; telemetria `ops_events`.

## 3. Operação e confiança (S7–S8)

- [x] **Leads reais com consentimento e origem** (S7) — engine + tabela + painel `/plataforma` (migration 19 — **conferir se já aplicada no Lovable antes do piloto**).
- [x] **CI no push** (P1-02) — `.github/workflows/gate.yml`; 2 runs verdes consecutivos no runner real.
- [x] **Fronteira Engine≠Domínio como teste** (P1-07) — `engine-domain-boundary.test.ts`.
- [x] **Customer Health Score v1** (E4) — 4 dimensões sobre contagens reais; painel `/plataforma`; North Star = ≥2 ciclos + ≥1 evidência.
- [x] **Relatório executivo real** (E4) — Board Brief dos 5 céticos sobre o Cofre de Ciclos (`/panorama`, sessão de org).

## 4. Pré-voo operacional do 1º piloto (fazer NA SEMANA da ativação)

- [ ] Migration 19 (`leads`) aplicada + 2 verificações do rodapé.
- [ ] E2E real: gerar convite em `/plataforma` → ativar org → criar onda → responder por convite E por link de setor → n≥5 → leitura protegida → fechar onda → registrar ciclo no Cofre.
- [ ] Trilha de operações (`/admin`) mostrando os eventos do E2E acima.
- [ ] Redirect URLs do Supabase Auth conferidas (painel Lovable) — causa conhecida de travamento do magic link.
- [ ] `RESEND_API_KEY` decidida: com e-mail real ou fluxo WhatsApp/link manual (fallback `logged_only` é seguro, mas o founder precisa saber qual está ativo).
- [ ] Contrato/termos do piloto citando exatamente a frase de posicionamento (§A): sem laudo automático, sem blindagem jurídica.

## 5. Segue NO-GO (não prometer no piloto)

- **LLM real no Copiloto** (P2-04) — pré-requisitos técnicos atingidos pós-S4, mas exige proxy server-side + avaliação de alucinação + decisão de provider. IA atual é determinística e honesta.
- **Benchmark entre clientes** — só com ≥2 tenants reais (claim proibido antes).
- **Billing/checkout self-serve** (P2-02) — piloto é contrato/fatura manual.
- **Selo Empresa Viva com dado real** — exige IVO/participação/consentimento reais (o Board Brief real já o declara "pendente", nunca fabricado).
- **Agregado POR SETOR** do sector link — v2 declarada (exigiria k-anon por recorte).

## 6. Higiene conhecida, não bloqueante

- P1-03: ~81k erros CRLF de prettier mascarando ~20 reais — exige commit de formatação massiva + `.gitattributes`, coordenar com sync do Lovable.
- P2-01: `PLATFORM_ADMIN_EMAILS` como allowlist — aceitável no piloto (break-glass documentado).
- Reauditar pós-S4 contra banco real (`AUDITORIA_DE_PRODUCAO_VITALOS_G1.md`) — recomendação do Plano Mestre ainda em pé.
