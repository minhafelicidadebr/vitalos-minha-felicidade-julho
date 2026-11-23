# Proposta · comunicado aos participantes (PIL-03) e opções de retenção e descarte (PIL-04)

**Estado: PROPOSTA PENDENTE, redigida em 23/11/2026.** Nada aqui foi aprovado, enviado ou adotado. Nenhum participante foi contatado. Não define base legal, papéis de controlador ou operador, nem prazo: isso é decisão do Instituto (controlador, conforme `MO4_OPERACAO_E_LIBERACAO_2026-11-21.md`), com revisão do encarregado de dados ou do jurídico do Instituto, que este documento não substitui. O piloto **não está pronto para operação**.

Complementa `CHECKLIST_LIBERACAO_PILOTO_Q2_2026-11-23.md` (§3, §7) e `decisions/Q2_PILOT_SCOPE_2026-11-16.md` (PIL-03, PIL-04). Parte do protocolo `LEARNING_Q2_CLIENT_VALIDATION_PROTOCOL.md` (participação voluntária, saída, canal de dúvidas, respostas privadas separadas do plano).

## 1. Quem precisa decidir o quê

| Item | Decide | Falta |
|---|---|---|
| Aprovar o texto do comunicado e a versão | Proponente e Instituto | Revisão do texto da seção 2 |
| Quem assina e quem envia | Instituto | Nome |
| Canal de dúvidas (endereço, responsável, prazo de resposta) | Responsável operacional | **Sem nome** ainda |
| Retenção e descarte por categoria de dado (seção 5) | Instituto (controlador) | Escolha entre as opções da seção 6 |
| Revisão jurídica ou do encarregado de dados | Instituto | Quem revisa |

## 2. Proposta de comunicado (rascunho)

Campos entre colchetes são **lacunas a preencher pelo Instituto**; nenhum foi inventado. Linguagem pensada para leitura em tela de celular, sem termos técnicos.

> **Versão:** [número e data da versão aprovada]
>
> **Assunto: convite para participar de um piloto interno do VitalOS**
>
> Olá, [nome ou "equipe"].
>
> O Instituto Felicidade para Todos vai testar, por [período a definir pelo Instituto], uma jornada de acompanhamento do bem-estar e da cultura da própria equipe, usando a plataforma VitalOS. **O objetivo é verificar se a plataforma funciona bem na prática** (se as tarefas fazem sentido, onde há dúvidas e erros). Não é uma avaliação de pessoas nem uma medição de resultado.
>
> **Sua participação é voluntária.** Você pode participar, participar só de parte ou não participar, e pode sair a qualquer momento. Nada disso terá consequência para você.
>
> **O que acontece:**
> - Uma pesquisa curta, respondida por um link que não pede seu nome.
> - Depois, a equipe vê um retrato **coletivo**. Grupos com menos de 5 respostas não aparecem.
> - A liderança e o RH combinam ações para a equipe e registram o andamento. Você verá apenas uma devolutiva coletiva sobre as ações, sem nomes.
> - [Se aplicável: práticas de aprendizagem opcionais. Suas anotações pessoais nelas ficam só com você, salvo se você escolher compartilhar.]
>
> **O que isto não faz:** os resultados **não** são usados para avaliar desempenho, promoção ou remuneração de ninguém, e nenhuma resposta individual é mostrada à liderança ou ao RH.
>
> **Seus dados:** [finalidade; quem acessa; por quanto tempo ficam guardados e como são apagados, conforme a decisão do Instituto, seção 6]. Responsável pelos dados: Instituto Felicidade para Todos. [Contato do encarregado de dados, se houver.]
>
> **Dúvidas, problemas ou algo que não pareceu certo:** escreva para [canal] com resposta em até [prazo; a proposta de trabalho é 2 dias úteis]. Se algo da plataforma o deixar desconfortável, avise: pausar o piloto é uma possibilidade prevista.
>
> Obrigado por ajudar a testar.
> [Assinatura: nome e cargo definidos pelo Instituto]

### Pontos do texto que dependem de verificação antes de enviar

