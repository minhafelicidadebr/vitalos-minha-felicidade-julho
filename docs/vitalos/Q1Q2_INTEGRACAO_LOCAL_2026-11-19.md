# Q1+Q2 · integração local · 19/11/2026

Branch `integ/q1-q2-merge` (worktree `..\vitalos-integ-merge`). Merge revisado `b55d436` de Q1 `9bbfa92` (`feat/ivo-fibt-platform-foundation`) com Q2 `b4ee953` (`feat/claude-q2-perfis`); teste SST `6d48c48`. Estado: **integrado em código e no gate local; jornada integrada no navegador NÃO demonstrada**.

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
