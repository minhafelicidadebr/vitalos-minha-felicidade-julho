# Arquitetura: Links de Pesquisa por Setor — VitalOS Premium

> **Escopo:** design técnico e integração com o ecossistema VitalOS.
> **Não implementar** até G1 Privacy Vault aprovado em staging com testes de RLS e cross-tenant.
> **Protocolo:** Fable 5 ToT — Ramo D+F (design-docs + engine-abstraction).

---

## 1 · O salto Fable 5: "Link de Setor = Compromisso M.E.T.E."

A proposta original trata o link de setor como um **mecanismo de distribuição de pesquisa**.
O VitalOS eleva isso: **um link de setor é um artefato de temporada M.E.T.E.**

Quando um gestor/SST gera o link de COPSOQ para o Setor Operacional:
- A unidade **entra na fase Medir** do ciclo (T3 — temporada psicossocial)
- O sistema **pré-computa** o perfil de risco esperado (via `nr1-sector-exposure.ts`)
- Ao atingir n≥5, o setor **avança automaticamente para Entender** (crosswalk + drivers)
- O `rankDriversByExposure` reordena as prioridades do `Culture Lab`
- O `MeasurementContextCapsule` é populado para Íris (copiloto de mensuração)
- O `Vitality P&L` atualiza o custo estimado de risco psicossocial

Este ciclo fecha o loop **"um link gerado → uma transformação rastreável"** — que é o moat de
dados do VitalOS e o que diferencia de "mais uma pesquisa de clima".

---

## 2 · Modelo de dados proposto (sem migration — apenas design)

### 2.1 Tabelas novas

```sql
-- Seção de setor ativo por campanha. Um token por setor por campanha.
CREATE TABLE sector_survey_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,              -- multi-tenant (RLS por org)
  campaign_id   uuid NOT NULL,
  sector_id     uuid NOT NULL,               -- resolvido no servidor; nunca na URL
  token_hash    text NOT NULL UNIQUE,        -- SHA-256 do token raw; nunca o token bruto
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','revoked','rotated')),
  access_mode   text NOT NULL DEFAULT 'shared_sector'
                  CHECK (access_mode IN ('shared_sector', 'credential_mode')),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz,
  rotated_from_id uuid REFERENCES sector_survey_links(id),
  created_by    uuid NOT NULL,               -- user_id do admin/SST
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_access_at_aggregate timestamptz,      -- atualizado em batch, nunca por request
  target_population int,                     -- estimativa do setor (opcional)
  mete_season   text,                        -- "T3-2026" — âncora M.E.T.E.
  UNIQUE (campaign_id, sector_id)            -- um link ativo por setor por campanha
);

-- Eventos de participação por período (nunca por respondente)
CREATE TABLE survey_link_events_aggregate (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id       uuid NOT NULL REFERENCES sector_survey_links(id),
  period_date   date NOT NULL,               -- dia UTC (não hora — previne correlação temporal)
  opens_count   int NOT NULL DEFAULT 0,
  starts_count  int NOT NULL DEFAULT 0,
  completions_count int NOT NULL DEFAULT 0,
  suppressed_flag bool NOT NULL DEFAULT false, -- true se o grupo está abaixo do k-anon
  UNIQUE (link_id, period_date)
);

-- Recibos anônimos de resposta (sem identidade individual)
CREATE TABLE anonymous_response_receipts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL,
  sector_id     uuid NOT NULL,
  -- NUNCA: user_id, invitation_id, token, email, CPF, matrícula
  -- NUNCA: IP, user-agent, device fingerprint
  completed_at_bucket date NOT NULL,         -- dia UTC (não timestamp preciso)
  instrument_short text NOT NULL,            -- "COPSOQ", "PERMA+V / IVO", etc.
  receipt_id    text NOT NULL UNIQUE,        -- hash do recibo (não rastreável ao respondente)
  k_anon_min    int NOT NULL DEFAULT 5
);
```

