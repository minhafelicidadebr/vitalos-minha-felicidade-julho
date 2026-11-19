# VitalOS · Onda de fechamento do eixo Q2 · superprompt

Prompt inicial para Codex ou Claude Code. Preencha só o bloco de ativação. Substitui a ordem de `SUPERPROMPT_Q2_CONSOLIDACAO_2026-11-19.md` para as fatias restantes; C1 e C2 daquele prompt estão concluídas.

```text
AGENTE = CODEX | CLAUDE_CODE
FRENTE = Q2_FECHAMENTO
FASE = DESENVOLVIMENTO_LOCAL | INTEGRAÇÃO_LOCAL
BLOCO = B1 | B2 | B3   (um por sessão)
AUTORIZAÇÕES ADICIONAIS = nenhuma, salvo instrução expressa do operador
```

## 1. Ponto de partida (19/11/2026)

Branch `feat/claude-q2-perfis`, worktree `..\vitalos-claude-q2`, HEAD `0a96fc0`, base comum `16730dc` (checkout do Codex, sem commits Q1 novos na última leitura). Gate do último runtime: 4.504 aprovados, paridade, TypeScript, secret-scan (`88f76f6`).

| Perfil | Mensurar | Educar | Transformar | Evoluir | Prova |
| --- | --- | --- | --- | --- | --- |
| RH | leitura por setor | D10 | plano, designação de liderança, ativação | registros, encerramento | navegador Alfa/Gama/Delta |
| Liderança | negada (caminho ao Diário) | Diário | estado e execução só na própria ação | plano encerrado: **não provado** | navegador Gama/Delta |
| Colaborador | negada (caminho ao Diário) | Diário | devolutiva coletiva (C2) | — | navegador Alfa |

Registros: `docs/vitalos/Q2_PERFIS_COLABORADOR_2026-11-18.md`, `docs/vitalos/decisions/Q2_LEADER_SCOPE_PROPOSAL_2026-11-18.md`, `docs/vitalos/Q2_C1_HARNESS_2026-11-19.md`, `docs/vitalos/decisions/Q2_C2_COLLABORATOR_FEEDBACK_PROPOSAL_2026-11-19.md`.

Ensaio local (não reiniciar o stack): `scripts/institutional-app-port.ts --stack-root <checkout com .institutional-admin.local> --port 8092`; `scripts/institutional-tenant.ts provision|readback`. Tenants: Alfa (Q2 on, 5 ações), Beta (Q2 off), Gama (1 ação de `lider.gama`), Delta (1 ação com título visível). App `8091` é do checkout principal: não tocar.

## 2. Escolha (ToT, 0–50; Valor e Prova com peso duplo)

| Ramo | Valor | Prova | Risco | Custo | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| **Fechamento: completar → uma migration → integração** | 16 | 18 | 8 | 7 | **49** |
| Evoluir por comparação entre ondas | 18 | 8 | 4 | 4 | 34 |
| Escopo por setor/equipe | 14 | 8 | 5 | 3 | 30 |
| Próxima lente (Q3) | 12 | 6 | 6 | 4 | 28 |

Fator decisivo: duas dívidas impedem o Q2 de sair do stack local — o corte fixo `TITLE_VISIBLE_SINCE` (C2) e as RPCs do ledger sem checagem de papel. Ambas pedem migration; juntá-las numa só autorização e depois integrar consolida o eixo. Comparar ondas depende de decisão metodológica ainda não tomada (o produto não combina setores nem ondas numa média).

## 3. Blocos

**B1 · Completar sem migration** *(uma sessão; mesmos arquivos)*
- C3: `addFibtActionToPlan` (`fibt-plan-composition.server.ts`) aceita `ownerUserId` com a validação de `setFibtActionAccountability`; extrair a regra para uma função única usada pelos dois caminhos.
- C4: liderança em plano encerrado vê a própria ação só leitura, sem nenhum controle de escrita. Medir 320/390 px, foco e ordem de tabulação nas telas de escopo próprio e na devolutiva.
- Título: o texto sugerido do campo de título passa a `placeholder`, não valor inicial (causa do título embaralhado na Delta).
- Aceite: testes de serviço da designação no PI-13 (5 casos espelhados); prova na Gama com ação nova para `lider.gama`; prova de plano encerrado num tenant de ensaio criado pelo harness (encerrar plano é irreversível: nunca na Alfa).

