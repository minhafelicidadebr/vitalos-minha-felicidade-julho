# Checklist de liberação · piloto operacional do Q2 no Instituto Felicidade para Todos

**Estado:** rascunho de 23/11/2026, sobre a `main` `d816a9d`. **O piloto não está pronto para operação.** Este checklist consolida o que já existe em `MO4_OPERACAO_E_LIBERACAO_2026-11-21.md`, `Q2_PILOT_SCOPE_2026-11-16.md` e `CONTINUIDADE.md`; não cria decisão nova.

**Legenda:** ✅ provado (com evidência) · ⏳ pendente (dependência técnica) · 🟡 **PROPOSTA PENDENTE** (exige aprovação do proponente ou do Instituto; nenhuma aprovação foi dada além das já registradas em `APROVACAO_FORMULARIOS_PILOTO_INSTITUTO_2026-11-21.md` e `PLANO_INSTITUTO_GROWTH_2026-11-21.md`) · ⛔ bloqueio metodológico mantido.

## 1. Pré-condições técnicas e ambientais

| # | Pré-condição | Estado | Evidência ou o que falta |
|---|---|---|---|
| T1 | Código do Q2 na `main` e gate verde | ✅ | `main` `d816a9d`; gate 4698/0 no candidato `e70298b` (código idêntico) |
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
| Organização | Instituto Felicidade para Todos | ✅ escolhido pelo proponente (PIL-01) |
| Plano | Growth (até 5 administradores; FIB-T permitido) | ✅ decidido em 21/11 |
| Escopo por lente | Q2 completo; Q1 só preparação; Q3 só prática educativa; Q4 e Q5 fora | 🟡 proposta |
| Papéis | RH_ADMIN, liderança responsável pelas ações, colaboradores; SST só com responsável competente (Q1 preparação) | 🟡 proposta |
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
| Retenção | O plano Growth guarda cápsulas por 12 meses (configuração do produto). Prazo adotado pelo Instituto: **a definir** | 🟡 pendente (PIL-04, controlador: o Instituto) |
| Descarte | Existe no código a RPC `erase_my_assessments`; seu alcance para este piloto **não foi verificado** | 🟡 pendente (PIL-04) |
| Comunicação | Participação voluntária, saída livre, canal de dúvidas; versão do comunicado e responsável a fixar | 🟡 pendente (PIL-03) |

## 4. Critérios operacionais

| Momento | Critério | Estado |
|---|---|---|
| **Iniciar** | T1–T4 ✅; T7–T9 ✅; responsável operacional nomeado; pacote aprovado; D10 (Q2) estendida ao piloto (PIL-07); comunicado enviado; plano Growth ativo na organização | 🟡 proposta |
| **Pausar** | Qualquer dado de grupo com menos de 5 exibido; acesso indevido entre perfis ou organizações; perda de registro; falha recorrente de convite ou login | 🟡 proposta |
| **Corrigir** | Reproduzir no menor caminho em banco descartável, corrigir em branch própria com teste de regressão, repetir só a verificação afetada e retomar do ponto | 🟡 proposta |
| **Encerrar** | Fim das 6 semanas propostas, ou pausa não resolvida; registrar medidas e pendências; sem alegar efeito | 🟡 proposta |

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
3. Autorização para a organização de teste e sua limpeza → T9.
4. Aprovar o pacote (seções 2–4) e **nomear o responsável operacional**.
5. Retenção e descarte pelo Instituto (PIL-04); comunicado (PIL-03).
6. Estender a D10 (Q2) e a Vitalidade 001 (Q3) ao piloto (PIL-07).

## 8. Lista mínima de verificação quando os créditos voltarem

Ordem pensada para parar cedo e não gastar crédito à toa. Nada aqui é executado sem a decisão correspondente da seção 7.

1. Ler (sem alterar) o saldo e o estado do projeto no Lovable; se a ação seguinte exigir crédito e não houver, parar e pedir decisão.
2. Confirmar que o commit mais recente da `main` é o que o Lovable enxerga (hoje, última leitura: `0cf588b` em 22/11; não reverificado depois do #63).
3. Build com sucesso do commit atual. Se falhar, **obter o log** antes de qualquer hipótese ("Fix build" só por decisão do proponente).
4. Reconferir a função `reserve_member_invite` (1 assinatura, 7 argumentos; só `service_role` executa). É leitura de catálogo, sem dados de pessoas.
5. Publicação **somente** com instrução direta do proponente.
6. Roteiro nível 2 (`ROTEIRO_TESTE_CONVITE_ORG_FICTICIA_2026-11-23.md`), só com a autorização específica da organização de teste e da limpeza.

## 9. Auditoria local do convite (23/11/2026, sem Lovable e sem banco remoto)

| Verificação | Resultado |
|---|---|
| Scripts `scripts/integ-local/` apontam só para loopback (`127.0.0.1`: API 57921, banco 57922, correio 57924, app 8094); nenhuma URL remota; `guard.sh` aborta se projeto, containers ou bindings divergirem; `reset.sh` recria a pilha sem volume nomeado | Confirmado por leitura; **não reexecutado** nesta etapa (sem mudança de código) |
| `member-invite.server.test.ts` cobre: papel não convidável e inventado, Piloto com 1 admin (colaborador passa, RH recusa), falha de leitura fail-closed, 2 emissões simultâneas com 1 assento, plano alterado entre leitura e reserva, convite pendente conta e expirado não conta, organização inexistente, token válido/usado/expirado/inexistente, mapeamento da RPC de aceite | Confirmado por leitura; 21/21 já rodados em 23/11 em `0cf588b` |
| Isolamento entre organizações no convite | Provado na jornada local (MO2); **não** há teste unitário próprio de duas organizações em `member-invite.server.test.ts` |
| Nomes e papéis | `orgAdminRoles()` deriva do registry de packs (`orgAdminRole`, padrão `RH_ADMIN`) e é passado como `p_admin_roles`; a migration recusa lista vazia (`admin_roles_missing`) | Sem divergência |
| Limite do Growth | `plan-engine.ts`: Growth `maxAdminSeats` 5; Piloto 1; o servidor passa `p_max_admin_seats` (nulo = sem teto) | Sem divergência com os documentos |
| Mensagem de erro | `seat_quota_exceeded` → "Limite de administradores do plano atingido. Faça upgrade…" (`plan-engine.ts`), igual à usada pelo servidor; demais falhas → `SEAT_CHECK_UNAVAILABLE` | Sem divergência |
| Razões da RPC (`invalid_input`, `admin_roles_missing`, `org_not_found`, `plan_changed`, `seat_quota_exceeded`) | Todas caem em falha fechada ou na mensagem de upgrade no servidor | Sem divergência |

Nada disto prova o convite no app publicado (fato 4 da migration continua **não testado**).
