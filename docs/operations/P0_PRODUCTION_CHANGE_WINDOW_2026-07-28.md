# Janela controlada — correção do P0 de provisionamento em produção

> Preparado em 2026-07-28. **Nada foi executado.** Nenhum SQL aplicado, nenhum
> deploy, produção `shlm...akol` não acessada nem alterada. Piloto não
> autorizado. `Q1_1_BLOCKED` permanece.
>
> Este documento é uma **proposta de janela**, não uma autorização. Cada item
> marcado `PENDENTE FOUNDER` precisa ser preenchido com evidência real antes de
> a janela poder ser aberta.

## 1. Identificação do banco

| Item | Valor | Fonte |
|---|---|---|
| Project ref | `shlm...akol` | informado pelo founder (2026-07-26) |
| URL | `https://shlmzz....supabase.co` | `.env` versionado (`SUPABASE_URL`) |
| Região | `ca-central-1` | informado pelo founder |
| Ambiente | Live / produção, backend do app publicado | informado pelo founder |
| Não é | `vitalos-staging` (`xttjkpzhx...`) nem `hmwjawytz...` | verificado no painel |

**Confirmação inequívoca: PENDENTE FOUNDER.** A identidade foi informada, não
verificada por mim — não tenho acesso a esse banco por nenhum caminho. Antes de
abrir a janela, confirmar no painel que o projeto alvo é o mesmo que serve o
app publicado, e registrar aqui o print/URL. Já houve uma confusão de alvo
nesta linha de trabalho (a leitura de "19 tabelas" veio de um alvo não
identificado com rigor), então esta checagem não é formalidade.

## 2. Backup e restauração — `PENDENTE FOUNDER` / `BLOQUEADOR`

| Item | Estado |
|---|---|
| Mecanismo de backup | **desconhecido** |
| Retenção | **desconhecida** |
| Último backup confirmado | **nenhum** |
| Procedimento de restauração | **não documentado** |
| Restauração já testada | **nunca** |
| Responsável operacional | **indefinido** |
| Evidência verificável | **nenhuma** |

**FATO.** A conta Supabase do founder contém apenas dois projetos
(`hmwjawytz...` e `vitalos-staging`), e nenhum é a produção. O projeto
`shlm...akol` é provisionado e gerido pelo Lovable, dentro da organização
deles. O painel `Database -> Backups` da produção é inacessível ao founder.

**Este é o bloqueador da janela.** Aplicar DDL num banco cujo backup não pode
ser confirmado, nem restaurado, nem tem responsável nomeado, é assumir um risco
que a própria correção não justifica — sobretudo porque o rollback desta
migration é trivial (§5) e a exposição residual é contida (§6). A solicitação
ao Lovable está redigida em
`PRODUCTION_SCHEMA_AND_BACKUP_AUDIT_2026-07-26.md` §6 e **ainda não foi
enviada**.

## 3. Drift — `PENDENTE FOUNDER`

Última leitura disponível (2026-07-26, informada pelo founder): 19 tabelas, 11
funções, 25 policies, última migration registrada `20260713234253`.

**Inconsistência não resolvida.** Na versão `20260713234252` o repo espera 28
tabelas. Um histórico que registra migrations cujos objetos não existem é
`MIGRATION_HISTORY_NON_CANONICAL` — e isso importa aqui: qualquer ferramenta
que decida o que aplicar lendo esse registro vai pular o que julga aplicado.

### O que precisa ser lido antes da janela

```sql
-- (a) definicao vigente da funcao alvo
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'provision_organization_from_invite';

-- (b) ACL vigente
SELECT has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_role,
       p.pronargs AS num_args
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'provision_organization_from_invite';

-- (c) quantas assinaturas existem (sobrecarga tornaria a antiga ainda chamavel)
SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'provision_organization_from_invite';

-- (d) EXPOSICAO REAL (ver §6) — convites genericos ainda utilizaveis
SELECT count(*) AS convites_genericos_abertos
FROM public.org_invites
WHERE email IS NULL AND used_at IS NULL
  AND (expires_at IS NULL OR expires_at > NOW());
```

### Risco de aplicar SOMENTE a 20260726120000

**Baixo, e menor que o de aplicar o lote.** A migration é um
`CREATE OR REPLACE FUNCTION` de assinatura idêntica à existente (11 parâmetros,
verificado nas três definições do repo — não cria sobrecarga) mais um
`REVOKE`/`GRANT`. Ela **não** depende de nenhuma das tabelas ausentes
(`sector_links`, `ops_events`, `leads`, etc.), **não** cria nem altera tabela,
**não** toca dado. Todas as tabelas que ela referencia (`org_invites`,
`organizations`, `profiles`, `auth.users`) estão entre as 19 existentes.