### 2.2 Regras inegociáveis de dados

1. **Token bruto nunca no banco** — armazenar somente `token_hash = SHA-256(token)`
2. **Token exibido apenas uma vez** — no momento de geração; depois só hash
3. **`sector_id` derivado no servidor** — RPC recebe `token`, não `sector_id`
4. **Sem IP, user-agent, fingerprint** como dado de produto
5. **Rate limit server-side efêmero** (ex.: Redis TTL) — não como tabela de produto
6. **`completed_at_bucket` = dia UTC** (não timestamp de minutos)
7. **`suppressed_flag`** em `survey_link_events_aggregate` — previne visualização de grupos pequenos
8. `Referrer-Policy: no-referrer` em todas as rotas `/respond/s/...`
9. **Sem analytics de terceiros** (ex.: GA, Hotjar) nas rotas de resposta

### 2.3 Invariante de isolamento multi-tenant

RLS por `organization_id` com `DEFAULT DENY` (conforme ADR `DECISAO_MANIFESTO_PARIDADE_RLS_2026-06-19.md`). Nenhuma role de aplicação pode fazer `SELECT` direto em `anonymous_response_receipts` ou `survey_link_events_aggregate.completions_count` quando `suppressed_flag = true`.

---

## 3 · Engine proposto: `src/engine/survey/sector-link-engine.ts`

```typescript
// sector-link-engine.ts — puro, setor-agnóstico, sem imports de domain/.
// Ciclo de vida de tokens opacos de setor. Compõe campaign-engine.ts (participação/k-anon)
// sem substituí-lo. Nunca conhece org_id, sector_name ou instrumento — só o token.

export type SectorLinkStatus = "active" | "expired" | "revoked" | "rotated";
export type SectorLinkAccessMode = "shared_sector" | "credential_mode";

export interface SectorLink {
  id: string;
  tokenHash: string;                   // SHA-256 do token
  status: SectorLinkStatus;
  accessMode: SectorLinkAccessMode;
  expiresAt: string;                   // ISO
  revokedAt?: string;
  rotatedFromId?: string;
  meteAnchor?: string;                 // "T3-2026" — temporada M.E.T.E.
  targetPopulation?: number;
}

export interface SectorLinkResolution {
  valid: boolean;
  reason?: "expired" | "revoked" | "rotated" | "not_found";
  link?: SectorLink;
}

export interface SectorLinkEvent {
  kind: "open" | "start" | "completion";
  linkId: string;
  bucketDate: string;                  // "YYYY-MM-DD" — nunca timestamp
}

/** Verifica se um link está válido (ativo, não expirado, não revogado). */
export function resolveSectorLink(
  link: SectorLink | null,
  now: string,            // ISO — injetado para pureza/determinismo
): SectorLinkResolution {
  if (!link) return { valid: false, reason: "not_found" };
  if (link.status === "revoked") return { valid: false, reason: "revoked" };
  if (link.status === "rotated") return { valid: false, reason: "rotated" };
  if (link.expiresAt <= now) return { valid: false, reason: "expired" };
  return { valid: true, link };
}

/** Gera o estado de um novo link (sem persistência — puro). */
export function buildSectorLink(params: {
  id: string;
  tokenHash: string;
  expiresInDays: number;
  createdAt: string;          // ISO — injetado
  accessMode?: SectorLinkAccessMode;
  meteAnchor?: string;
  targetPopulation?: number;
}): SectorLink {
  const expiresAt = new Date(
    new Date(params.createdAt).getTime() + params.expiresInDays * 86_400_000,
  ).toISOString();
  return {
    id: params.id,
    tokenHash: params.tokenHash,
    status: "active",
    accessMode: params.accessMode ?? "shared_sector",
    expiresAt,
    meteAnchor: params.meteAnchor,
    targetPopulation: params.targetPopulation,
  };
}

/** Calcula a supressão diferencial para um conjunto de segmentos (previne inferência por subtração). */
export function suppressDifferentialInference(
  segments: Array<{ count: number }>,
  kMin: number,
): boolean {
  // Se o complemento de qualquer grupo oculto pode ser inferido por subtração, suprimir tudo.
  const visible = segments.filter((s) => s.count >= kMin);
  const hidden = segments.filter((s) => s.count < kMin);
  if (hidden.length === 0) return false;
  // Se há apenas 1 segmento visível e o total é conhecido, o oculto é inferível.
  return hidden.length > 0 && visible.length === segments.length - 1;
}
```