| Trecho | Por quê |
|---|---|
| "um link que não pede seu nome" | Dito assim porque é o que o fluxo mostra. A palavra "anônimo" só deve entrar depois de conferir no banco do projeto (e não em dados de pessoas) que nada liga a resposta a uma pessoa. No esquema original, o convite de pesquisa (`wave_invites`) guarda só token e data, sem e-mail; migrations posteriores não foram reauditadas para isso. |
| "sem nomes" na devolutiva | Provado em banco descartável e no navegador (MO2/MO4); não no app publicado. |
| "Grupos com menos de 5 respostas não aparecem" | Provado em banco descartável, inclusive pela API (MO2 X3). |
| Ações e evidências | O registro interno guarda **autoria** (por exemplo `recorded_by`, `actor_user_id`). O comunicado diz que o colaborador não vê nomes, o que é verdade para a devolutiva, mas o RH e a liderança que registram aparecem no ledger. Se o Instituto quiser dizer isso aos participantes, o texto precisa de uma frase a mais. |
| "Nenhuma consequência" | Compromisso do Instituto, não do sistema. Só pode ser assumido por quem tem poder para cumpri-lo. |
| Voluntariedade em equipe de 8–15 pessoas | Em grupo pequeno, a pressão informal para participar é real. Recomenda-se que quem envia o comunicado não seja quem acompanha quem respondeu. Decisão do Instituto. |

## 3. O que o produto guarda hoje (levantamento de 23/11/2026)

Feito **por leitura das migrations**, sem consultar o banco e sem ler dados de pessoas. A correspondência exata "dado do piloto → tabela" não foi confirmada em banco.

| Categoria | Onde (tabela) | Identifica pessoa? | Quem lê |
|---|---|---|---|
| Respostas FIB-T | `wave_responses` (respostas em JSON, token do convite) | Não há nome nem e-mail na tabela e no convite; reidentificação indireta em grupo pequeno é possível | Nenhum cliente lê linha individual; a organização lê só agregados |
| Agregados (cápsulas) | `wave_capsules` | Não; recortes com menos de 5 respostas suprimidos | Membros da organização |
| Convites de administrador e colaborador | `member_invites` (e-mail, papel, validade de 30 dias) | **Sim** (e-mail) | Servidor; administrador da organização, por política de leitura (`member_invites_admin_read`) |
| Plano, itens, registro e evidências | `action_plans`, `action_items`, `action_log`, `evidence_records` | **Sim** (autoria registrada) | Membros da organização conforme papel; conteúdo de evidência não aparece na devolutiva |
| Práticas pessoais | `practice_entries` (texto reflexivo, consentimento de compartilhamento) | **Sim** (usuário) | Só o dono |
| Contas e perfis | autenticação e `profiles` | **Sim** | Conforme papel |

## 4. O que existe e o que não existe para reter e descartar

| Fato | Evidência |
|---|---|
| O catálogo de planos declara `capsuleRetentionMonths` (Growth = 12). **Nenhum código ou migration lê esse valor.** É número declarado, **não é expurgo**: sem ação humana, nada é apagado. | busca em `src/` e `supabase/migrations/` em 23/11; valor definido em `src/engine/billing/plan-engine.ts` |
| `erase_my_assessments()` apaga só as autoavaliações pessoais do próprio usuário (`personal_assessments`, Cofre Pessoal). **Não cobre** respostas FIB-T, plano, ledger, evidências, convites nem práticas. | migration `20260706110000_personal_assessments.sql` |
| `practice_entries`, `action_items`, `action_log`, `evidence_records` referenciam a organização com `ON DELETE CASCADE`. `waves`, `wave_capsules` e `member_invites` referenciam a organização **sem** cascata nas migrations lidas. Remover a organização, portanto, exigiria apagar antes essas outras tabelas e seus dependentes. | migrations `20260630161949_…`, `20260709150000_practice_entries`, `20260705100000_action_plan_ledger`, `20260714120000_member_invites`; **não testado**. Vale também para a limpeza do roteiro nível 2 (`ROTEIRO_TESTE_CONVITE_ORG_FICTICIA_2026-11-23.md`, passo 7): ensaiar antes em banco descartável. |
| Existe um motor de retenção (`src/engine/trust/retention-audit-engine`), mas só como **prova de contrato** com política de demonstração (`policySource: "injected_demo_policy"`, 365 dias, ação "anonimizar", para eventos de consentimento). A própria prova informa `runtime: "scheduler_missing"`, `retentionJobsActive: false` e `productionClaimsAllowed: false`: **nenhuma rotina de retenção roda** e a política não é a do piloto. | `src/lib/trust/retention-audit-proof.server.ts` |
| Não encontrei procedimento de descarte dos dados do piloto (respostas FIB-T, plano, ledger, evidências, convites). As ocorrências de `DELETE` achadas em `supabase/tests/` são limpeza de testes em banco descartável, não procedimento. | Busca por termos de retenção e descarte em `scripts/`, `supabase/` e `src/lib/` em 23/11; **não é garantia de ausência**, só do que a busca encontrou |