Risco residual identificado: se a definição vigente em produção **divergir** da
do repo (drift não versionado — a anomalia `...253` sugere que isso é possível),
o `CREATE OR REPLACE` sobrescreveria essa versão. Por isso a query (a) é
pré-check obrigatório, e o texto retornado deve ser **guardado** como base do
rollback (§5).

## 4. Plano de mudança

### SQL exato

`supabase/migrations/20260726120000_bind_org_provisioning_to_authenticated_user.sql`,
tal como está em `main@061877c`. Aplicar **o conteúdo do arquivo**, sem edição.

O arquivo é ASCII puro (170 linhas) — uma tentativa anterior falhou com
`syntax error at or near "-"` porque o conteúdo passou por um renderizador que
substituiu tipografia. **Copiar do arquivo em disco ou do blob do git, nunca de
uma renderização.**

### SHA-256 — atenção à terminação de linha

| Variante | Hash |
|---|---|
| **Canônico (blob git, LF)** | `cd1ba81917bd73543a5b6c8a2935bfa4960cd6797027a42049e1fc4fb72d99ad` |
| Cópia de trabalho Windows (CRLF) | `885ec5a6c97455c0b8e9193df9143dcd93b1705459ffab5b7a43cff84d3ac806` |

Use o **canônico**. Verificar com:
`git show 061877c:supabase/migrations/20260726120000_bind_org_provisioning_to_authenticated_user.sql | sha256sum`

### Duração estimada

Execução do SQL: **menos de 1 segundo** (substituição de função + grants; sem
DDL de tabela, sem varredura, sem lock de dados). Janela total sugerida:
**30 minutos**, dominada por pré-checks, pós-checks e observação — não pela
mudança.

### Pré-checks (todos obrigatórios, nesta ordem)

1. Identidade do banco confirmada (§1).
2. Backup confirmado e **restauração testada** (§2) — hoje bloqueante.
3. Query (a): guardar a definição vigente **na íntegra** (base do rollback).
4. Query (b): registrar ACL atual.
5. Query (c): confirmar `count = 1` (sem sobrecarga).
6. Query (d): registrar exposição atual.
7. Congelamento: nenhuma edição no Lovable durante a janela.
8. Hash do SQL conferido contra `cd1ba819...`.

### Pós-checks

```sql
-- 1. Portao presente
SELECT pg_get_functiondef(p.oid) ILIKE '%identity_mismatch%'  AS portao_identidade,
       pg_get_functiondef(p.oid) ILIKE '%not_authenticated%'  AS recusa_anon,
       pg_get_functiondef(p.oid) ILIKE '%auth.role()%'        AS bypass_service_role,
       pg_get_functiondef(p.oid) ILIKE '%current_user%'       AS usa_current_user_PROIBIDO
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname='provision_organization_from_invite';
-- esperado: true, true, true, FALSE

-- 2. ACL
SELECT has_function_privilege('anon',          p.oid,'EXECUTE') AS anon,          -- false
       has_function_privilege('authenticated', p.oid,'EXECUTE') AS authenticated, -- false
       has_function_privilege('service_role',  p.oid,'EXECUTE') AS service_role   -- true
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='provision_organization_from_invite';

-- 3. Sem sobrecarga
SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='provision_organization_from_invite';  -- 1
```

### Critérios de sucesso

Todos os pós-checks acima com os valores esperados **e** o onboarding real
funcionando (§7). Nenhum dos dois isoladamente basta.

### Critérios de aborto

Abortar e executar rollback se: a definição vigente divergir do esperado sem
explicação; `count > 1` (sobrecarga); qualquer pós-check falhar; o onboarding
real quebrar; ou surgir erro não previsto no log da aplicação.

## 5. Rollback

### SQL de reversão

**Restaurar a definição capturada no pré-check 3**, textualmente, mais:

```sql
GRANT EXECUTE ON FUNCTION public.provision_organization_from_invite(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
```

Não escrever o rollback de memória nem do repositório: a definição de produção
pode divergir (§3), e o rollback tem de devolver **exatamente** o que estava lá.

### Efeitos colaterais

O rollback **reabre a vulnerabilidade** — é o preço de voltar. Organizações
criadas durante a janela permanecem (a migration não toca dado); nenhuma perda.
Nenhum lock prolongado, nenhuma migração de dados a desfazer.

### Limite temporal

Decidir rollback em até **15 minutos** após a aplicação, ou imediatamente se um
critério de aborto disparar. Passado esse prazo com tudo verde, tratar
regressão como incidente normal, não como rollback de janela.

### Responsável pela decisão

**PENDENTE FOUNDER** — nomear antes de abrir a janela. Hoje não há responsável
operacional definido, o que por si só desaconselha abrir.

## 6. Contenção temporária — a parte acionável hoje

Análise do fluxo, feita no código (`main@061877c`):

