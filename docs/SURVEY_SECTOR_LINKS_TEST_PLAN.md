# Plano de Testes: Links de Pesquisa por Setor

> **Escopo:** testes para staging/local Supabase com dados sintéticos.
> **Nenhum destes testes altera produção ou aplica migrations.**
> **Gate de entrada:** G1 Privacy Vault aprovado com RLS básico funcionando.

---

## 1 · Estrutura de arquivos (quando implementar)

```
src/engine/survey/
  sector-link-engine.ts           # Engine puro (sem Supabase)
  sector-link-engine.test.ts      # Testes unitários (bun test)

src/lib/survey/
  sector-link.server.ts           # Fronteira server (chama RPCs)
  sector-link.server.test.ts      # Testes de integração (mock de RPCs)

supabase/tests/                   # Testes SQL pgTAP (staging)
  sector_links_rls.test.sql
  sector_links_cross_tenant.test.sql
  sector_links_privacy.test.sql
```

---

## 2 · Testes unitários — `sector-link-engine.test.ts`

### 2.1 Ciclo de vida do token

```typescript
describe("resolveSectorLink — ciclo de vida", () => {
  test("token válido resolve com success", () => {
    const link = buildSectorLink({ ..., expiresInDays: 30, createdAt: "2026-06-23" });
    expect(resolveSectorLink(link, "2026-06-24").valid).toBe(true);
  });

  test("token expirado é rejeitado", () => {
    const link = buildSectorLink({ ..., expiresInDays: 1, createdAt: "2026-06-01" });
    const r = resolveSectorLink(link, "2026-06-03");
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("expired");
  });

  test("token revogado é rejeitado mesmo dentro da validade", () => {
    const link = { ...buildSectorLink({...}), status: "revoked" as const };
    expect(resolveSectorLink(link, "2026-06-24").valid).toBe(false);
    expect(resolveSectorLink(link, "2026-06-24").reason).toBe("revoked");
  });

  test("token rotacionado é rejeitado com razão 'rotated'", () => {
    const link = { ...buildSectorLink({...}), status: "rotated" as const };
    expect(resolveSectorLink(link, "2026-06-24").reason).toBe("rotated");
  });

  test("token null é not_found", () => {
    expect(resolveSectorLink(null, "2026-06-24")).toEqual({ valid: false, reason: "not_found" });
  });

  test("token exatamente no limite (expiresAt === now) é expirado", () => {
    const ts = "2026-07-01T00:00:00.000Z";
    const link = { ...buildSectorLink({...}), expiresAt: ts };
    expect(resolveSectorLink(link, ts).valid).toBe(false);
  });
});
```

### 2.2 Supressão diferencial

```typescript
describe("suppressDifferentialInference", () => {
  test("sem grupos ocultos → não suprime", () => {
    expect(suppressDifferentialInference(
      [{ count: 10 }, { count: 8 }, { count: 7 }], 5
    )).toBe(false);
  });

  test("um grupo oculto entre dois visíveis → suprime (total inferível)", () => {
    // Total = 25; visíveis = 10 + 8 = 18; oculto = 7 inferível por subtração
    expect(suppressDifferentialInference(
      [{ count: 10 }, { count: 8 }, { count: 3 }], 5
    )).toBe(true);
  });

  test("múltiplos grupos ocultos → não suprime (inferência menos direta)", () => {
    expect(suppressDifferentialInference(
      [{ count: 10 }, { count: 2 }, { count: 3 }], 5
    )).toBe(false);
  });

  test("k=10 (contexto sensível) aplica limiar maior", () => {
    expect(suppressDifferentialInference([{ count: 7 }, { count: 6 }], 10)).toBe(true);
  });
});
```

### 2.3 âncora M.E.T.E.

```typescript
test("link gerado para T3-2026 carrega meteAnchor", () => {
  const link = buildSectorLink({ ..., meteAnchor: "T3-2026" });
  expect(link.meteAnchor).toBe("T3-2026");
});
```

---

## 3 · Testes de integração — fronteira server (mocks de RPC)

