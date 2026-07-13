# BASELINE TÉCNICO — Cópia VitalOS (game.felicidade@gmail.com)

**Data:** 2026-07-13
**Executor:** Claude Code, conta `game.felicidade@gmail.com`
**Branch de validação:** `claude/handoff-validation-vitalos-julho` (criada a partir de `main` limpa)

Este documento registra apenas conclusões obtidas por comando executado nesta sessão,
com evidência `arquivo:linha` ou saída de terminal. Não reproduz os relatórios anexados.

---

## 1. Git e repositório

| Item | Resultado | Evidência |
|---|---|---|
| `origin` | `https://github.com/minhafelicidadebr/vitalos-minha-felicidade-julho.git` (fetch+push) | `git remote -v` |
| Remote de escrita para o repo original | Nenhum encontrado | `git remote -v` |
| Árvore de trabalho | Limpa no clone (`## main...origin/main`, sem arquivos modificados) | `git status --short --branch` |
| Branch original | `main`, sincronizada com `origin/main` | `git branch --show-current` |
| Commit baseline | `ad4b45d` "Update site info for publish" | `git log -1 --oneline` |
| Tags | Nenhuma tag no repositório | `git tag --sort=-creatordate` (vazio) |
| Branch de validação | `claude/handoff-validation-vitalos-julho`, criada a partir de `ad4b45d` | `git switch -c ...` |

**Últimos 15 commits (main):**
```
ad4b45d Update site info for publish
4a9674d Lovable update
d075aeb Work in progress
51fe08e Add integration configuration from remix
72af3e4 feat(proof): Selo Empresa Viva REAL
d092a10 feat(academia): Loop Vivo (I3) e Circulos Vivos (I5) REAIS
095f937 docs: corrige comentario desatualizado em /vitrine
5cad13a feat(nr1): Expedicao contra a Drenagem REAL — I4
bf9d702 feat(academia): formacao bilateral REAL da Dupla de Pratica
9df2d63 Adicionou pair_directory_entries
9281f7c Changes
ea58486 fix(cloud): restaura types.ts — regeneracao automatica do Lovable zerou o arquivo
d414f47 Regenerated Supabase types
b576408 Changes
80f20ba Changes
```

Nenhuma ação destrutiva (push, PR, merge, tag, release) foi executada.

---

## 2. Varredura de referências antigas

| Busca | Resultado | Classificação |
|---|---|---|
| `dxifasbvmxgzmgzdlpql` (Supabase antigo) | 0 ocorrências | Limpo |
| `agencia9.17` (conta antiga) | 0 ocorrências | Limpo |
| `vitalos.git` | `CLAUDE.md:45` — "Repositório oficial" aponta para `minhafelicidadebr/vitalos.git` | **Histórica/documental** — descreve a linhagem do projeto (repo de origem), não é usada por nenhum client Supabase/config operacional. Está desatualizada (deveria referenciar o repo atual) mas não representa risco operacional. |
| `vitalos-org-fable5` (terceiro nome de repo, de uma passagem de bastão anterior) | `HANDOVER_OPUS48.md` (3x) e `docs/PLANO_OPERACIONAL_TOT_ESTADO_DA_ARTE.md` (3x) | **Histórica/documental, obsoleta** — `HANDOVER_OPUS48.md` descreve um estado de projeto (493 testes, Sprints 8-12 pendentes) muito anterior ao estado real atual (2007 testes, backend já implementado). Não confiar nesse documento para status atual. |
| `VITE_` | 12 arquivos, todos config-shaped (client Supabase, vite.config, .env.example, testes) | Configuração válida |
| `SUPABASE` | 7 ocorrências, todas em nomes de variável/config | Configuração válida |
| `.env` real commitado | Não existe. Só `.env.example` (sem valores). `.env` e `.env.*` no `.gitignore` | Limpo |

Nenhum secret, token ou chave completa foi exibido nesta sessão.

---

## 3. Confirmação Supabase da cópia

| Item | Resultado | Evidência |
|---|---|---|
| `project_id` em `supabase/config.toml` | `shlmzzchddohaytfakol` (novo projeto esperado) | `supabase/config.toml:1` |
| Projeto antigo (`dxifasbvmxgzmgzdlpql`) referenciado em algum lugar do código | Não | Varredura acima |
| Acesso autenticado ao Supabase CLI nesta sessão | **BLOQUEADO** — `LegacyPlatformAuthRequiredError: Access token not provided` | `bunx supabase projects list` |