**B2 · Uma migration, uma autorização** *(proposta + prova local; execução remota fora do escopo)*
- `action_items.title_visible_at timestamptz null`, preenchido pelo servidor quando o RH salva título com o aviso; a projeção C2 passa a usar a coluna e remove `TITLE_VISIBLE_SINCE`.
- `record_action_event`, `record_evidence`, `set_action_item_accountability`: verificar dentro da função que o ator pertence à org do item e que o papel permite a operação (RH; liderança só na própria ação e só execução/estado). Manter `service_role` como único `EXECUTE`.
- Entregar: migration, teste de schema/paridade, plano de rollback, prova no stack institucional local. Usar `supabase-rls-security-definer-auditor`.
- Aceite: testes negativos no banco (papel errado, org errada, liderança em ação alheia) e gate verde; nenhuma execução fora do stack local.

**B3 · Integração e pacote do comitê** *(fase `INTEGRAÇÃO_LOCAL`, Codex)*
- Revisar primeiro: `authorizeIvoSession` (`allowLeader`, `allowMember`), `IvoQ2Failure.memberPath`, `LoadFibtActionLoopOutcome.viewerScope/assignableLeaders`, `findItem.ownerUserId`, `setFibtActionAccountability.ownerUserId`, `loadMemberPlanFeedback`, `scripts-guard-coverage.test.ts`. Comparar com o delta Q1.
- Branch de integração local com proveniência; gate no SHA integrado; harness C1 contra o candidato; uma tabela única de provas (perfil × etapa × SHA × persona × resultado); checkpoint atualizado.

**Registrado para depois:** Evoluir por comparação entre ondas — exige decisão metodológica de João Paulo Brandão Barboza sobre comparar setores entre ondas sem revelar pessoas.

## 4. Invariantes

- `.q.out`, `.q.sql`, `.env*`, credenciais, dados reais: não abrir nem versionar. Só identidades `@institutional.test`.
- Papel, org e dono resolvidos no servidor; ação alheia responde como inexistente.
- k≥5 e lote protegido; nenhuma resposta individual no cliente.
- Execução ≠ aprendizagem ≠ eficácia ≠ impacto ESG; nenhuma tela afirma melhora.
- Sem push, merge remoto, deploy, migration fora do stack local, mudança de Access/domínio sem autorização específica.
- Commit só com o gate aplicável verde.

## 5. Economia de contexto

- Abrir com `git rev-parse --show-toplevel HEAD`, `git status --short --branch`, `git log --oneline 16730dc..HEAD`. Não reler o que este prompt fixa.
- Ler por símbolo (`grep -n` + janela de 30–60 linhas). Gate amplo só quando o runtime muda.
- Navegador: predicados booleanos via `javascript_exec`; capturas só para layout.
- Banco: só `BEGIN READ ONLY` com agregados; Mailpit pelo destinatário exato.

## 6. Passagem ao fechar cada bloco

```text
Agente / Bloco / Estado (aceito no escopo demonstrado | requer ajuste | depende de decisão)
Branch / SHA base / SHA entregue
Resultado observável e persona
Arquivos e contratos afetados; decisões e por quem
Verificações (comando, contagem, SHA, ambiente)
Limite ou decisão pendente, com responsável
Próxima ação única
```

## 7. Critério do comitê

Por bloco, com evidência: resolve tarefa real de um perfil nomeado; preserva os invariantes; distingue implementado, demonstrado e documentado; é reproduzível pelo harness no SHA citado; próxima ação proporcional. Veredito: **aceito no escopo demonstrado**, **requer ajuste** ou **depende de decisão identificada**.