```typescript
describe("sector-link.server — resolução de token", () => {
  test("token_hash correto retorna access grant com sector_label (sem sector_id)", async () => {
    const result = await mockRpc("get_public_sector_survey_access", validToken);
    expect(result.valid).toBe(true);
    expect(result.sectorLabel).toBeDefined();
    expect(result).not.toHaveProperty("sectorId");      // NUNCA sector_id
    expect(result).not.toHaveProperty("organizationId"); // NUNCA org_id
  });

  test("token aleatório/inválido retorna 'invalid_or_expired'", async () => {
    const r = await mockRpc("get_public_sector_survey_access", "rnd-" + crypto.randomUUID());
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("invalid_or_expired");
  });

  test("tentativa de enviar sector_id diferente do token é bloqueada", async () => {
    // Front-end nunca envia sector_id; RPC ignora qualquer payload extra
    const r = await mockRpc("submit_sector_survey_response", {
      token: validToken,
      answers: validAnswers,
      sectorId: "outro-setor-injetado", // tenta injetar
      consentVersion: "2026.1",
    });
    expect(r.accepted).toBe(true); // aceito, mas sector_id injetado ignorado
    // Verificar que sector_id gravado é o resolvido do token, não o injetado
  });

  test("campanha fechada rejeita submissão", async () => {
    const r = await mockRpc("submit_sector_survey_response", {
      token: expiredCampaignToken, answers: validAnswers, consentVersion: "2026.1"
    });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe("campaign_closed");
  });

  test("consentimento ausente rejeita submissão", async () => {
    const r = await mockRpc("submit_sector_survey_response", {
      token: validToken, answers: validAnswers, consentVersion: null
    });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe("consent_required");
  });
});
```

---

## 4 · Testes SQL pgTAP (staging)

### 4.1 Isolamento multi-tenant

```sql
-- sector_links_cross_tenant.test.sql
BEGIN;
SELECT plan(5);

-- Setup: org_a e org_b com links distintos
-- Teste 1: org_b não pode selecionar links da org_a
SET LOCAL role = 'app_user';
SET LOCAL request.jwt.claims = '{"org_id": "org_b_uuid"}';
SELECT is(
  (SELECT count(*) FROM sector_survey_links WHERE organization_id = 'org_a_uuid'),
  0::bigint,
  'org_b não pode ver links da org_a'
);

-- Teste 2: tentativa de SELECT em anonymous_response_receipts retorna 0 rows (RLS)
SELECT is(
  (SELECT count(*) FROM anonymous_response_receipts WHERE sector_id = 'sector_org_a_uuid'),
  0::bigint,
  'app_user não pode ler receipts de outra org'
);

-- Teste 3: tentativa de invocar get_public_sector_survey_access com token de outra org
SELECT ok(
  (SELECT (get_public_sector_survey_access('token_org_a'))->>'valid' = 'false'
   OR (get_public_sector_survey_access('token_org_a'))->>'organizationId' IS NULL),
  'RPC não vaza org_id para token de outra org'
);

-- Teste 4: survey_link_events_aggregate — suppressed groups não visíveis abaixo de k
INSERT INTO survey_link_events_aggregate (link_id, period_date, completions_count, suppressed_flag)
VALUES ('link_uuid', CURRENT_DATE, 3, true);
SELECT is(
  (SELECT completions_count FROM survey_link_events_aggregate
   WHERE link_id = 'link_uuid' AND suppressed_flag = true),
  NULL::bigint, -- RLS deve bloquear ou retornar null quando suppressed
  'grupos suprimidos não expostos mesmo em SELECT'
);

-- Teste 5: role anônimo (público) não pode fazer SELECT direto em sector_survey_links
SET LOCAL role = 'anon';
SELECT throws_ok(
  'SELECT * FROM sector_survey_links',
  'permission denied for table sector_survey_links'
);

SELECT * FROM finish();
ROLLBACK;
```

### 4.2 Privacidade dos dados

