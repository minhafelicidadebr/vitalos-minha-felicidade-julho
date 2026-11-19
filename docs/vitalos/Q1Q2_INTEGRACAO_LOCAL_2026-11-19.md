# Q1+Q2 · integração local · 19/11/2026

Branch `integ/q1-q2-merge` (worktree `..\vitalos-integ-merge`). Merge revisado `b55d436` de Q1 `9bbfa92` (`feat/ivo-fibt-platform-foundation`) com Q2 `b4ee953` (`feat/claude-q2-perfis`); teste SST `6d48c48`. Estado: **integrado em código, no gate local e em jornada real no navegador numa pilha descartável com bindings só em loopback** (seção "Prova integrada", ao final, substitui os bloqueios 1–3 abaixo). CI, staging e piloto: não confirmados.

## Reconciliação

- Candidato anterior `integ/q1-q2-local` (cópia não comitada do WIP Q1) **preservado intacto**: 37 arquivos iguais a `9bbfa92`, 6 desatualizados (`.gitignore`, `painel.tsx`, `plataforma.tsx`, `q1-browser-proof-setup.ts`, migration `20261118173000`, manifesto); nada exclusivo além do manifesto derivado. Substituído por merge real, sem cópia.
- Conflitos (só 2, resolvidos por união): `scripts-guard-coverage.test.ts` mantém o guard dedicado do Q1 (`requireQ1BrowserProofLocalTarget`: API, DB, container, project_id e binding só `127.0.0.1:57722`) **e** a entrada `institutional-tenant.ts` do Q2; `migrations.manifest.json` regenerado (72 migrations, rollup `6e7587d82bef`).
- Ordem: 4 migrations Q1 (`20261118170000`…`20261119103000`) antes da B2 Q2 (`20261119120000`). As do Q1 não tocam `action_items`/`action_plans` nem as RPCs do ledger.

## Provas por nível

| Nível | O que foi provado | Onde |
| --- | --- | --- |
| Teste automatizado | `bun run gate` no merge: **4.541 aprovados, 0 falhas**, paridade, TypeScript, secret-scan. Inclui papéis Q2 (RH, liderança, colaborador), designação, idempotência PI-13, isolamento entre empresas, 4 estados de módulo, contrato Q1/Q2 e SST sem autoridade no ledger (`q1-q2-contract.test.ts`, 7) | `b55d436`/`6d48c48` |
| Execução local no banco | Suíte `10_q2_ledger_actor_scope.sql` 16/16 (pré-merge, stack institucional, ROLLBACK). Casos SST (17–18) **escritos, não executados** | stack institucional (só migrations Q2) |
| Jornada real no navegador | Q2 por papel (RH, liderança, colaborador, Beta sem módulo, plano encerrado, 320/390 px) — **código anterior ao merge**, stack institucional | registros B1, C2 |
| Jornada integrada Q1+Q2 no navegador | **não demonstrada** | — |
| CI · staging · piloto | **não confirmados** | — |

## Bloqueios desta prova (erros exatos)

1. **Pilha Supabase descartável com loopback:** a CLI publica as portas em `0.0.0.0` (`supabase_db_vitalos-q1-browser-proof|0.0.0.0:57722->5432/tcp`). O guard do Q1 exige `127.0.0.1:57722` e recusa — corretamente. Nenhuma pilha nova com auth pôde ser criada sob esse critério.
2. **Replay descartável sem porta (`bun run db:replay`):** container sem porta publicada; parou em `reconciliação de arquivos` — 10 migrations sem pacote de linhagem (`20261113195527_institutional_first_admin.sql` … `20261119120000_q2_ledger_actor_scope_and_title_visibility.sql`). Lacuna anterior a esta onda; classificar é decisão de custódia, não feita pelo agente.
3. **Aplicação direta em Postgres sem porta (prova pontual fora do repo):** `20260703203653_…sql: relation "wave_capsules_wave_id_unique" already exists` — a linhagem exige a lógica do harness. Parada; container removido.
4. **Stack preservado:** não alterado; execução da suíte SQL ampliada negada pelo classificador de segurança da sessão. Sem escrita nem login nesta onda.

## Fechamento operacional Q2 (sem duplicar)

| Papel | Implementado | Lacuna real |
| --- | --- | --- |
| RH | leitura por setor, plano, designação (rascunho e PI-13), encerramento | — |
| Liderança | estado e execução só na própria ação de plano ativo; leitura do encerrado | — |
| Colaborador/membros | devolutiva coletiva fechada; título só com `title_visible_at` | ações anteriores à B2 sem título (decisão D4) |
| Plataforma | habilitação Q1/Q2 por CAS; primeiro RH | — |
| SST | nenhuma autoridade Q2 (teste); atuação só no contrato Q1 | prova SQL não executada |
| Profissionais parceiros | formulário e fila de interesse só em `DEV` | **não é marketplace operacional** |

PIL-01–PIL-08: inalterados, pendentes de definição humana. Divergência: PIL-08 registra o candidato técnico `2e9df54`; o candidato integrado atual é `6d48c48`. Atualizar a seleção é decisão do operador.