**FATO.** Criar convite de organização exige `verifyPlatformAdmin`
(`org-invite.functions.ts:20-22`), que valida o e-mail da sessão contra a
allowlist `PLATFORM_ADMIN_EMAILS`. **Um atacante não consegue emitir tokens.**

**FATO.** Convites têm `expires_at` default de 30 dias e são de uso único
(`used_at`).

**INFERÊNCIA.** A exploração exige um convite genérico (`email IS NULL`) já
emitido, ainda não usado e não expirado. Ou seja, a exposição real **não é
"qualquer um a qualquer momento"** — é limitada ao conjunto de convites
genéricos em aberto. A query (d) do §3 mede exatamente isso.

### Contenção proposta, por cenário

| Resultado da query (d) | Contenção recomendada |
|---|---|
| **0 convites abertos** | Exposição atual **nula**. Contenção = disciplina operacional: **não emitir convite genérico** até a janela; emitir sempre com `email` vinculado (o caminho com e-mail já valida identidade e não é explorável). Custo zero, sem código, sem deploy. |
| **≥ 1 convite aberto** | Expirar os pendentes: `UPDATE public.org_invites SET expires_at = NOW() WHERE email IS NULL AND used_at IS NULL AND (expires_at IS NULL OR expires_at > NOW());` — reversível, não destrói linha, e derruba a exposição a zero. **É escrita em produção: exige autorização explícita e não está autorizada aqui.** |

**Recomendação:** a disciplina de emitir convites **sempre com e-mail vinculado**
neutraliza o vetor sem tocar em nada — o caminho com e-mail sempre validou
identidade. Feature flag ou bloqueio de rota são desproporcionais: derrubariam
o onboarding legítimo inteiro para mitigar um vetor que já está fechado na
emissão.

**Nada implementado.** Nenhuma das opções foi executada.

## 7. Prova pós-produção

Os mesmos cenários já provados em staging, adaptados: **em produção, usar
exclusivamente dados sintéticos e limpar ao final**; jamais dados de pessoas
reais; jamais ler resposta individual.

| # | Cenário | Esperado |
|---|---|---|
| 1 | ACL | `anon`/`authenticated` sem EXECUTE; `service_role` com |
| 2 | UUID forjado (usuário autenticado + `p_user_id` alheio) | recusado — `42501` na ACL, ou `identity_mismatch` se o GRANT for restaurado |
| 3 | `anon` sem JWT | recusado |
| 4 | Sessão inválida | HTTP 401 |
| 5 | Service role (caminho do app) | permitido — organização criada |
| 6 | Zero escrita nas recusas | contagem de organizações, profiles e estado do convite idênticos antes/depois |
| 7 | Onboarding real ponta a ponta | convite com e-mail -> login -> criação de org funciona |

O harness `bun run staging:org-invite-proof` já implementa 1–6 e tem trava dura
que **aborta se a URL apontar para produção**. Rodá-lo contra produção exigiria
remover essa trava — **não recomendado**. Preferir execução manual dos cenários,
com dados sintéticos, ou uma variante com trava própria e limpeza garantida.

### Monitoramento pós-mudança

- Erros da aplicação nas rotas `/ativar/:token`, `/onboarding`, `/convite/:token`.
- `ops_events` — **atenção:** essa tabela pode não existir em produção (está
  entre as 9 provavelmente ausentes), então não contar com ela.
- Taxa de sucesso de onboarding nas 24h seguintes.

## 8. Riscos

| Risco | Sev | Mitigação |
|---|---|---|
| Backup não comprovado | **Alto** | **Bloqueador.** Obter resposta do Lovable antes. |
| Sem responsável operacional | **Alto** | **Bloqueador.** Nomear antes. |
| Definição de produção diverge do repo | Médio | Pré-check 3 captura a definição vigente e vira o rollback |
| Histórico de migrations não confiável | Médio | Aplicar SQL direto, não via ferramenta que leia o histórico |
| Sobrecarga de assinatura | Baixo | Pré-check 5 (`count = 1`) |
| Rollback reabre a falha | Aceito | Janela de decisão de 15 min; exposição contida (§6) |
| Corrupção do SQL no transporte | Baixo | Hash canônico conferido; arquivo ASCII puro |

## 9. Veredito

`P0_PRODUCTION_REMEDIATION_BLOCKED`

O plano técnico está pronto e o risco da mudança em si é baixo — a migration é
uma substituição de função sem DDL de tabela, sem toque em dado, com rollback
de um comando. **O que bloqueia não é a mudança: é o ambiente.** Backup não
comprovado, restauração nunca testada e responsável operacional indefinido.

Enquanto isso, a contenção do §6 reduz a exposição a custo zero e **sem tocar
em produção**: emitir convites sempre com e-mail vinculado.