```sql
-- sector_links_privacy.test.sql
BEGIN;
SELECT plan(8);

-- Token bruto nunca gravado (apenas hash)
SELECT hasnt_column('sector_survey_links', 'token_raw', 'token bruto não existe na tabela');

-- anonymous_response_receipts sem campos de identidade
SELECT hasnt_column('anonymous_response_receipts', 'user_id', 'sem user_id');
SELECT hasnt_column('anonymous_response_receipts', 'email', 'sem email');
SELECT hasnt_column('anonymous_response_receipts', 'ip_address', 'sem IP');
SELECT hasnt_column('anonymous_response_receipts', 'user_agent', 'sem user-agent');
SELECT hasnt_column('anonymous_response_receipts', 'invitation_id', 'sem invitation_id');

-- completed_at_bucket é DATE (não TIMESTAMP)
SELECT col_type_is('anonymous_response_receipts', 'completed_at_bucket', 'date',
  'completed_at é date (sem hora precisa)');

-- survey_link_events_aggregate não tem campos de respondente
SELECT hasnt_column('survey_link_events_aggregate', 'respondent_id', 'sem respondent_id');

SELECT * FROM finish();
ROLLBACK;
```

---

## 5 · Matriz de testes completa (checklist)

### 5.1 Ciclo de vida de token (unitário/integração)

| # | Cenário | Tipo | Critério |
|---|---|---|---|
| T01 | Token válido | Unitário | resolve.valid = true |
| T02 | Token expirado | Unitário | valid=false, reason=expired |
| T03 | Token revogado | Unitário | valid=false, reason=revoked |
| T04 | Token rotacionado | Unitário | valid=false, reason=rotated |
| T05 | Token aleatório/inválido | Unitário | valid=false, reason=not_found |
| T06 | Token no exato limite de expiração | Unitário | valid=false (boundary) |
| T07 | Campanha fechada | Integração | RPC → campaign_closed |
| T08 | Setor removido/inativo | Integração | RPC → sector_inactive |

### 5.2 Isolamento multi-tenant (SQL pgTAP)

| # | Cenário | Tipo | Critério |
|---|---|---|---|
| T09 | Org B não lê links da Org A | SQL/RLS | count = 0 |
| T10 | Anon não acessa sector_survey_links diretamente | SQL/RLS | permission denied |
| T11 | get_public_sector_survey_access não vaza org_id | SQL/RPC | campo ausente |
| T12 | Tentativa cross-tenant via token | SQL/RPC | invalid_or_expired |

### 5.3 Manipulação de sector_id pelo cliente

| # | Cenário | Tipo | Critério |
|---|---|---|---|
| T13 | Front-end envia sector_id diferente do token | Integração | ignorado; setor derivado do token |
| T14 | Front-end envia org_id na submissão | Integração | campo ignorado |
| T15 | Injeção de JWT diferente | SQL/RLS | bloqueado por RLS |

### 5.4 Privacidade dos dados

| # | Cenário | Tipo | Critério |
|---|---|---|---|
| T16 | Token bruto ausente no banco | SQL schema | hasnt_column token_raw |
| T17 | anonymous_response_receipts sem user_id/email/IP | SQL schema | hasnt_column |
| T18 | completed_at_bucket é DATE (não TIMESTAMP) | SQL schema | col_type_is date |
| T19 | Ausência de dados pessoais em logs de servidor | Manual/audit | inspecionar stdout/stderr |
| T20 | Token ausente em URL após resolução | E2E | history.state pós-resolução |
| T21 | Referrer-Policy: no-referrer no HTTP header | E2E | inspecionar headers |
| T22 | Sem analytics de terceiros nas rotas públicas | E2E/audit | ausência de scripts |

### 5.5 k-anonimato e supressão diferencial

| # | Cenário | Tipo | Critério |
|---|---|---|---|
| T23 | Grupo com n<5 não visível no dashboard | Unitário | visibleToLeader=false |
| T24 | suppressDifferentialInference previne subtração | Unitário | função retorna true |
| T25 | Dashboard não exibe médias quando suppressed | E2E | "dados insuficientes" |
| T26 | Filtro por setor não revela dado diferencial | E2E | grupos ocultos permanecem |
| T27 | Tentativa de consultar results abaixo de k via RPC | SQL | retorna suppressed |