**Lei de composição:** `sector-link-engine.ts` resolve o ciclo de vida do token.
`campaign-engine.ts` computa a participação (WaveLedger, k-anon, lembretes). Os dois compõem — nunca se substituem.

---

## 4 · RPCs Supabase propostas (sem criar migrations ainda)

### 4.1 Acesso público (sem JWT)

```sql
-- Retorna APENAS dados necessários para renderizar a pesquisa.
-- Nunca retorna: organization_id, sector_id numérico, outros setores, respostas, hashes.
CREATE OR REPLACE FUNCTION get_public_sector_survey_access(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash text := encode(sha256(p_token::bytea), 'hex');
  v_link sector_survey_links;
  v_campaign record;
  v_sector_label text;
BEGIN
  SELECT * INTO v_link
  FROM sector_survey_links
  WHERE token_hash = v_token_hash
    AND status = 'active'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_or_expired');
  END IF;

  -- Resolve setor e campanha no servidor — nunca retorna IDs internos
  SELECT c.title, c.opens_at, c.closes_at, c.instrument_short,
         s.display_name as sector_label
  INTO v_campaign
  FROM campaigns c
  JOIN sectors s ON s.id = v_link.sector_id
  WHERE c.id = v_link.campaign_id;

  RETURN jsonb_build_object(
    'valid', true,
    'campaignTitle', v_campaign.title,
    'opensAt', v_campaign.opens_at,
    'closesAt', v_campaign.closes_at,
    'sectorLabel', v_campaign.sector_label,   -- texto amigável, não sector_id
    'instrumentShort', v_campaign.instrument_short,
    'meteAnchor', v_link.mete_season,
    'accessMode', v_link.access_mode
    -- NUNCA: organization_id, sector_id, token, hashes, respostas, outros setores
  );
END;
$$;
```

### 4.2 Submissão anônima

```sql
CREATE OR REPLACE FUNCTION submit_sector_survey_response(
  p_token text,
  p_answers jsonb,
  p_consent_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_token_hash text := encode(sha256(p_token::bytea), 'hex');
  v_link sector_survey_links;
BEGIN
  -- 1. Valida token
  SELECT * INTO v_link FROM sector_survey_links
  WHERE token_hash = v_token_hash AND status = 'active' AND expires_at > now();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'invalid_token');
  END IF;

  -- 2. Valida consentimento (versão mínima exigida)
  IF p_consent_version IS NULL OR p_consent_version < '2026.1' THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'consent_required');
  END IF;

  -- 3. Grava recibo anônimo (sem identidade)
  INSERT INTO anonymous_response_receipts
    (campaign_id, sector_id, completed_at_bucket, instrument_short, receipt_id)
  VALUES (
    v_link.campaign_id,
    v_link.sector_id,
    CURRENT_DATE,
    (SELECT instrument_short FROM campaigns WHERE id = v_link.campaign_id),
    encode(sha256((v_link.id || p_consent_version || now()::text)::bytea), 'hex')
    -- NÃO incluir p_answers no receipt — descartado pelo servidor após validação
  );

  -- 4. Incrementa contador agregado (nunca resposta individual)
  INSERT INTO survey_link_events_aggregate (link_id, period_date, completions_count)
  VALUES (v_link.id, CURRENT_DATE, 1)
  ON CONFLICT (link_id, period_date)
  DO UPDATE SET completions_count = survey_link_events_aggregate.completions_count + 1;

  -- 5. Não retorna o receipt_id (não rastreável) — apenas confirmação
  RETURN jsonb_build_object('accepted', true, 'persistence', 'cloud_anon');
END;
$$;
```

