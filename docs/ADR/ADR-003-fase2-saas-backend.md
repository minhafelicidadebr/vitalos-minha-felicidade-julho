# ADR-003 — Fase 2: Backend Real (Mock → Supabase/Lovable Cloud)

> Status: **APROVADO** · Autores: Claude Sonnet 4.6 + product owner  
> Data: 2026-06-30 · Repositório: `github.com/minhafelicidadebr/vitalos`

---

## Contexto

O app está em **90-92% como demo** — toda a lógica, engines, UI e evidências
funcionam com dados mocados. Para ter **um cliente piloto real**, precisamos de:
coleta real de respostas → agregação k-anon → relatórios reais.

Billing e email transacional ficam fora do MVP do piloto (fatura manual,
link enviado via WhatsApp pelo admin).

---

## Caminho crítico (o mínimo que desbloqueia tudo)

```
Admin loga → cria onda → gera link → envia ao colaborador
Colaborador abre link → preenche COPSOQ → resposta salva no banco
Quando n≥5: agregação automática → capsule → todos os relatórios
              ficam automàticamente reais (engines não mudam)
```

---

## Schema SQL — copie e cole no Supabase SQL Editor

```sql
-- ═══════════════════════════════════════════════════════════════
-- VitalOS Fase 2 — Migration v1.0.0
-- Execute: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════

-- 1. ORGANIZAÇÕES (cada cliente = 1 org)
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,          -- 'empresa-abc' (URL-safe)
  name        TEXT NOT NULL,
  pack_id     TEXT NOT NULL DEFAULT 'enterprise', -- 'enterprise'|'health'|'government'
  plan        TEXT NOT NULL DEFAULT 'pilot', -- 'pilot'|'growth'|'enterprise'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PERFIS (link entre auth.users e organizations)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id),
  role        TEXT NOT NULL DEFAULT 'COLABORADOR',
  -- roles: RH_ADMIN | DIRETOR | SST | COLABORADOR | LIDER
  display_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ONDAS DE MEDIÇÃO
CREATE TABLE IF NOT EXISTS waves (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  instrument      TEXT NOT NULL,  -- 'COPSOQ' | 'PERMA' | 'VIA_T'
  label           TEXT,           -- ex: 'COPSOQ II · NR-1 · 2026-T1'
  status          TEXT NOT NULL DEFAULT 'draft',
  -- status: draft|scheduled|collecting|sealed|archived|cancelled
  invited_count   INTEGER DEFAULT 0,
  closes_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  sealed_at       TIMESTAMPTZ,
  seal_outcome    TEXT  -- 'published' | 'suppressed_k_anon'
);

-- 4. TOKENS DE CONVITE (anônimos — não ligados a identidade)
CREATE TABLE IF NOT EXISTS wave_invites (
  token       TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(24), 'base64url'),
  wave_id     UUID NOT NULL REFERENCES waves(id),
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wave_invites_wave_id ON wave_invites(wave_id);

-- 5. RESPOSTAS INDIVIDUAIS (NUNCA expostas — k-anon no banco)
-- Sem SELECT policy = nenhuma query de app lê linhas individuais
CREATE TABLE IF NOT EXISTS wave_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id      UUID NOT NULL REFERENCES waves(id),
  invite_token TEXT REFERENCES wave_invites(token),
  -- invite_token é o elo de auditoria; NÃO é identidade do respondente
  answers      JSONB NOT NULL,   -- { "item_id": score (1-5) }
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wave_responses_wave_id ON wave_responses(wave_id);

-- 6. CAPSULES (único dado que o app lê — sempre agregado, n≥5)
CREATE TABLE IF NOT EXISTS wave_capsules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id           UUID NOT NULL REFERENCES waves(id),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  instrument        TEXT NOT NULL,
  participant_count INTEGER NOT NULL,  -- n do grupo (k≥5 garantido)
  aggregated_at     TIMESTAMPTZ DEFAULT NOW(),
  closed_on         TEXT,              -- 'YYYY-MM-DD' da selagem
  cohort_id         TEXT,
  dimensions        JSONB NOT NULL,
  -- { "demands_quant": { "mean": 3.2, "high_risk_pct": 42, "label": "..." } }
  outcomes          JSONB,
  -- desfechos Domínio B separados (nunca misturados com dimensões)
  suppressed_dims   TEXT[]            -- dimensões com n<5 (omitidas, não fabricadas)
);
CREATE INDEX IF NOT EXISTS wave_capsules_org_id ON wave_capsules(org_id);
CREATE INDEX IF NOT EXISTS wave_capsules_wave_id ON wave_capsules(wave_id);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE organizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE waves          ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_invites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_capsules  ENABLE ROW LEVEL SECURITY;

-- Organizations: membro vê só a sua org
CREATE POLICY "org_own" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Profiles: usuário vê só o próprio perfil
CREATE POLICY "profile_own" ON profiles
  FOR ALL USING (id = auth.uid());

-- Waves: admins da org veem e gerenciam; colaboradores só veem collecting
CREATE POLICY "waves_org" ON waves
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "waves_admin_write" ON waves
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('RH_ADMIN','DIRETOR','SST')
    )
  );

-- Invites: qualquer um com o token pode marcar como usado (INSERT anon)
CREATE POLICY "invite_use" ON wave_invites
  FOR UPDATE USING (token = current_setting('app.invite_token', true));

-- Responses: INSERT anônimo com token válido; ZERO SELECT (ninguém lê linhas individuais)
CREATE POLICY "response_submit" ON wave_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM wave_invites
      WHERE token = wave_responses.invite_token
        AND used_at IS NULL
    )
  );

-- Capsules: membros da org leem (nunca linha individual)
CREATE POLICY "capsule_org" ON wave_capsules
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════
-- FUNÇÕES AUXILIARES (executam server-side, sem RLS bypass)
-- ═══════════════════════════════════════════════════════════════

-- Conta respostas de uma onda (sem expor linhas individuais)
CREATE OR REPLACE FUNCTION count_wave_responses(p_wave_id UUID)
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER FROM wave_responses WHERE wave_id = p_wave_id;
$$;

-- Verifica se token é válido e não foi usado
CREATE OR REPLACE FUNCTION is_invite_valid(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM wave_invites
    WHERE token = p_token AND used_at IS NULL
  );
$$;
```