## Divergências documentais

- `CLAUDE.md` descreve M.E.T.E. como "T1 IVO/PERMA · T2 VIA-T · T3 COPSOQ"; a jornada canônica (`src/domain/journey.ts`, `lens-catalog.ts`) e esta frente usam Q1 COPSOQ · Q2 FIB-T · Q3 PERMA+V · Q4 VIA-T.
- `docs/instrumentos/PERMA_TRABALHO.md` traz "Mapeamento → pilares IVO" e itens: referência, não metodologia aprovada.

## Prova integrada · pilha descartável `vitalos-q1q2-integ` · 19/11/2026

Candidato de código: `19b1a9f` + correção do defeito abaixo. Stack institucional preservado (não tocado). Fixture do Q1 do Codex não tocada.

**Pilha.** CLI 2.119.0 sem opção de host/binding (`start --help` e `config.toml`). Compose dedicado (`scripts/integ-local/`) com as mesmas imagens da CLI. Antes da primeira escrita: projeto `vitalos-q1q2-integ`, 5 containers do projeto, bindings efetivos `db 127.0.0.1:57922`, `kong 127.0.0.1:57921`, `mailpit 127.0.0.1:57924`, auth/rest sem porta publicada (`guard.sh`). Segredo JWT e chaves geradas localmente, não impressas. Cadeia: **70 migrations aplicadas** com as compensações de `supabase/local/lineage/` (duas exclusões históricas). App do candidato em `127.0.0.1:8094`, preflight `local/local`.

**SQL.** `10_q2_ledger_actor_scope.sql`: **18/18**, incluindo os dois casos do SST (recusado em `record_evidence`; não elegível como responsável). Sem resíduo.

**Navegador (login normal por link mágico do Mailpit da pilha).** Preparação de empresas, primeiro RH, módulos, onda/setor/respostas e convites feita por chamadas HTTP às server functions do candidato (nível API).

| Persona | Resultado observado |
| --- | --- |
| `/entrar` | responde com o formulário de link mágico |
| Plataforma | designou o SST da Norte como revisor técnico Q1 do ciclo 2026-T4 ("Revisor designado.") |
| RH Norte · Q1 | registrou o comunicado ("Registro salvo no ciclo 2026-T4", revisão 1) e encaminhou a revisão 1 |
| SST Norte · Q1 | após a correção, leu e registrou a devolução (`review_recorded`); área de preparação continua fechada para ele |
| SST Norte · Q2 | `/ivo-integral/acoes` → "Acesso não autorizado", sem ações |
| RH Norte · Q2 | plano 2026-T4: "Pessoa responsável" oferece só RH e a liderança (nem SST nem colaborador); designou a liderança; ativou |
| Liderança Norte | estado → em execução e evidência de execução; sem aprendizagem; log com `LIDER_EQUIPE` |
| Colaborador Norte | devolutiva coletiva com título (pós-aviso), setor, fator, estado, prazo, "execução registrada", "Eficácia ainda não avaliada"; sem responsável, indicador ou evidência; revisão técnica Q1 negada |
| RH Sul (Q1 só) | preparação Q1 da Sul (revisão 0, campos vazios; nenhum dado da Norte); `/ivo-integral/q2` e `/acoes` → "Módulo indisponível para esta empresa" |
| RH Norte · novo login | Q1 "Revisão 1 · Devolução registrada" com a justificativa; Q2 plano ATIVO, ação em execução com evidência |

Releitura independente (`READ ONLY`, outro processo): Norte `Q1=true Q2=true`, 1 evento de preparação, revisão `assign,submit,respond:review_recorded`, 1 plano ativo, 1 ação, log `evidence_recorded:LIDER_EQUIPE,status_change:LIDER_EQUIPE`; Sul `Q1=true` e nenhum dado Q2.

**Defeito comprovado e corrigido (código do Q1).** `src/lib/api/q1-technical-review.functions.ts` chamava `authorizeIvoSession(accessToken)` (padrão só-administrador) nos comandos de membro: o SST designado recebia `{"status":"forbidden"}` antes da RPC `q1_technical_review`, que já aplica a regra completa (RH/delegado para ler e encaminhar; só o SST designado para devolver). Correção de uma linha: `authorizeIvoSession(accessToken, undefined, { allowMember: true })`; a org continua vindo da sessão e precisa bater com `expectedScope`. Verificado no navegador que o colaborador continua negado. Teste de regressão em `q1-q2-contract.test.ts`. **Requer revisão do Codex** (dono do Q1). Possível mesma classe de defeito para delegados da preparação (não verificado).

**Gate após a correção:** `bun run gate` 4.544 aprovados (4.541 + 3), paridade, TypeScript, secret-scan.

**Não coberto no navegador:** retry/idempotência (coberto por testes de serviço); delegação da preparação Q1; plano encerrado nesta pilha; 320/390 px nesta pilha. Releitura e persistência cobertas por novo login e SQL independente.
