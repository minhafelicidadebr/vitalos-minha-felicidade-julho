# VitalOS · Onda de consolidação Q2 · superprompt

Prompt inicial para Codex ou Claude Code. Preencha só o bloco de ativação. O resto é contexto verificado, escolha de estratégia, fatias com aceite e regras de economia de contexto. Linguagem de evidência: "comprovado" só com prova citada.

```text
AGENTE = CODEX | CLAUDE_CODE
FRENTE = Q2_CONSOLIDACAO
FASE = DESENVOLVIMENTO_LOCAL | INTEGRAÇÃO_LOCAL
FATIA = C1 | C2 | C3 | C4 | C5 | C6   (uma por sessão, salvo ordem do operador)
AUTORIZAÇÕES ADICIONAIS = nenhuma, salvo instrução expressa do operador
```

## 1. Ponto de partida verificado (19/11/2026)

- Repositório `minhafelicidadebr/vitalos-minha-felicidade-julho`. Base comum `16730dc` (`feat/ivo-fibt-platform-foundation`, checkout do Codex, sem commits Q1 novos na última leitura).
- Frente Q2: branch `feat/claude-q2-perfis`, worktree `..\vitalos-claude-q2`, HEAD `36758b1`, 5 commits sobre `16730dc`:

| Commit | Entrega | Prova |
| --- | --- | --- |
| `78d39b1` | Colaborador recusado na leitura Q2 recebe caminho para `/diario` (só agregados k≥5); servidor segue negando | gate 4.470; navegador Alfa (colaborador, RH, sem vínculo; 320 px) |
| `0541a40` | Política pura `leader-scope-policy.ts` (escopo por responsabilidade) | 7 testes |
| `5fd0ee0` | Política ligada: `authorizeIvoSession(…, { allowLeader })`, leitura filtrada, estado e execução só na própria ação; aprendizagem e autoridade de plano com o RH | gate 4.481; navegador (liderança sem ação) |
| `441cd24` | S6 revisto: RH designa `LIDER_EQUIPE` da própria org como responsável (papel lido do banco) | gate 4.482; 5 testes de serviço |
| `36758b1` | Registro da prova completa na empresa fictícia Gama | navegador + leitura `READ ONLY` |

Registros: `docs/vitalos/Q2_PERFIS_COLABORADOR_2026-11-18.md` e `docs/vitalos/decisions/Q2_LEADER_SCOPE_PROPOSAL_2026-11-18.md`.

Stack local (não reiniciar): `project_id vitalos-institutional-first-admin`, API `127.0.0.1:57621`, DB `57622`, Mailpit `57624`; app do checkout principal em `8091` (não tocar); app do worktree Q2 sobe em `8092` por wrapper que valida o alvo com `institutionalEnv()`. Tenants fictícios: **Alfa** (Q2 on, plano 2026-T4 ativo com 5 ações), **Beta** (Q2 off), **Gama** (Q2 on, 1 setor publicado n=5, plano 2026-T4 ativo com 1 ação de `lider.gama`). Personas: RH Alfa/Beta/Gama, `colaborador.alfa`, `lider.alfa` (sem ação), `lider.gama` (com ação), `wrong` (sem vínculo).

## 2. Lacunas reais (do código, não do roadmap)

1. **Reprodutibilidade.** O provisionamento da Gama e o wrapper 8092 vivem no scratchpad do agente. Um revisor não reproduz a prova a partir do repositório.
2. **Colaborador sem devolutiva da transformação.** Ele chega ao Diário, mas não vê *o que a organização está fazendo* com o resultado coletivo. O ciclo Mensurar→Transformar não fecha para quem respondeu.
3. **Inclusão em plano ativo (PI-13)** ainda designa sempre o próprio RH (`addFibtActionToPlan` em `fibt-plan-composition.server.ts`).
4. **Evoluir para a liderança.** Plano encerrado é legível pela política, mas a tela não foi provada nesse estado; a liderança não vê o próprio histórico entre ciclos.
5. **Acessibilidade e tela estreita** das telas da liderança (`/ivo-integral/acoes` escopo próprio) sem prova a 320/390 px e por teclado.
6. **Integração.** `authorizeIvoSession`, `ivo-views.ts` e `fibt-action-loop.server.ts` são superfícies compartilhadas com qualquer trabalho Q1 que toque a sessão IVO; o delta Q2 ainda não foi revisado contra o delta Q1.
7. **Defesa em profundidade.** As RPCs do ledger são `service_role` sem checagem de papel; toda a autorização está no servidor da aplicação. Aceitável e documentado, mas é o ponto que um comitê de segurança vai perguntar.