## 5. Decisão por categoria (a preencher pelo Instituto)

| Categoria | Ao encerrar o piloto | Prazo | Quem executa | Decidido por / data |
|---|---|---|---|---|
| Respostas FIB-T individuais | [apagar / manter] | [a definir] | [a definir] | |
| Agregados (cápsulas) | [apagar / manter] | [a definir] | [a definir] | |
| Convites (e-mails) | [apagar / manter] | [a definir] | [a definir] | |
| Plano, ledger e evidências | [apagar / manter / manter sem autoria] | [a definir] | [a definir] | |
| Práticas pessoais | [dono apaga a qualquer momento / apagar no encerramento] | [a definir] | [a definir] | |
| Contas de participantes | [desativar / apagar] | [a definir] | [a definir] | |

## 6. Opções de retenção (para o Instituto escolher; nenhuma está adotada)

| Opção | O que significa | Vantagem | Risco ou custo |
|---|---|---|---|
| **A · Descartar tudo que identifica no encerramento** | Ao fim do piloto (ou em prazo curto definido pelo Instituto), apagar respostas individuais, convites, práticas e contas. Guardar só as medidas operacionais sem conteúdo (tarefas concluídas por papel, erros, dúvidas) | Menor exposição; mais simples de explicar ao participante | Perde-se a possibilidade de reanalisar; as evidências do plano deixam de existir |
| **B · Guardar agregados e o ledger sem autoria; apagar o resto** | Manter cápsulas (já com mínimo de 5) e o histórico de ações **sem** o vínculo com pessoas; apagar respostas, convites, práticas e contas | Preserva o aprendizado do piloto e a evidência candidata ao Q5 | "Sem autoria" **ainda não existe como operação** (as colunas de autoria são obrigatórias nas tabelas); exige desenho e migration próprios |
| **C · Manter tudo pelo prazo declarado do catálogo (12 meses)** | Adotar os 12 meses do Growth como prazo do piloto | Nenhum desenvolvimento novo agora | Hoje **nenhum código apaga nada**: na prática seria retenção sem fim, a menos que alguém execute o descarte. Contradiz o comunicado se este prometer prazo |

**Como o descarte seria feito (independe da opção):**

| Mecanismo | O que exige | Observação |
|---|---|---|
| **M1 · Procedimento manual autorizado** | Instrução do proponente; roteiro e comandos revisados antes; contagem antes e depois; registro de quem executou; ensaio prévio em banco descartável | Sem código novo. Escala mal, mas serve a um piloto de 8–15 pessoas |
| **M2 · Rotina de descarte no produto** | Código, migration, testes e autorização para aplicar no banco do projeto | Resolve para os próximos clientes; é PR separado e **não** deve bloquear o piloto |
| **M3 · Remover a organização inteira** | Ordem de remoção validada (seção 4), pelo procedimento autorizado | Mais drástico; só no fim, se o Instituto optar por não guardar nada |

**Recomendação do proponente técnico (minha, sujeita à decisão do Instituto):** para o piloto, **A ou B com M1**, definindo o prazo antes do envio do comunicado; tratar M2 como trabalho posterior. Se o Instituto quiser a opção B, o primeiro passo é um desenho da operação "ledger sem autoria", sem aplicá-la. A opção C só deve ser escolhida sabendo que, hoje, ela significa guardar sem prazo.

## 7. Sequência segura

1. O Instituto escolhe a opção da seção 6 e preenche a seção 5.
2. Só então o texto do comunicado (seção 2) é fechado, para que "por quanto tempo" e "como apagamos" reflitam o que de fato acontecerá.
3. Revisão pelo encarregado de dados ou jurídico do Instituto; o proponente aprova a versão.
4. Antes de enviar: verificar os pontos da tabela "Pontos do texto que dependem de verificação" (seção 2).
5. Antes de iniciar o piloto: ensaiar o descarte escolhido em banco descartável, com contagem antes e depois.

## 8. O que este documento não faz

Não define base legal nem papéis legais, não fixa prazo, não altera código, migrations, banco ou o Lovable, e não cria contas, convites ou dados. Não dispensa nenhuma das pendências do checklist (build, publicação, convite de ponta a ponta no app publicado, responsável operacional, PIL-01 e PIL-07).