---

## Server Functions a reescrever (mock → real)

| Função atual (mock) | Arquivo real | O que muda |
|---|---|---|
| `listPackWaveLifecycles` | `wave-lifecycle.functions.ts` | lê `waves` + `wave_capsules` do banco |
| `transitionWave` | `wave-lifecycle.functions.ts` | UPDATE `waves.status` no banco |
| `getEarnedSeal` | `earned-seal.functions.ts` | lê `wave_capsules` reais |
| `getBoardBrief` | `board-brief.functions.ts` | compõe sobre capsules reais |
| `getCycleProof` | `cycle-proof.functions.ts` | compõe sobre capsules reais |
| **NOVO** `submitSurveyResponse` | `survey-submit.functions.ts` | recebe answers + token → banco |
| **NOVO** `createWave` | `wave-admin.functions.ts` | INSERT wave + N invite tokens |
| **NOVO** `triggerAggregation` | `capsule-aggregator.functions.ts` | n≥5 → capsule |

---

## Prompts Lovable (3 precisos — use nesta ordem)

### Prompt 1 — Ativar Cloud + Schema
```
Ative o Lovable Cloud neste projeto. Depois vá em Settings → Database → SQL Editor
e execute exatamente este SQL (é a migration v1.0.0 do ADR-003):

[cole o bloco SQL completo acima]

Confirme que as 6 tabelas foram criadas e o RLS está ativo.
NÃO altere nenhum arquivo de código — apenas o banco.
```

### Prompt 2 — Autenticação
```
Adicione autenticação Supabase Auth a este projeto:
- Página /entrar: campo de e-mail + botão "Entrar com link mágico" (magic link, sem senha)
- Após clicar: "Verifique seu e-mail — enviamos um link de acesso"
- Após confirmar o link: redireciona para /rh (se role=RH_ADMIN|DIRETOR|SST)
  ou /colaborador (se role=COLABORADOR|LIDER)
- Rotas protegidas: TUDO exceto /entrar, /responder/* e /quiosque
- Estética: mesma da tela /acesso (serif, tokens oklch, sem neon)
NÃO altere nenhum engine, server function ou lógica de dados.
```

### Prompt 3 — Wire coleta real
```
Na rota /responder (ou /responder/:token), conecte o formulário à server function
submitSurveyResponse que está em src/lib/api/survey-submit.functions.ts.
O token de convite vem do parâmetro de URL :token.
Após envio bem-sucedido: mostrar tela de confirmação "Obrigado — sua contribuição
está protegida. Os resultados só aparecem quando 5+ pessoas responderem."
NÃO altere a lógica do formulário nem os engines — apenas o submit handler.
```

---

## O que NÃO fazer no Lovable

- Não reescreva engines (`src/engine/**`)
- Não altere server functions existentes que já têm mock funcionando
- Não instale Supabase manualmente (`bun add @supabase/supabase-js` — já consta no package)
- Não crie tabelas extras além das 6 do schema

---

## Invariantes de privacidade que o banco deve respeitar

1. `wave_responses` **nunca tem SELECT policy** — nem admins leem linhas individuais
2. `wave_capsules` só existe quando `participant_count ≥ 5`
3. `outcomes` (burnout, desfechos) é coluna separada — nunca misturada com `dimensions`
4. `invite_token` em `wave_responses` é o token do convite, NÃO o `auth.uid()` do respondente
5. A agregação acontece server-side em função SECURITY DEFINER — nunca no cliente