### 4.3 Dashboard do gestor (somente agregados)

```sql
-- Retorna participação agregada por setor. Segmentos abaixo de k retornam 'suppressed'.
CREATE OR REPLACE FUNCTION get_safe_sector_link_status(p_campaign_id uuid)
RETURNS jsonb ...;

-- Resultados protegidos por k-anon e suppressDifferentialInference
CREATE OR REPLACE FUNCTION get_safe_sector_results(p_campaign_id uuid)
RETURNS jsonb ...;
```

---

## 5 · Integração VitalOS: o loop completo Medir→Provar

```
Gestor cria campanha COPSOQ T3
  → seleciona setores elegíveis
  → sistema âncora em M.E.T.E. "T3-2026"
  → gera token 256 bits por setor
  → armazena somente token_hash
  → exibe token UMA VEZ + QR Code (client-side qrcode.react)

Colaborador acessa /respond/s/{opaque_token}
  → servidor resolve: token_hash → sector_id (nunca na URL)
  → RPC get_public_sector_survey_access retorna: título, setor (texto), instrumento
  → consentimento explícito (domainB disclaimer)
  → 41 itens NCOPSII (survey-engine.ts, COPSOQ integrais)
  → submissão via submit_sector_survey_response (servidor descarta conteúdo, grava recibo anônimo)
  → XP anti-gaming (solo participation, cap diário — gamification-engine.ts)

Ao atingir n≥5 respostas no setor
  → DimensionExposure[] derivada dos agregados (crosswalk dimension IDs)
  → rankDriversByExposure(NR1_CROSSWALK, exposures) → drivers priorizados
  → Culture Lab reordena planos de ação pelos drivers
  → MeasurementContextCapsule populado para Íris:
      { phase: "mensurar", instrument: "COPSOQ", permittedAggregate: DimensionExposure[] }
  → Vitality P&L atualiza custo estimado de risco psicossocial (pnl-engine.ts)
  → Relatorio Global ESG marca "GRO-Ready: evidência coletada T3"
  → Trust Ledger registra evento de consentimento Domínio B

Gestor vê dashboard /sst
  → WaveLedger: taxa de participação por setor (n≥5 visível, n<5 suprimido)
  → Matriz de risco COPSOQ atualizada (rankDriversByExposure)
  → "dados insuficientes" se grupo < k
  → SEM respostas individuais, SEM tokens, SEM hashes
```

---

## 6 · Rota pública proposta

```typescript
// src/routes/respond.s.$token.tsx
// Rota pública — SEM AppShell, SEM autenticação, SEM PackProvider logado
// Token resolvido via TanStack Start server function → sector derivado no servidor

export const Route = createFileRoute("/respond/s/$token")({
  head: () => ({ meta: [{ title: "Responder Pesquisa — 4 Lentes VitalOS™" }] }),
  // Sem loader que exponha sector_id ou org_id ao cliente
  component: PublicSurveyPage,
});
```

**Invariantes da rota pública:**
- Sem `organization_id` na URL ou no estado React
- Sem `sector_id` no estado React — setor mostrado somente como texto amigável
- `Referrer-Policy: no-referrer` no HTTP header
- Sem scripts de analytics de terceiros
- `submissionId` gerado pelo servidor (não pelo cliente como em `responder.tsx:92`)
- Token removido da URL após resolução (history.replaceState)

---

## 7 · UX proposta — os 4 estados

### 7.1 Tela de gestão de campanha (`/sst` — painel SST/RH)