Todos os itens que exigem sessão autenticada (migrations aplicadas remotamente, tabelas/views/RPCs
vivas, RLS ativa no banco real, grants, redirects de auth, Edge Functions, storage) ficam
classificados como `BLOCKED` — não foi presumido sucesso.

### 3.1 O que foi possível validar localmente (sem autenticação)

| Item | Resultado | Evidência |
|---|---|---|
| Migrations presentes | 36 arquivos `.sql`, nomeados com timestamp crescente, sem timestamps duplicados | `ls supabase/migrations` |
| Ordem das migrations | Consistente cronologicamente pelo prefixo do nome de arquivo | Inspeção da listagem |
| `supabase/functions/` (Edge Functions) | Não existe no repositório — a camada servidor roda como TanStack Start server routes (`*.server.ts`/`*.functions.ts`), não como Supabase Edge Functions clássicas | `ls supabase/functions` → erro "no such file" |
| Tabelas criadas pelas migrations | 28 tabelas (`CREATE TABLE`) | grep em `supabase/migrations/*.sql` |
| `ENABLE ROW LEVEL SECURITY` | 33 ocorrências em 36 arquivos de migration | grep em `supabase/migrations/*.sql` |
| Tabelas tipadas em `src/integrations/supabase/types.ts` | 17 de 28 (11 tabelas sem tipagem gerada) | Extração do bloco `Tables: {` (linhas 16–782) |
| Tabelas não tipadas E usadas em código de produção | **Todas as 11** são referenciadas em pelo menos 1 arquivo não-teste: `action_items`, `action_log`, `action_plans`, `devolutiva_sessions`, `esg_report_snapshots`, `evidence_records`, `item_funnel_events`, `org_cycle_registry`, `personal_assessments`, `sm2_card_state`, `victory_records` | grep por nome de tabela em `src/**/*.ts(x)` excluindo testes; exemplo confirmado: `src/lib/api/action-plan.server.ts:232` chama `.from("action_items")` |

**Nota de severidade (P1, lente 1/2):** consultas a essas 11 tabelas rodam sem checagem de tipo
TypeScript contra o schema real — o RLS no banco continua sendo a barreira de segurança (não afetada
por isso), mas erros de coluna/tipo nessas tabelas não são pegos em `tsc --noEmit`. A comparação de
fidelidade já apontava esse gap (relatava ~10 tabelas não tipadas); nesta sessão a contagem exata é 11.

---

## 4. Gates executados

Package manager confirmado pelo lockfile (`bun.lock`, único lockfile) e pela doutrina (`CLAUDE.md`:
"SEMPRE bun — nunca npm/yarn"). Nenhuma substituição de gerenciador foi feita.

| Comando | Status | Resultado principal | Correção necessária |
|---|---|---|---|
| `bun install --frozen-lockfile` | **PASS** | 542 pacotes instalados em 49,6s | — |
| `bun run test` (`bun test src`) | **PASS** | 2007 pass / 0 fail / 6005 `expect()` / 192 arquivos, 4,95s. Linhas `[ops-events] falha ao gravar evento ...` são saída esperada de testes que exercitam o caminho de degradação graciosa da telemetria — não são falhas. | — |
| `bun run parity` | **PASS** | "Paridade de schema OK — todo uso do código tem definição versionada." | — |
| `bunx tsc --noEmit` | **FAIL** | 3 erros `TS2741` — `Property 'preconnect' is missing in type '...' but required in type 'typeof fetch'` | `src/integrations/supabase/auth-middleware.ts:14`, `src/integrations/supabase/client.server.ts:13`, `src/integrations/supabase/client.ts:10`. Correção mínima: a função retornada por `createSupabaseFetch` precisa satisfazer o tipo `typeof fetch` completo (ex.: tipar como `(...) => Promise<Response>` em vez de `typeof fetch`, ou adicionar um stub `preconnect`). |
| `bun run lint` (ESLint + Prettier) | **FAIL** | 116.838 problemas, quase todos `Delete '␍'` (prettier/prettier) — terminador de linha CRLF | Causa raiz identificada: o blob commitado é LF puro (`git show HEAD:vite.config.ts \| grep -c $'\r'` = 0), mas `core.autocrlf=true` neste ambiente Windows converte para CRLF no checkout (`file vite.config.ts` confirma "CRLF line terminators"). **Não é um defeito do repositório commitado** — é ausência de um `.gitattributes` que force `eol=lf` independentemente da configuração local do contribuidor. Já registrado como P1-03 em `docs/AUDITORIA_DE_PRODUCAO_VITALOS_G1.md:51-57`; esta sessão confirma a causa raiz exata. |
| `bun run build` (`vite build`) | **PASS** | Build completo em ~2,12s (etapa Vite) / ~31,9s wall-clock total, `.output/` gerado, sem erros | — |
| `bun run gate` (`bun test src && bun run parity && bunx tsc --noEmit`) | **FAIL** | Falha por causa exclusiva do `tsc --noEmit` acima — `test` e `parity` internos passam | Mesma correção do item `tsc` acima |