### 5.6 Repetição de respostas (Modo A)

| # | Cenário | Tipo | Critério |
|---|---|---|---|
| T28 | Resposta duplicada em modo anônimo (Modo A) | Integração | accepted=true (modo aceita) + contador incrementa |
| T29 | Rate limit evita flood de respostas | Integração | limite efêmero ativo |

### 5.7 Ausência de JWT em rotas administrativas

| # | Cenário | Tipo | Critério |
|---|---|---|---|
| T30 | Criação de campanha sem JWT | Integração | 401 Unauthorized |
| T31 | Revogação de token sem JWT | Integração | 401 |
| T32 | get_safe_sector_results sem JWT | Integração | 401 |

### 5.8 QR Code e link (mesmo fluxo)

| # | Cenário | Tipo | Critério |
|---|---|---|---|
| T33 | URL do QR Code resolve para o mesmo token | E2E | mesma resposta de RPC |
| T34 | QR Code gerado client-side não usa servidor | Unitário/E2E | nenhuma requisição de rede para geração |

### 5.9 Integração VitalOS (pipeline M.E.T.E.)

| # | Cenário | Tipo | Critério |
|---|---|---|---|
| T35 | Ao atingir n≥5, DimensionExposure[] é derivada | Integração | crosswalk input válido |
| T36 | rankDriversByExposure retorna prioridades corretas | Unitário (já existe) | conforme crosswalk-engine.test.ts |
| T37 | MeasurementContextCapsule não contém rawAnswers | Unitário | tipo exclui campo |
| T38 | WaveLedger do sector link compõe com campaign-engine | Unitário | segments propagados |
| T39 | meteAnchor "T3-2026" flui para WaveLedger | Unitário | campo present |

### 5.10 Fluxo completo

| # | Cenário | Tipo | Critério |
|---|---|---|---|
| T40 | Campanha criada → link gerado → QR Code → respondente acessa → consente → responde → dashboard mostra participação | E2E staging | end-to-end sem PII |

---

## 6 · Dados sintéticos para staging

```typescript
// Fixture de staging — NÃO usar em produção
export const STAGING_SECTOR_LINKS = [
  {
    id: "link-operacional-001",
    organizationId: "org-demo-enterprise",
    campaignId: "campanha-copsoq-t3-2026",
    sectorId: "setor-operacional",
    tokenHash: sha256("staging-token-operacional-001"),
    status: "active",
    expiresAt: "2026-09-30T00:00:00Z",
    meteAnchor: "T3-2026",
    targetPopulation: 45,
  },
  {
    id: "link-administrativo-002",
    organizationId: "org-demo-enterprise",
    campaignId: "campanha-copsoq-t3-2026",
    sectorId: "setor-administrativo",
    tokenHash: sha256("staging-token-administrativo-002"),
    status: "active",
    expiresAt: "2026-09-30T00:00:00Z",
    meteAnchor: "T3-2026",
    targetPopulation: 12,
  },
  {
    id: "link-expirado-003",
    tokenHash: sha256("staging-token-expirado-003"),
    status: "expired",
    expiresAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "link-revogado-004",
    tokenHash: sha256("staging-token-revogado-004"),
    status: "revoked",
    revokedAt: "2026-06-15T10:00:00Z",
    expiresAt: "2026-09-30T00:00:00Z",
  },
];
```

---

## 7 · Critério de "pronto para produção"

- [ ] Todos os 40 testes passando no staging
- [ ] Zero dados pessoais em qualquer log ou resposta de API
- [ ] Isolamento cross-tenant verificado com 2 orgs distintas
- [ ] suppressDifferentialInference ativo e testado
- [ ] Rate limit efêmero funcionando (não como tabela de produto)
- [ ] `Referrer-Policy: no-referrer` confirmado via curl
- [ ] Ausência de scripts de analytics em `/respond/s/*` confirmada
- [ ] Token removido da URL após resolução confirmado
- [ ] Revisão de segurança por engenheiro designado (não o autor da implementação)
- [ ] ADR `ADR-001-sector-survey-links.md` atualizado com decisão final