| Componente | Descrição |
|---|---|
| Criar campanha | Título, instrumento (COPSOQ/PERMA/VIA-T/FIB-T), janela, setores elegíveis, população estimada, limiar k |
| Painel "Links por Setor" | Tabela: setor · status · validade · copiar link · QR Code · revogar · rotacionar · participação agregada |
| Estado "dados insuficientes" | Badge âmbar com texto "Aguardando n≥5 respondentes para publicar" |
| Âncora M.E.T.E. | "Esta campanha faz parte de T3-2026 (Medir Risco Psicossocial)" |

### 7.2 Página pública `/respond/s/{token}`

1. **Resolução**: token → sector_label (sem setor na URL)
2. **Aviso de setor pré-definido**: "Esta pesquisa está configurada para [Setor Operacional]. Se este não é seu setor, não responda — não há como corrigir depois."
3. **Consentimento domainB** (disclaimer verbatim do `enterprise.pack.json`)
4. **41 itens NCOPSII** (survey-engine.ts reutilizado)
5. **Confirmação sem confetes**: "Obrigado — sua participação ajuda a entender os riscos psicossociais nesta unidade."
6. **Sem gamificação visível** na página pública (XP registrado em background se usuário logado)

### 7.3 Limitação honesta (invariante de comunicação)

O sistema deve exibir explicitamente:
> "Não é possível obter simultaneamente anonimato forte, rastreamento individual de participação e uma resposta por pessoa sem uma camada adicional de credencial anônima. No Modo A (padrão), aceitamos que um colaborador possa responder mais de uma vez via link compartilhado, em favor do anonimato. O Modo B (futuro) usará credencial anônima para controle de elegibilidade sem identificação."

---

## 8 · Diagrama de componentes

```
[Admin/SST]
  └─ /sst (painel Domínio B)
      ├─ CampaignManager (cria, configura setores)
      ├─ SectorLinkPanel (gera token, QR Code, revoga, rotaciona)
      └─ ParticipationDashboard (WaveLedger, k-anon, suppressDifferential)

[Token lifecycle: sector-link-engine.ts]
  ├─ buildSectorLink (estado inicial)
  ├─ resolveSectorLink (validação no server)
  └─ suppressDifferentialInference (guard estatístico)

[Respondente anônimo]
  └─ /respond/s/$token (rota pública sem auth)
      ├─ get_public_sector_survey_access (RPC → sector_label, instrumento)
      ├─ ConsentScreenDomainB (disclaimer verbatim)
      ├─ SurveyRuntime (survey-engine.ts — 41 itens NCOPSII reutilizados)
      └─ submit_sector_survey_response (RPC → descarta conteúdo, conta recibo anônimo)

[Pipeline Medir→Transformar]
  ├─ DimensionExposure[] (agregados COPSOQ por dimensão)
  ├─ rankDriversByExposure (crosswalk-engine.ts — já existe)
  ├─ MeasurementContextCapsule → Íris (mensurar-copiloto-engine.ts — Fase futura)
  ├─ pnl-engine.ts (custo de risco psicossocial)
  └─ esg-engine.ts (GRO-Ready flag)
```

---

## 9 · Precondições de implementação (gates)

| Gate | Descrição | Status |
|---|---|---|
| **G1 Privacy Vault** | RLS aprovado em staging com testes cross-tenant | ⏳ Pendente |
| **COPSOQ integral** | 41 itens NCOPSII no `survey-mock.ts` | ⏳ Em progresso (PR #17) |
| **sector-link-engine.ts** | Engine puro com testes (sem Supabase) | 🔲 Próximo passo |
| **Rota `/respond/s/$token` mock** | UX demo com token simulado | 🔲 Pós-engine |
| **RPCs Supabase** | Criação com RLS e testes de isolamento | 🔲 Pós-G1 |
| **QR Code component** | `qrcode.react` client-side | 🔲 Junto com rota mock |
| **Íris + MCC** | Copiloto de mensuração com MeasurementContextCapsule | 🔲 Fase 2 (G2) |

---

*Veja também: `SURVEY_SECTOR_LINKS_TEST_PLAN.md` e `ADR/ADR-001-sector-survey-links.md`*