**Divergência da doutrina local:** `CLAUDE.md` afirma "TypeScript strict sem erros de build" (linha
141) e "Build verde ANTES de qualquer commit" como regra inviolável (`CLAUDE.md:276`,
`HANDOVER_OPUS48.md:200`). O estado atual do `main` não satisfaz essa regra — o gate oficial falha.
Isso não bloqueia `vite build` (que não roda `tsc` como etapa), mas bloqueia o gate de qualidade
que a doutrina exige antes de commit.

---

## 5. Doutrina local

| Regra local | Fonte | Impacto no desenvolvimento | Validação |
|---|---|---|---|
| Package manager sempre `bun`, nunca npm/yarn | `CLAUDE.md:75` | Todos os comandos de gate/instalação devem usar `bun`/`bunx` | Confirmado — único lockfile é `bun.lock` |
| `engine/` nunca importa de `domain/` | `CLAUDE.md:263`, `HANDOVER_OPUS48.md:201` | Invariante arquitetural; qualquer nova feature deve respeitar a separação engine puro / domain (pack) | Não re-auditado exaustivamente nesta sessão (não houve alteração de código); é invariante estrutural, não staterelacionado ao handoff |
| k-anonymity ≥ 5 (≥10 em VIA-T) | `CLAUDE.md:266`, `HANDOVER_OPUS48.md:203` | Nenhum recorte de grupo pequeno pode ser exibido | Presente na doutrina; validação viva depende de acesso ao banco (BLOCKED) |
| Domínio A ≠ Domínio B, estritamente separados | `CLAUDE.md:270`; skill `nr1-copsoq-defensibility-guard/SKILL.md` | Nenhuma feature de risco (NR-1/COPSOQ) pode se misturar com florescimento (IVO/PERMA) | Confirmado no código: `src/engine/nr1/crosswalk-engine.ts:2,11,41,144` documenta a separação e marca desfechos como `isOutcome`, nunca como driver |
| Disclaimers obrigatórios (IVO "experimental"; Domínio B "educativo, não substitui profissional") | `CLAUDE.md:271` | Toda tela de risco/medição precisa do disclaimer verbatim | Não reauditado tela a tela nesta sessão (herdado do relatório anexado, não recontado) |
| WCAG 2.2 AA / A11yProvider não pode ser removido | `CLAUDE.md:273` | Toda mudança de UI deve preservar `A11yProvider`/`A11yMenu` | Confirmado presentes: `src/app/shell/A11yProvider.tsx`, `src/app/shell/A11yMenu.tsx`; 853 ocorrências de atributos `aria-*` em `.tsx` (contagem idêntica ao relatório anexado) |
| Toda tela nova — 4 estados (vazio/carregando/erro/mobile) | `CLAUDE.md:274` | Critério de aceite para qualquer rota nova | Doutrina de projeto; skill dedicada `ux-ix-premium-accessibility-guard` |
| Build verde antes de qualquer commit | `CLAUDE.md:276`, `HANDOVER_OPUS48.md:200` | Nenhum commit deveria ser feito com gate quebrado | **Em conflito com o estado atual do `main`** — `bun run gate` falha por `tsc`. Registrado como divergência acima, não como violação desta sessão (nenhum commit foi feito). |
| Nunca push na `main` sem confirmação explícita a cada push | `CLAUDE.md:35-36` | Toda mudança de código deve passar por branch e pedido de confirmação | Respeitado nesta sessão — nenhum push foi feito |
| Nunca tocar produção (migration/seed/deploy) sem pedido explícito | `CLAUDE.md:37` | Nenhuma migration remota foi aplicada | Respeitado — Fase 1 ficou `BLOCKED` em vez de presumir sucesso |
| Skill `supabase-rls-security-definer-auditor` (projeto) | `.claude/skills/supabase-rls-security-definer-auditor/SKILL.md` | Rege qualquer migration/RLS/RPC/GRANT futuro | Carrega automaticamente quando se edita SQL — não invocada nesta sessão porque nenhuma migration foi escrita |
| Skill `nr1-copsoq-defensibility-guard` (projeto) | `.claude/skills/nr1-copsoq-defensibility-guard/SKILL.md` | Proíbe claim de conformidade automática, mistura Domínio A/B, ranking individual | Relevante para a Onda de defensabilidade regulatória (ver plano de próxima onda) |
| Skill `ai-governance-edge-wrapper` (projeto) | `.claude/skills/ai-governance-edge-wrapper/SKILL.md` | Rege qualquer feature em `src/engine/ai/` ou `src/lib/ai/` | Relevante para a Onda 5 (FlorescerIA real) |