## 3. Escolha da estratégia (ToT)

Notas 0–10; em custo, risco e complexidade, maior = mais favorável. Peso duplo em **Prova** (reprodutível por terceiro) e **Valor** (tarefa real de um perfil).

| Ramo | Valor×2 | Prova×2 | Segurança | Custo | Risco | Alinhamento | Tempo até valor | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **A. Consolidar: harness reprodutível → a11y → integração**, com C2/C3 como fatias de valor | 16 | 20 | 9 | 8 | 9 | 10 | 8 | **80** |
| B. Abrir já a devolutiva do colaborador (C2) antes do harness | 18 | 10 | 7 | 6 | 6 | 9 | 7 | 63 |
| C. Hardening no banco (checagem de papel nas RPCs, migration) primeiro | 8 | 14 | 10 | 4 | 5 | 7 | 3 | 51 |
| D. Escopo por setor/equipe (tabela de vínculo) | 14 | 8 | 6 | 3 | 4 | 6 | 3 | 44 |
| E. Integrar com Q1 agora, sem harness | 10 | 8 | 7 | 7 | 5 | 8 | 7 | 52 |

**Decisão: ramo A.** Fator decisivo: sem harness versionado, nenhuma prova desta frente é reproduzível pelo comitê nem pelo integrador — e toda fatia seguinte reaproveita o harness. C (migration) fica como recomendação registrada, não como fatia, até o operador autorizar migration. D é evolução, não consolidação.

## 4. Fatias (ordem recomendada, uma por sessão)

Cada fatia: hipótese → ponto do fluxo → critério de aceite → menor teste que prova → diff revisado → commit local coeso. Superfícies de coordenação (sessão IVO, papéis, migrations, `CHECKPOINT.md`, `routeTree.gen.ts`) exigem registro de motivo e impacto antes de editar.

**C1 · Harness de personas reprodutível** *(sem autorização nova; escreve só no stack local já autorizado)*
- Promover para `scripts/` (1) o wrapper do app em porta própria e (2) um provisionador idempotente de tenant fictício (`--tenant gama`), ambos chamando `institutionalEnv()` + `requireInstitutionalLocalTarget` antes de qualquer escrita, usando só o fluxo real (plataforma → primeiro RH → módulo por CAS → onda/setor/link → respostas sintéticas → convites de papel).
- Um `--readback` que imprime, sanitizado, papéis, módulos e contagens por tenant (`READ ONLY`).
- Aceite: rodar duas vezes não duplica nada; sem segredo no stdout; teste puro dos guards (alvo errado recusa antes de I/O); nenhum reset oferecido.

**C2 · Devolutiva coletiva da transformação para o colaborador** *(exige decisão de conteúdo antes do código)*
- Entregar primeiro um contrato de 1 página para o operador: o que o colaborador vê (proposta mínima: setor de origem publicado, fator, título e estado agregado das ações do plano ativo; nunca responsável nominal, evidência, nota ou setor com n<5), onde (`/diario` ou nova seção), e a microcopy de "mudança observada" sem promessa de impacto.
- Após aprovação: servidor por `resolveOrgMembership`, só plano ativo/encerrado, só ações com origem publicada; teste de não vazamento (sem `owner`, `evidence`, `contentRef`); UI com 4 estados.
- Aceite: login `colaborador.alfa` vê a devolutiva; Beta nada; recarga; payload sem campos proibidos.

**C3 · Designação em plano ativo (PI-13)**
- `addFibtActionToPlan` aceita `ownerUserId` com a mesma regra de `setFibtActionAccountability` (papel lido do banco, mesma org). Extrair a validação para uma função única usada pelos dois caminhos.
- Aceite: testes de serviço espelhando os 5 casos de designação; prova na Gama incluindo ação nova para `lider.gama`.

