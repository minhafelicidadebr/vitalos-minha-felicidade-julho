# Checklist de liberação · piloto operacional do Q2 no Instituto Felicidade para Todos

**Estado:** rascunho de 23/11/2026, sobre a `main` `37a89ca` (merge do #64); atualizado no mesmo dia com os achados dos PRs #67, #68, #69 e #72 (abertos, **não mesclados**). **O piloto não está pronto para operação.** Este checklist consolida o que já existe em `MO4_OPERACAO_E_LIBERACAO_2026-11-21.md`, `Q2_PILOT_SCOPE_2026-11-16.md` e `CONTINUIDADE.md`; não cria decisão nova.

**Legenda:** ✅ provado (com evidência) · ⏳ pendente (dependência técnica) · 🟡 **PROPOSTA PENDENTE** (exige aprovação do proponente ou do Instituto; nenhuma aprovação foi dada além das já registradas em `APROVACAO_FORMULARIOS_PILOTO_INSTITUTO_2026-11-21.md` e `PLANO_INSTITUTO_GROWTH_2026-11-21.md`) · ⛔ bloqueio metodológico mantido.

**Quem decide (conforme `MO4_OPERACAO_E_LIBERACAO_2026-11-21.md` §3, ainda como proposta):** finalidade e medidas do piloto, proponente; comunicação, proponente e Instituto; coorte, período, papéis, responsável operacional, dados, retenção e descarte, Instituto (controlador); suporte e critérios de pausa, responsável operacional (**ainda sem nome**); recuperação, proponente. Plano Growth: já decidido em 21/11.

## 1. Pré-condições técnicas e ambientais

| # | Pré-condição | Estado | Evidência ou o que falta |
|---|---|---|---|
| T1 | Código do Q2 na `main` e gate verde | ⏳ reconferir | Em `37a89ca`, o gate 4698/0 do candidato `e70298b` valia (nenhum arquivo fora de `docs/` diferia). **A `main` avançou para `4b2b7c9`** com código novo (#66 guia de perfis do Q2; #70 e #71 proposta à ISG), sem mudança em `supabase/` nem em `docs/vitalos/piloto/` (conferido em 23/11). O gate de `e70298b` **não cobre** mais a `main`: reconferir antes de liberar |
| T2 | Jornada Q2 provada em banco descartável | ✅ | `scripts/integ-local/mo2-journey.ts`: 54 verificações, 0 falhas; `provas/JORNADA_Q2_INTEGRADA_2026-11-22.txt` |
| T3 | Função de assentos presente no banco do projeto | ✅ | Catálogo de funções em 22/11: 1 assinatura, 7 argumentos |
| T4 | Permissões da função conferidas | ✅ | `anon` e `authenticated` sem EXECUTE; `service_role` com |
| T5 | Migration no histórico `supabase_migrations.schema_migrations` | ⛔ não aplicável por ora | Ausente (aplicada por consulta direta). Não alterar sem procedimento oficial compatível com o Lovable |
| T6 | Créditos do Lovable para novo build | ⏳ | Workspace em 0; renovação estimada ~26/11. Sem top-up |
| T7 | Build de produção com sucesso | ⏳ | Depende de T6. Build local de `0cf588b` passa; log do Lovable indisponível |
| T8 | Publicação do commit atual | ⏳ | Só com instrução direta do proponente |
| T9 | **Convite de ponta a ponta no app publicado** | ⏳ **não testado** | Roteiro nível 2 em `ROTEIRO_TESTE_CONVITE_ORG_FICTICIA_2026-11-23.md`; depende de T6–T8 e de autorização para organização de teste |

T3 e T4 não provam T9: função presente e permissões certas não demonstram que o fluxo real funciona.

## 2. Escopo, papéis e responsável

| Item | Registro | Estado |
|---|---|---|
| Organização e plano | Instituto Felicidade para Todos, no plano Growth (até 5 administradores; FIB-T permitido) | ✅ escolhidos pelo proponente em 21/11 (`PLANO_INSTITUTO_GROWTH_2026-11-21.md`). Vale só para a organização e o plano |
| Delimitação do piloto (PIL-01) | Finalidade, coorte e período | 🟡 **pendente**, conforme `Q2_PILOT_SCOPE_2026-11-16.md` (PIL-01 "Pendente de delimitação"). Os valores das seções 3 e 4 (8–15 pessoas, 6 semanas) são propostas, não decisões |
| Escopo por lente | Q2 completo; Q1 só preparação; Q3 só prática educativa; Q4 e Q5 fora | 🟡 proposta |
| Papéis | 1 RH_ADMIN, liderança responsável pelas ações, colaboradores; SST só com responsável competente (Q1 preparação) | 🟡 proposta |
| **Responsável operacional** | **[sem nome — decisão do proponente e do Instituto]** | 🟡 pendente |
| Suporte | Canal de dúvidas, resposta em até 2 dias úteis, registro de cada dúvida e erro | 🟡 proposta |

## 3. Finalidade, privacidade e dados

| Item | Registro | Estado |
|---|---|---|
| Finalidade | Verificar a **operação** da jornada Q2 (tarefas, dúvidas, erros, continuidade). **Não alega eficácia**; avaliação de eficácia exige desenho próprio | 🟡 proposta |
| Coorte | Equipe interna, 8–15 pessoas | 🟡 proposta |
| Limiar de publicação | Nenhum recorte com menos de 5 respostas (regra do produto) | ✅ provado: setor com 4 respostas não publica, inclusive pela API (MO2 X3) |
| Quórum da cerimônia | 5 presentes é regra separada; a cerimônia está **desligada** (capacidade `DEVOLUTIVA`) e não faz parte do piloto | ✅ regra no código; ⏳ ligar é decisão de produto |
| Acesso | Colaborador vê só devolutiva coletiva e as próprias práticas; liderança só as próprias ações; SST sem acesso ao ledger Q2; outra organização sem acesso | ✅ provado em banco descartável e no navegador (MO2 X1, X2, X8; MO4) |
| Retenção | Prazo adotado pelo Instituto: **a definir**. O catálogo de planos declara `capsuleRetentionMonths` = 12 para o Growth, mas **nenhum código ou migration lê esse valor** (busca em `src/` e `supabase/migrations/`, 23/11): é número declarado, **não é expurgo aplicado** e não deve ser apresentado como política | 🟡 pendente (PIL-04, controlador: o Instituto) |
| Descarte | A RPC `erase_my_assessments` (verificada em `20260706110000_personal_assessments.sql`) apaga **só** as autoavaliações pessoais do próprio usuário (`personal_assessments`, Cofre Pessoal). **Não cobre** respostas FIB-T, ledger, planos ou evidências do piloto. Para esses dados, o procedimento de descarte **não existe** hoje no repositório. **Ensaio local (PR #69):** apagar uma organização é bloqueado por gatilhos de integridade (`first_admin_invites` imutável; gatilho de módulo diferido no ledger e nas ondas); `ops_events` não tem chave estrangeira e ficaria órfã. Caminhos: M1 (desabilitar gatilhos, DDL controlado) ou M2 (rotina oficial, desenho no PR #72) | 🟡 pendente (PIL-04): decisão do Instituto (opção A, B ou C, PR #68) e do proponente (M1 ou M2) |
| Comunicação | Participação voluntária, saída livre, canal de dúvidas; versão do comunicado e responsável a fixar | 🟡 pendente (PIL-03) |

## 4. Critérios operacionais

| Momento | Critério | Estado |
|---|---|---|
| **Iniciar** | T1–T4 ✅; T7–T9 ✅; responsável operacional nomeado; pacote aprovado; D10 (Q2) estendida ao piloto (PIL-07); comunicado enviado; plano Growth ativo na organização | 🟡 proposta |
| **Pausar** | Qualquer dado de grupo com menos de 5 exibido; acesso indevido entre perfis ou organizações; perda de registro; falha recorrente de convite ou login | 🟡 proposta |
| **Corrigir** | Reproduzir no menor caminho em banco descartável, corrigir em branch própria com teste de regressão, repetir só a verificação afetada e retomar do ponto | 🟡 proposta |
| **Encerrar** | Fim das 6 semanas propostas, ou pausa não resolvida; registrar medidas e pendências; sem alegar efeito | 🟡 proposta |
| **Recuperação** | Reversão do código por PR; função de assentos removível (migration nova); republicação da versão anterior (MO4 §3) | 🟡 proposta (decide o proponente) |

## 5. Evidências a coletar e como cada uma será provada

| Evidência | Prova | Quando |
|---|---|---|
| Convite → aceite → perfil por papel | Roteiro nível 2 (organização de teste) antes de qualquer convite real; depois, contagem por papel em leitura | Antes de iniciar |
| Leitura agregada publicada com 5 ou mais | Estado "publicada" da leitura Q2; nenhum recorte menor visível | Semanas 1–2 |
| Plano com responsável, prazo e indicador | Plano ativo; ação com os três campos | Semana 3 |
| Execução registrada pela liderança | Estado da ação e evidência de execução; "eficácia não avaliada" visível | Semanas 3–5 |
| Aprendizagem e revisão | Aplicação da prática aprovada e ajuste ligado à original | Semanas 3–5 |
| Devolutiva ao colaborador | Diário mostra a ação sem nomes nem conteúdo de evidência | Semana 6 |
| Medidas do piloto | Tarefas concluídas por papel, erros, dúvidas, tempo até a primeira ação registrada, continuidade semanal | Semanal |
| Evidência candidata ao Q5 | Execução registrada com eficácia "não avaliada" (composição real do Q5 segue fora) | Semana 6 |

## 6. Bloqueios metodológicos mantidos

| Lente | Bloqueio | O que o resolve |
|---|---|---|
| Q1 | Coleta bloqueada por construção (`method_pending`) | Ficha oficial da II-Br e permissão de uso (decisão do proponente) |
| Q3 | Mensuração bloqueada; unidade Vitalidade 001 aprovada só para escopo local | Ficha da fonte e autorização; extensão da aprovação ao piloto |
| Q4 | Leitura coletiva sem contrato; trabalho do Codex fora da `main` | PR do Codex e contrato próprio |
| Q5 | Sem modo real nem contrato do IVO | Contrato metodológico |

## 7. Decisões humanas necessárias, em ordem

1. Créditos do Lovable (renovação ou top-up) → T6.
2. Instrução direta para publicar → T8.
3. Autorização para a organização de teste e decisão sobre a limpeza: o ensaio local (PR #69) mostrou que ela **não** sai só "apagando a organização"; escolher M1, M2 (PR #72) ou manter a organização marcada como teste → T9.
4. Aprovar o pacote (seções 2–4) e **nomear o responsável operacional**.
5. Retenção e descarte pelo Instituto (PIL-04, opções A/B/C no PR #68) e mecanismo de descarte pelo proponente (M1 ou M2); comunicado (PIL-03), que não deve prometer descarte antes dessa decisão.
6. Estender a D10 (Q2) e a Vitalidade 001 (Q3) ao piloto (PIL-07).

## 8. Retomada do Lovable (quando os créditos voltarem)

**Registro do suporte (23/11):** o suporte do Lovable atribuiu o "Build malsucedido" ao saldo zerado de créditos. É a explicação dada pelo suporte; **não é prova da causa técnica específica** da falha. Sem créditos não há build novo nem log, então a causa **segue não verificada**. O que existe é evidência local, que não substitui o log do Lovable: `tsc --noEmit`, `bun run build` e o preflight de produção passam na árvore da `main`.

Sequência mínima de diagnóstico. Parar no primeiro passo que exigir decisão; nada abaixo roda sem a decisão correspondente da seção 7; nunca "Fix build", publicação ou top-up por iniciativa própria.

1. Ler (sem alterar) o saldo e o estado do projeto no Lovable. Se a ação seguinte exigir crédito e não houver, parar e pedir decisão.
2. Confirmar qual commit o Lovable enxerga e compará-lo com a `main` atual (última leitura: `0cf588b` em 22/11; não reverificado depois do #63, do #64 e dos merges seguintes até `4b2b7c9`).
3. Só com decisão do proponente de gastar créditos: **um** build do commit atual. Registrar o resultado e **obter o log completo**.
4. Build com sucesso: a explicação do suporte (créditos) fica como a mais provável, sem afirmar mais que isso. Seguir ao passo 6.
5. Build com falha: com o log em mãos, reproduzir localmente (`bun run build`, `tsc --noEmit`, preflight) **antes** de qualquer hipótese; corrigir o menor trecho em branch própria, com teste; "Fix build" só por decisão do proponente.
6. Reconferir a função `reserve_member_invite` (1 assinatura, 7 argumentos; só `service_role` executa). É leitura de catálogo, sem dados de pessoas.
7. Publicação **somente** com instrução direta do proponente.
8. Roteiro nível 2 (`ROTEIRO_TESTE_CONVITE_ORG_FICTICIA_2026-11-23.md`), só com a autorização específica da organização de teste e da limpeza.

## 9. Auditoria local do convite (23/11/2026, sem Lovable e sem banco remoto)

| Verificação | Resultado |
|---|---|
| Scripts `scripts/integ-local/` apontam só para loopback (`127.0.0.1`: API 57921, banco 57922, correio 57924, app 8094); nenhuma URL remota; `guard.sh` aborta se projeto, containers ou bindings divergirem; `reset.sh` recria a pilha sem volume nomeado | Confirmado por leitura; **não reexecutado** nesta etapa (sem mudança de código) |
| `member-invite.server.test.ts` cobre: papel não convidável e inventado, Piloto com 1 admin (colaborador passa, RH recusa), falha de leitura fail-closed, 2 emissões simultâneas com 1 assento, plano alterado entre leitura e reserva, convite pendente conta e expirado não conta, organização inexistente, token válido/usado/expirado/inexistente, mapeamento da RPC de aceite | Confirmado por leitura; 21/21 já rodados em 23/11 em `0cf588b` |
| Isolamento entre organizações no convite | Provado na jornada local (MO2). Na `main`, **não** há teste unitário de duas organizações; o **PR #67** (não mesclado) acrescenta 2 testes em `member-invite.server.test.ts` (23 pass, gate verde) |
| Nomes e papéis | `orgAdminRoles()` deriva do registry de packs (`orgAdminRole`, padrão `RH_ADMIN`) e é passado como `p_admin_roles`; a migration recusa lista vazia (`admin_roles_missing`) | Sem divergência |
| Limite do Growth | `plan-engine.ts`: Growth `maxAdminSeats` 5; Piloto 1; o servidor passa `p_max_admin_seats` (nulo = sem teto) | Sem divergência com os documentos |
| Mensagem de erro | `seat_quota_exceeded` → "Limite de administradores do plano atingido. Faça upgrade…" (`plan-engine.ts`), igual à usada pelo servidor; demais falhas → `SEAT_CHECK_UNAVAILABLE` | Sem divergência |
| Razões da RPC (`invalid_input`, `admin_roles_missing`, `org_not_found`, `plan_changed`, `seat_quota_exceeded`) | Todas caem em falha fechada ou na mensagem de upgrade no servidor | Sem divergência |

Nada disto prova o convite no app publicado (fato 4 da migration continua **não testado**).