**Conflito de segurança/privacidade a explicitar:** nenhum encontrado nesta sessão — a doutrina local
não colide com nenhuma recomendação dos relatórios anexados; ambos convergem (k-anon, separação de
domínios, ausência de LLM no cliente).

---

## 6. Inventário técnico reproduzido nesta sessão

| Métrica | Valor medido agora | Valor no relatório anexado (`AVALIACAO_PREMIUM`) | Observação |
|---|---|---|---|
| Arquivos `.ts`/`.tsx` em `src/` | 700 | 700 | Idêntico |
| Rotas `.tsx` em `src/routes/` | 81 | 81 | Idêntico |
| Arquivos de teste (`.test.ts(x)`) | 192 | 192 arquivos | Idêntico |
| Testes executados (`bun test src`) | **2007** | não executado no ambiente da auditoria anterior | Nova evidência — confirma que o gate roda e passa |
| Migrations Supabase | 36 | 36 | Idêntico |
| Módulos `.server.ts` | 57 | 57 | Idêntico |
| Wrappers `.functions.ts` | 44 | 44 | Idêntico |
| Documentos em `docs/*.md` | 53 (topo) | 54 | Diferença pequena, provavelmente contagem de subpastas (`ADR/`, `instrumentos/`) tratada diferente |
| Rotas que importam `src/mocks` diretamente | **61/81** | 54/81 | **Divergência real** — contagem própria com `grep -rlE "from ['\"](\.\./)*mocks/\|from ['\"]@/mocks"` encontrou 61 arquivos de rota com import direto de mock, não 54. Não invalida a conclusão (P0 de hibridismo demo/real segue confirmado), mas o número correto e reproduzível nesta cópia é 61. |
| Tabelas Supabase tipadas | 17/28 | "melhorou de 15 para 18" | Contagem própria: 17 tabelas no bloco `Tables:` de `types.ts`; método de contagem pode diferir levemente do relatório anexado, mas a conclusão (gap real de tipos) é a mesma |

---

## 7. Comandos de retomada

```bash
git clone https://github.com/minhafelicidadebr/vitalos-minha-felicidade-julho.git
cd vitalos-minha-felicidade-julho
git checkout claude/handoff-validation-vitalos-julho   # ou main, se a branch não foi enviada
bun install --frozen-lockfile
bun run gate     # hoje falha por 3 erros TS2741 nos clients Supabase — ver seção 4
bun run build    # passa mesmo com o gate quebrado
```

Para autenticar no Supabase (necessário para desbloquear a Fase 1 completa):
```bash
bunx supabase login
bunx supabase projects list
bunx supabase link --project-ref shlmzzchddohaytfakol
bunx supabase db diff --linked   # comparar migrations locais vs. remoto aplicado
```