**C4 · Evoluir para a liderança + a11y/320 px**
- Provar no navegador: plano encerrado mostra a própria ação somente leitura; nenhuma escrita oferecida. Medir 320/390 px (largura útil = rolagem), foco visível, ordem de tabulação e alvos ≥44 px nas telas de escopo próprio e na recusa do colaborador.
- Aceite: tabela de medidas no registro; correções só do defeito comprovado.

**C5 · Integração local (Codex)** *(fase `INTEGRAÇÃO_LOCAL`)*
- Revisar primeiro: `authorizeIvoSession` (opção `allowLeader` só em load/status/evidência), `IvoQ2Failure.memberPath`, `LoadFibtActionLoopOutcome.viewerScope/assignableLeaders`, `findItem.ownerUserId`, `setFibtActionAccountability.ownerUserId`. Comparar com o delta Q1.
- Aceite: branch de integração local com proveniência dos commits; gate no SHA integrado; reexecução do harness C1 contra o candidato; checkpoint atualizado.

**C6 · Recomendação de defesa em profundidade** *(documento, sem migration)*
- Proposta de checagem de papel/escopo dentro de `record_action_event` / `record_evidence` / `set_action_item_accountability` (ator e papel como parâmetros verificados contra `profiles`), com plano de migration e rollback. Executar só com autorização explícita.

## 5. Invariantes (não negociáveis)

- `.q.out`, `.q.sql`, `.env*`, credenciais e dados reais: não abrir, não mover, não versionar. Só identidades `@institutional.test`.
- Papel, organização e escopo resolvidos no servidor; payload nunca escolhe org, papel ou dono. Ação alheia responde como inexistente.
- k≥5 e publicação em lote protegido; nenhum recorte revelador, nenhuma resposta individual no cliente.
- Execução ≠ aprendizagem ≠ eficácia ≠ impacto ESG. Nenhuma tela de colaborador ou liderança afirma melhora.
- Sem push, merge remoto, deploy, migration executada ou mudança de Access/domínio sem autorização expressa e específica.
- Commit só com o gate aplicável verde (`bun run gate` para runtime; para documento, links e afirmações conferidos).

## 6. Economia de contexto (tokens)

- Abrir sessão com 4 comandos: `git rev-parse --show-toplevel HEAD`, `git status --short --branch`, `git log --oneline 16730dc..HEAD`, `git worktree list`. Não reler o que este prompt já fixa.
- Ler por símbolo (`grep -n "export async function <nome>"` + janela de 30–60 linhas), nunca arquivo inteiro acima de 300 linhas.
- Gate amplo só quando o runtime muda; entre edições, `bun test <arquivo>` e `bunx tsc --noEmit`. Redirecionar saída longa para arquivo e filtrar `pass|fail|error`.
- Navegador: preferir `get_page_text`/`javascript_exec` com predicados booleanos a capturas de tela; uma captura só para evidência visual de layout.
- Banco: só `BEGIN READ ONLY … COMMIT` com colunas agregadas ou prefixos truncados.
- Links mágicos: buscar no Mailpit pelo destinatário exato (a busca do Mailpit casa substring).

## 7. Registro de passagem (ao fechar cada fatia)

```text
Agente / Fatia / Estado (aceito no escopo demonstrado | requer ajuste | depende de decisão)
Branch / Worktree / SHA base / SHA entregue
Resultado observável e persona que o demonstrou
Arquivos e contratos afetados; decisões tomadas e por quem
Verificações (comando, contagem, SHA, ambiente) e evidências reutilizadas
Limite conhecido ou decisão humana pendente, com responsável
Próxima ação única
```

## 8. Critério do comitê

Para cada fatia, o revisor responde com evidência: (1) resolve uma tarefa real de um perfil nomeado? (2) preserva os invariantes da seção 5? (3) distingue implementado, demonstrado e documentado? (4) é reproduzível pelo harness C1 no SHA citado? (5) a próxima ação é proporcional? Veredito: **aceito no escopo demonstrado**, **requer ajuste** (achado, arquivo, prioridade, condição de encerramento) ou **depende de decisão identificada** (quem decide, o quê, até quando).
