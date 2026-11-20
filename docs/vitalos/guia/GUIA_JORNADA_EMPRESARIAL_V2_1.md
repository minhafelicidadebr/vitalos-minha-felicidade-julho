# Guia da Jornada Empresarial VitalOS · Superprompt V2.1

**Versão consolidada · 20/11/2026.** João Paulo aprovou a direção da V2 e quatro ajustes. Esta versão incorpora os ajustes e substitui a Parte 3 da V2 (`GUIA_JORNADA_EMPRESARIAL_V2.md`). O parecer e a decisão de experiência continuam lá. A implementação começa quando esta V2.1 for liberada. O documento não contém credenciais.

## Resumo das seções atualizadas

| Ajuste aprovado | Seções alteradas | Critérios de aceite |
|---|---|---|
| 1. O painel abre no trabalho que importa agora | §3 (regra de entrada e resolvedor), §8 B, §10 Tela C (nova), §16 | AC-04, AC-05 |
| 2. Cada CTA operacional aponta para um fluxo comprovado | §2 (destino da devolutiva e módulos), §3, §8, §10 Tela B, §11, §13 | AC-06, AC-07, AC-08 |
| 3. Abertura comercial forte e fiel ao plano | §8 A (microcopy final), §10 Tela A | AC-09 |
| 4. Matriz perfil × etapa completa | §7 (reescrita por lente, com validação de privacidade, agregação e publicação) | AC-01, AC-10, AC-11 |

**Fatos novos verificados no repositório** (base `feat/claude-ciclo-relatorio` @ `4740bce`, linha `integ/q1-q2-merge`):
- **Devolutiva coletiva do Q2:** o destino institucional é `/ivo-integral/q2`, na seção de membros (componente `MemberPlanFeedback`). Também aparece em `/diario` com sessão real. A rota `/devolutiva` não é destino institucional.
- **Módulos empresariais:** só existem `Q1` e `Q2` (`src/lib/identity/module-contract.ts`). Q3 e Q4 não têm habilitação empresarial.
- **Papéis no livro de registros do Q2:** no banco, `DGP_RH`, `DIRETOR`, `SESMT_SAUDE` e `SINDICO` são tratados como administradores e podem ser escolhidos como responsáveis (migration `20261119120000`, linhas 59 e 113). Na interface comprovada, a lista de responsáveis ofereceu só RH e liderança. A coerência entre as duas camadas fica pendente.
- **Prioridade entre ações:** o fluxo atual não define prioridade. As ações têm estado (planejada, em execução, concluída) e mês de prazo.

---

### 0. Condição de início e escopo

- Implemente só depois de receber esta V2.1 liberada por João Paulo.
- Escopo local, com dados fictícios e ambiente local autorizado.
- Publicação, deploy, dados de clientes, contas reais e contato externo exigem autorização específica.
- A credencial da leitura editorial chega por canal privado e vai só para o mecanismo de segredo do servidor. Nas provas, use uma credencial de teste diferente.

**Primeira entrega futura:** uma fatia local do Q2. RH, liderança e colaborador acompanham a mesma situação até entender qual evidência pode chegar ao Q5.

### 1. Missão

Crie, na VitalOS, um guia da jornada empresarial com duas portas de entrada: a home, para quem avalia contratar, e o painel, para quem já participa. O guia transforma uma escuta organizacional em quatro coisas que o leitor consegue explicar: **uma decisão compreensível, uma ação acompanhada, uma devolutiva com evidência e o que ainda está em aberto.**

Quem participa precisa responder, com as próprias palavras:
1. Onde estou no ciclo?
2. Qual é a minha contribuição?
3. Quem recebe o que eu faço?
4. Como saberei o que aconteceu depois?

Quem avalia contratar precisa responder:
1. O que o plano inclui?
2. O que já posso usar?
3. O que preciso mobilizar?
4. Que evidência poderei consultar, e com que alcance?

A autoria institucional é do Instituto Felicidade para Todos. Use a identidade VitalOS e as marcas oficiais de `public/brand/`.

### 2. Antes de editar · estado verificado

Confira branch, HEAD, worktrees e trabalho local. Preserve os worktrees de outras frentes, `.q.out` e `.q.sql`. Não junte trabalhos em andamento para viabilizar a demonstração. Releia esta tabela na base escolhida, porque os caminhos podem mudar. Os níveis são:
- **D**: descrito;
- **Dm**: demonstrativo;
- **L**: comprovado localmente;
- **A**: disponível no ambiente.

| Item | Fonte | Estado | Nível |
|---|---|---|---|
| Sequência das lentes | `src/domain/journey.ts` · `CANONICAL_JOURNEY` | 4 etapas T1–T4, com meses fixos e rótulo "COPSOQ — Compliance"; sem Q5 | o guia usa só ordem e identidade |
| Módulos empresariais | `src/lib/identity/module-contract.ts` | `Q1` e `Q2`; Q3 e Q4 sem módulo | — |
| Q1 · preparação, comunicado, delegação e revisão técnica | `src/routes/ivo-integral.preparar-q1.tsx`; `docs/vitalos/Q1Q2_INTEGRACAO_LOCAL_2026-11-19.md` | provado em pilha descartável com RH, SST designado e pessoa delegada | L |
| Q1 · coleta COPSOQ II-Br | `src/lib/identity/module-access.server.ts` (`method_pending`); `docs/vitalos/decisions/Q1_COPSOQ_FORMA_ADOTADA_2026-11-20.md` | bloqueada: faltam enunciados oficiais, regra de respostas em branco e permissão de uso | D |
| Q1 · designação do SST | registro de integração | exige perfil SST da mesma empresa, com Q1 habilitado | L |
| Q2 · leitura, atividade, plano, execução e aprendizagem | `src/routes/ivo-integral.q2.tsx`, `src/routes/ivo-integral.acoes.tsx` | provado por papel em pilha descartável | L |
| Q2 · devolutiva coletiva | `src/lib/ivo/member-plan-feedback.server.ts` → `/ivo-integral/q2` (membros) e `/diario` | projeção fechada montada no servidor; todos os membros da organização com Q2; título só de ações escritas depois do aviso | L |
| `/devolutiva` | `src/routes/devolutiva.tsx` | rota demonstrativa | não usar como destino |
| Escopo da liderança no Q2 | RPCs do livro de registros (migration `20261119120000`); prova integrada | só a própria ação, no plano ativo | L |
| SST no Q2 | `q1-q2-contract.test.ts`; suíte SQL 10 (casos 17–18); navegador | sem autoridade no livro de registros; `/ivo-integral/acoes` negado | L |
| Q3 · Vitalidade 001 v0.2.0 | `src/domain/ivo/q3-vitality-unit-001.json` (`feat/claude-q3-fundacao`); `/q3-demo` (`origin/main` @ `7338ebf`) | aprovada em D10 com escopo local; só na demo; produção dá 404 | Dm |
| Q4 · VIA-T | `/viat` (exploratório); `codex/q4-pratica-forcas` | percurso individual novo sem commit; leitura coletiva em rascunho sem commit, sem contrato | Dm |
| Q5 · Relatório Global | `/relatorio-global`; `src/lib/reports/cycle-report.ts` | demonstrativo; modelo rastreável sintético | Dm |
| Acesso editorial | `src/lib/presentation/access.server.ts` | sessão em memória num só processo | confirmar no ambiente de destino |
| Rota do guia | `/guia-empresarial` | sem colisão na base conferida | confirmar de novo |

### 3. Arquitetura

- **Uma jornada versionada, guiada por um caso.** O conteúdo vive em `src/domain/guide/enterprise-guide.ts`, sem lógica de negócio. As capacidades ficam no registro de disponibilidade (§11).
- **Estado de navegação:** `{ etapa: Q1…Q5, perspectiva: papel, detalhe?: id }`, refletido na URL.
  - Ao trocar a perspectiva, a etapa e o caso ficam.
  - Ao trocar a etapa, a perspectiva fica.
  - "Ver o mapa" volta ao mapa com o foco no item de origem.
- **Entrada pela home:** um convite discreto, "Conheça a jornada na VitalOS", leva à abertura comercial (§8 A). A home continua funcionando como antes.
- **Entrada pelo painel ("Guia da minha jornada" → "Meu percurso"), na ordem:**
  1. **Tarefa atribuída e acionável.** Abre nela quando o fluxo existente ou o servidor indicar qual tem prioridade. Hoje o fluxo do Q2 não define prioridade entre ações. Por isso:
     - com **uma** ação acionável atribuída à pessoa (estado planejada ou em execução, plano ativo), essa ação é a tarefa;
     - com mais de uma, segue para o passo 3.
  2. **Etapa do ciclo ativo.** Sem tarefa, abre a etapa cujo ciclo ou plano o servidor informa como ativo, desde que esteja disponível ao perfil.
  3. **Mapa.** Sem contexto, ou com várias tarefas sem prioridade definida, abre o mapa e lista as opções válidas: tarefas, etapa ativa e exemplo.
- **Resolvedor da entrada.** É uma função pura, `resolveGuideEntry(context)`, que recebe só um contexto montado **no servidor** a partir dos fluxos existentes: papel, módulos, tarefas atribuídas com estado e prazo, ciclo ativo. Devolve `{ kind: "task" | "stage" | "map", … }`. Ela não consulta banco nem decide permissão.
- **Disponibilidade e autorização são coisas separadas:**
  - O registro de disponibilidade diz quais capacidades existem e em que ambiente foram verificadas.
  - A autorização vem das regras do servidor para empresa, papel, módulo, designação e estado do recurso.
  - Um CTA operacional só aparece quando as duas condições valem: nível **A** no registro **e** contexto do servidor confirmando o acesso daquela pessoa àquele recurso. O CTA usa sempre o papel do servidor, nunca a perspectiva escolhida.
  - A página de destino aplica as próprias regras; o guia não substitui essa checagem.
- **Nada de motor novo.** Nenhum motor de autorização, calendário paralelo ou banco de progresso. A perspectiva muda só o texto.

### 4. Os três mapas, numa cena

| Mapa | Pergunta | Como aparece |
|---|---|---|
| Lentes da jornada anual | Em que momento estamos? | Q1 COPSOQ · Q2 FIB-T · Q3 PERMA+V · Q4 VIA-T → **Q5 · Síntese anual · Relatório Global ESG**. Marcos genéricos: "Ao iniciar o trimestre", "Durante o acompanhamento", "Na revisão". |
| Ciclo de trabalho | O que fazemos com o que aprendemos? | Mensurar → Educar → Transformar → Evoluir, dentro de uma lente |
| Perspectivas do IVO | De onde olhamos? | EU · NÓS · LIDERANÇA · ORGANIZAÇÃO. São olhares de leitura, não papéis de acesso. |

**Cena (Q2, um quadro):** "No **Q2** (lente), a equipe da Expedição está em **Transformar** (ciclo): a liderança combina o alinhamento de troca de turno. A mesma liderança pensa em como chega ao turno (**EU**) e cuida do combinado da equipe (**NÓS**). O RH acompanha pela **ORGANIZAÇÃO**."

**IVO, na primeira ocorrência:** "Índice de Vitalidade Organizacional: organiza a leitura em quatro perspectivas. Nesta versão, ele não é calculado no guia."

Um plano de uma lente deve se entender sozinho, sem sugerir que exige as outras três.

### 5. Caso de referência · Centro de distribuição Serra Azul (fictício)

Exemplo construído, com prazos ilustrativos e rotulado em toda tela.

- **Contexto.** Na passagem entre o turno da manhã e o da tarde, as prioridades da Expedição chegam incompletas.
- **Q1 · preparação (risco psicossocial como contexto, não como resultado).**
  - O RH registra o comunicado e encaminha a preparação para revisão técnica.
  - O SST designado devolve com uma recomendação: a escuta deve chegar aos dois turnos, dentro da jornada de cada um, e o comunicado deve dizer que a passagem de turno é tema da conversa coletiva, nunca da avaliação de alguém.
  - Tela: "Coleta oficial em preparação."
- **Q2 · da leitura à devolutiva (caso principal).**
  1. **RH, leitura agregada.** No setor Expedição (12 respostas), o fator *Satisfação com a Empresa* aparece abaixo dos demais. O setor Manutenção, com 3 respostas, fica protegido (menos de 5).
  2. **RH, atividade aprovada.** Escolhe a prática aprovada em D10: um tema coletivo e uma conversa voluntária sobre condições de trabalho. O tema é a passagem de turno.
  3. **RH, plano.** Ativa o plano e designa a liderança da Expedição para a ação "alinhamento de 10 minutos na troca de turno, por duas semanas".
  4. **Liderança, execução.** Combina o alinhamento com a equipe e registra o que aconteceu, inclusive os dias em que não coube na rotina.
  5. **RH, aprendizagem e revisão.** Registra que, em três dias, o caminhão atrasou, e decide adaptar o horário.
  6. **Colaborador, devolutiva coletiva.** Depois do aviso, a equipe vê o título da ação, o setor, o fator, o estado, o mês do prazo e "execução registrada". Não vê responsável, indicador nem evidência.
- **Q3 · autonomia da lente.** A Vitalidade 001 propõe uma pausa curta entre reuniões, voluntária, com marcação coletiva no quadro e sem nomes. A tela não liga Q3 a Q2.
- **Q4 · esfera individual.** Uma pessoa da Expedição lê sobre uma força de caráter e escolhe, sozinha, como aplicá-la na troca de turno. Ninguém mais vê.
- **Q5 · extrato sintético** (o que da fatia Q2 pode chegar ao relatório):

| Tipo | Trecho | Origem |
|---|---|---|
| Execução registrada | "A liderança registrou o alinhamento em 7 de 10 dias." | registro de execução (Q2) |
| Decisão documentada | "O RH decidiu adaptar o horário para depois da chegada do caminhão." | revisão do plano (Q2) |
| Mudança observada | "Sem leitura comparável depois da ação; mudança não estimável." | leitura do ciclo seguinte (ausente) |
| Efeito avaliado | "Não avaliado: não houve desenho de avaliação." | — |

Tela: "Dado sintético. Ausência de dado, dado suprimido e ausência de mudança são estados diferentes. Vínculos ESG aparecem como propostos enquanto não forem aprovados."

### 6. Vozes por perfil

| Perfil | Pergunta do leitor | Texto de tela (exemplo) |
|---|---|---|
| Colaborador | "Minha resposta faz diferença?" | "Quem trabalha no turno conhece os detalhes. Sua resposta entra numa leitura do grupo, nunca individual. Veja qual mudança a equipe decidiu experimentar e onde acompanhar o retorno." |
| Liderança designada | "O que eu combino, e o que eu registro?" | "Seu papel é combinar a prática com a equipe e registrar o que de fato aconteceu. Se o encontro não coube na rotina, registre também: isso orienta a revisão." |
| RH | "Que decisão vou explicar à equipe no fim do ciclo?" | "Escolha uma prioridade, designe quem acompanha e combine quando voltar ao assunto. A equipe verá o que foi decidido." |
| SST designado (Q1) | "O que a minha revisão ajuda a decidir?" | "Sua leitura técnica ajuda a decidir se a escuta está adequada às condições de trabalho, aos horários de cada turno e à forma de comunicar o tema." |
| Direção | "O que a empresa recebe e que decisão posso tomar?" | "O relatório mostra o que foi executado, o que foi decidido e o que ainda não se sabe, com a origem de cada informação." |
| Plataforma | "O que eu habilito?" | "A habilitação define quais lentes a empresa usa. A designação do revisor técnico do Q1 é feita aqui." |
| Pequena empresa | "Isso serve para nós?" | "A preparação pode ser delegada pela plataforma a uma pessoa da empresa. A revisão técnica exige um profissional SST com perfil na empresa. Se vocês não têm, isso entra na conversa sobre o serviço." |

### 7. Matriz perfil × etapa

Cada linha diz se o perfil **atua** ou **acompanha**:
- **Quando atua:** a tarefa, quem recebe a entrega e a condição de acesso.
- **Quando acompanha:** quem atua, o que o perfil poderá consultar e em que estado.

Onde algo depende de decisão, a linha registra a dependência e traz a orientação que já pode ser dada.

#### Q1 · COPSOQ

| Perfil | Modo | Tarefa ou quem atua | Quem recebe, ou o que consulta | Condição de acesso e estado |
|---|---|---|---|---|
| RH | atua | preparar o ciclo, registrar o comunicado, encaminhar a revisão técnica | o SST designado (revisão); a equipe (comunicado) | RH com Q1 habilitado · L |
| SST designado | atua | ler a preparação e devolver a revisão técnica | o RH, que ajusta e reencaminha | designação no ciclo, perfil SST da mesma empresa, Q1 habilitado; área de preparação fechada para o SST · L |
| Pessoa delegada (colaborador ou liderança) | atua | registrar a preparação e o comunicado conforme a delegação | o RH | delegação concedida pela plataforma · L |
| Colaborador | acompanha | o RH prepara | o comunicado do ciclo, pelo canal escolhido pela empresa; ver o comunicado dentro do app: a confirmar | coleta oficial em preparação · D |
| Liderança | acompanha | o RH prepara | o comunicado do ciclo; pode receber a delegação | como colaborador · D/L |
| Direção (`DIRETOR`) | acompanha | o RH conduz e o SST revisa | o relatório (Q5) | escopo no Q1 a confirmar · D |
| Plataforma | atua | habilitar o Q1, designar o SST revisor, conceder a delegação | a empresa | `PLATFORM_ADMIN` · L |

**Validação da lente:**
- **Privacidade:** nenhuma resposta individual.
- **Agregação:** resultados futuros só para grupos com 5 ou mais respostas.
- **Publicação:** Domínio B, educativo, não substitui PGR nem profissional habilitado. Hoje não há resultados, porque a coleta está bloqueada.

#### Q2 · FIB-T

| Perfil | Modo | Tarefa ou quem atua | Quem recebe, ou o que consulta | Condição de acesso e estado |
|---|---|---|---|---|
| RH | atua | ler a leitura publicada, escolher a atividade aprovada, criar e ativar o plano, designar o responsável, revisar e encerrar | a liderança (ação); todos os membros (devolutiva); a direção (Q5) | RH com Q2 habilitado · L |
| Liderança designada | atua | mudar o estado e registrar a evidência de execução **da própria ação**, no plano ativo | o RH, que revisa | ser a pessoa responsável pela ação; plano ativo · L |
| Colaborador | acompanha | RH e liderança atuam | a devolutiva coletiva em `/ivo-integral/q2`: título (depois do aviso), setor, fator, estado, mês do prazo, "execução registrada" | membro da organização com Q2 · L |
| SST (`SST_PROFISSIONAL`) | acompanha | RH e liderança atuam | a devolutiva coletiva, como membro | sem autoridade no livro de registros (teste e SQL) e `/ivo-integral/acoes` negado (navegador) · L; a devolutiva para o SST está autorizada pelo código (todos os membros), sem prova no navegador |
| Direção (`DIRETOR`), `DGP_RH`, `SESMT_SAUDE` | acompanha (orientação atual) | o RH atua | o relatório (Q5) | **dependência:** no banco esses papéis são administradores do livro de registros e podem ser responsáveis; na interface comprovada não aparecem. Até a decisão, o guia os trata como leitores. |
| Plataforma | atua | habilitar o Q2 e criar o primeiro RH | a empresa | `PLATFORM_ADMIN` · L |

**Validação da lente:**
- **Agregação:** leitura só para setor com 5 ou mais respostas. Setor protegido não sustenta ação.
- **Devolutiva:** projeção fechada no servidor, sem responsável, indicador, evidência ou linha do tempo.
- **Publicação:** o título aparece só para ações escritas depois do aviso ao RH.
- **Separação de conceitos:** execução, mudança observada e eficácia são coisas diferentes.

#### Q3 · PERMA+V

| Perfil | Modo | Tarefa ou quem atua | Quem recebe, ou o que consulta | Condição de acesso e estado |
|---|---|---|---|---|
| RH | atua (exemplo) | oferecer a prática Vitalidade 001 | a equipe | sem módulo empresarial Q3; só na demo · Dm |
| Liderança | atua (exemplo) | facilitar a combinação e a revisão, sem acompanhar quem participou | o RH, na revisão coletiva | Dm |
| Colaborador | atua, se quiser | participar da pausa e marcar no quadro da equipe, sem nome | a equipe | participação voluntária · Dm |
| SST | acompanha | equipe e liderança conduzem | a prática; ela não substitui a gestão de riscos (Domínio B) | Dm |
| Direção | acompanha | a equipe conduz | o relatório (Q5), só como contribuição temática | Dm |
| Plataforma | — (dependência) | — | — | habilitar o Q3 exige um módulo que ainda não existe |

**Validação da lente:**
- **Agregação:** a vitalidade não tem item, escore nem ranking. Os registros são coletivos e sem nomes.
- **Mensuração:** a mensuração PERMA oficial segue bloqueada (autorização, regras de cálculo e de ausências).
- **Escopo da aprovação:** a unidade foi aprovada em D10 com escopo local.

#### Q4 · VIA-T

| Perfil | Modo | Tarefa ou quem atua | Quem recebe, ou o que consulta | Condição de acesso e estado |
|---|---|---|---|---|
| Qualquer pessoa (colaborador, liderança, RH, SST) | atua na esfera individual | refletir sobre uma força e escolher uma aplicação no trabalho | a própria pessoa | percurso individual; trabalho do Codex sem commit · Dm |
| Liderança (como gestão da equipe) | acompanha | cada pessoa atua para si | nada da equipe: não vê forças de ninguém | sem visão de equipe · D |
| RH | acompanha | cada pessoa atua para si | nenhum dado individual | sem visão de equipe · D |
| Direção | acompanha | cada pessoa atua para si | nenhum dado; no Q5, só a menção de que a lente foi oferecida | D |
| Plataforma | — (dependência) | — | — | não há módulo Q4 |

**Validação da lente:**
- **Leitura coletiva:** qualquer leitura coletiva (existe rascunho no trabalho local do Codex) exige contrato próprio de finalidade, fonte, papéis, publicação e proteção de recortes.
- **Proibido:** perfil coletivo pela soma de rankings individuais.
- **Imagens de exemplo:** também preservam a esfera individual.

#### Q5 · Relatório Global ESG

| Perfil | Modo | Tarefa ou quem atua | Quem recebe, ou o que consulta | Condição de acesso e estado |
|---|---|---|---|---|
| RH | atua (futuro) | revisar a síntese e decidir os compromissos | a direção | contrato de emissão não aprovado; hoje só o exemplo sintético · Dm |
| Direção | acompanha | o RH consolida | o relatório: execução, decisão, mudança observada e efeito avaliado, separados | Dm |
| Liderança | acompanha | o RH consolida | o extrato da ação que acompanhou | Dm |
| Colaborador | acompanha | o RH consolida | a devolutiva coletiva já é o canal da equipe; acesso ao relatório anual depende da regra de publicação (a decidir) | Dm |
| SST | acompanha | o RH consolida | o extrato; Domínio B aparece separado | Dm |
| Plataforma | — | — | — | a emissão institucional depende de contrato |

**Validação da lente:**
- **Origem:** cada conclusão cita sua origem.
- **Estados:** ausente, suprimido e sem mudança são estados distintos.
- **Vínculos ESG:** aparecem como propostos até serem aprovados.
- **Dados:** são sintéticos até haver contrato de fonte institucional.

### 8. Aberturas · microcopy final

**A · Para quem avalia contratar (home)**

- **Título:** Depois de ouvir a equipe, como saber o que a empresa fez a respeito?
- **Texto:** A VitalOS organiza escuta, decisão, ação e devolutiva em ciclos trimestrais. Veja um exemplo construído: a troca de turno num centro de distribuição.
- **Você recebe** (incluído no plano): Os serviços previstos no plano contratado: preparação da avaliação, análise e leitura agregada dos resultados, devolutiva, apoio à elaboração do plano de ação e treinamento. Cada plano descreve as lentes e as entregas que inclui.
- **Sua empresa mobiliza:** Uma pessoa que coordena o ciclo, lideranças que acompanham as ações combinadas, um profissional de SST com perfil na empresa para a revisão técnica do Q1 e tempo da equipe para participar.
- **Você poderá consultar:**
  - Preparação da avaliação do Q1 · `{estado}`
  - Coleta oficial do COPSOQ II-Br · **Em preparação** — a aplicação do COPSOQ II-Br ainda não está liberada. Hoje é possível preparar a avaliação.
  - Leitura agregada, plano, execução e devolutiva do Q2 · `{estado}`
  - Relatório com a origem de cada informação · **Exemplo da jornada**
- **Linha de cobrança:** A contratação remunera os serviços previstos no plano. O questionário COPSOQ II-Br não tem cobrança separada.
- **Aviso:** Apoio educativo e organizacional: não substitui o PGR nem profissional habilitado e não garante conformidade com a NR-1.
- **Rótulo junto ao caso:** Exemplo construído.
- **CTA principal:** Ver a jornada por perfil. Abre o mapa em Q2, na perspectiva RH, com o caso visível e o foco no seletor de perfil.
- **CTA secundário:** Conversar sobre a VitalOS, que leva ao destino institucional já usado na oferta do Q1.

**Como preencher `{estado}`:** vem do registro (§11), aplicado ao ambiente onde o guia roda. Nível **A** → "Disponível". **L**, **Dm** ou **D** → "Em preparação". O caso usa sempre "Exemplo da jornada".

**Divergência a resolver:** a oferta de `/programa` mostra "Disponível" para a preparação do Q1 (`PROGRAMA_Q1_OFFER`), mas a preparação é **L**. O rótulo de `/programa` deve passar a ler o mesmo registro, ou a decisão deve declarar que "Disponível" ali significa serviço contratável, e não funcionalidade no ambiente.

**B · Para quem já participa (painel → "Meu percurso")**

| Resultado do resolvedor | Título | Texto | CTA principal | Ações secundárias |
|---|---|---|---|---|
| `task` | Seu trabalho agora | Você está no **{lente} · {fase}** como **{papel}**. Próxima entrega: **{ação}**, até **{mês do prazo}**. Quem recebe: **{destinatário}**. | **{verbo da ação}** (ex.: "Registrar o que aconteceu"), aparece só com nível **A** e contexto válido; leva ao fluxo existente | Ver o mapa do ano · Ver como funciona nesta etapa |
| `stage` | Seu momento no ciclo | O ciclo ativo é **{lente} · {fase}**. Nesta etapa, **{quem atua}** atua; você pode acompanhar **{o que consulta}**. | Ver como funciona nesta etapa | Ver o mapa do ano |
| `map` | Escolha por onde seguir | Há mais de uma coisa acontecendo, ou ainda não sabemos seu momento. Escolha abaixo. | (lista de opções válidas; nenhuma ação em destaque) | Ver um exemplo de Q2 |

Os valores entre chaves vêm do contexto do servidor. O guia nunca os infere.

### 9. Exemplo resolvido e checagens opcionais

As checagens são privadas, sem pontuação e sem registro. A pessoa pode pular, rever ou aprofundar. O desenho segue dois estudos: a recordação ativa (Roediger e Karpicke, 2006) e o controle do ritmo pelo leitor (Mayer e Chandler, 2001). O ganho precisa ser medido na VitalOS (§15).

**Exemplo resolvido (Q2, RH).** "A leitura da Expedição mostra *Satisfação com a Empresa* abaixo dos demais fatores. O RH **não** conclui que a liderança causou isso. Escolhe um tema coletivo (a passagem de turno), designa quem acompanha e marca a revisão. A leitura agregada indica onde conversar, não quem é responsável pelo número."

**Checagem 1 · participante.** "A liderança registrou que o alinhamento aconteceu em 7 de 10 dias. Quem usa esse registro a seguir?"
- **a) O RH, para decidir a continuidade (correta).** Feedback: "Isso. O RH decide manter, adaptar ou encerrar, e a decisão volta à equipe na devolutiva."
- **b) A direção, para avaliar a liderança (erro plausível).** Feedback: "Ainda não. O registro mostra se a prática aconteceu; não serve para avaliar pessoas, e a VitalOS não o liga a desempenho."
- **c) Ninguém.** Feedback: "O registro segue para o RH, que decide a continuidade."

**Checagem 2 · gestor.** "O relatório diz: 'execução registrada em 7 de 10 dias'. O que você pode afirmar?"
- **a) A prática aconteceu na maior parte dos dias (correta).** Feedback: "Isso. Mudança pede leitura comparável; efeito pede desenho de avaliação."
- **b) A clareza das prioridades melhorou (erro plausível).** Feedback: "Ainda não. Melhora é mudança observada e precisa de uma leitura depois da ação."
- **c) A prática não funcionou.** Feedback: "A execução parcial é informação sobre a rotina, não um julgamento da prática."

### 10. Telas anotadas

**Tela A · Abertura para quem avalia contratar**

```
DESKTOP (≥1024)                                    CELULAR 320–390
┌───────────────────────────────────────────────┐  ┌──────────────────────┐
│ [VitalOS]                 [Instituto] [Entrar]│  │ [VitalOS]    [Entrar]│
│ ┌──────────────────────┐ ┌──────────────────┐ │  │ ① Título (h1)        │
│ │ ① Título (h1)         │ │  Foto editorial  │ │  │ ② Texto              │
│ │ ② Texto               │ │  (cena encenada) │ │  │ ③ [Ver a jornada     │
│ │ ③ [Ver a jornada por  │ │                  │ │  │     por perfil]      │
│ │     perfil] ④ link    │ │                  │ │  │ ④ link secundário    │
│ └──────────────────────┘ └──────────────────┘ │  │ ⑤ Você recebe        │
│ ⑤ Você recebe │ ⑥ Sua empresa │ ⑦ Você poderá │  │ ⑥ Sua empresa        │
│   (incluído)  │   mobiliza    │   consultar   │  │ ⑦ Você poderá        │
│               │               │  [Em prep.]…  │  │   consultar (chips)  │
│ ⑧ Linha de cobrança · ⑨ Aviso · "Exemplo      │  │ ⑧ Cobrança · ⑨ Aviso │
│   construído" junto ao caso                   │  │ ⑩ Foto 4:5 (depois)  │
└───────────────────────────────────────────────┘  └──────────────────────┘
```

- **Prioridade:**
  1. O título.
  2. O CTA, que é o primeiro elemento focável depois do cabeçalho.
  3. Os três blocos.
- **Chips de estado:** texto ("Disponível", "Em preparação", "Exemplo da jornada") mais forma (borda cheia ou tracejada), nunca só cor.
- **Celular:** a foto vem depois dos blocos.
- **Tablet:** em retrato, segue a ordem do celular com os blocos em duas colunas; em paisagem, segue o desktop.

**Tela B · Caso Q2 visto pelo colaborador**

```
DESKTOP                                             CELULAR 320–390
┌─────────────────────────────────────────────────┐ ┌──────────────────────┐
│ Mapa: Q1 · [Q2] · Q3 · Q4 · Q5    Perfil:[Colab▾]│ │ Q2 · Transformar  [▾]│ barra fixa 48px
├──────────────┬──────────────────────────────────┤ │ Perfil: Colaborador  │
│ ① Passagens  │ ② Texto do perfil                │ ├──────────────────────┤
│  Leitura →   │ ③ Onde acompanhar: devolutiva    │ │ ② Texto do perfil    │
│  Decisão RH →│    coletiva da equipe            │ │ ③ Onde acompanhar    │
│  Ação lider.→│ ④ O que fica privado             │ │ ① Passagens vertical │
│  [Retorno a  │ ⑤ [Que evidência chega à equipe?]│ │ ④ Privado            │
│   você] ●    │ ⑥ Ação: [Ver a devolutiva da     │ │ ⑤ micro-CTA          │
│              │    equipe] se A + membro Q2;     │ │ ⑥ Ação principal     │
│              │    senão [Ver como funciona]     │ │ ⑦ Checagem (opcional)│
│              │ ⑦ Checagem opcional (fechada)    │ │                      │
└──────────────┴──────────────────────────────────┘ └──────────────────────┘
```

- **Destino do CTA ⑥:** `/ivo-integral/q2`, na seção de membros. Nunca `/devolutiva`.
- **Visitante ou ambiente sem nível A:** "Ver como funciona" abre o exemplo sintético da devolutiva.
- **Trocar para a perspectiva RH sendo colaborador:** muda o texto, e o CTA vira "Ver como funciona"; nenhum CTA de RH aparece.
- **Foco:** vai para o título do texto do perfil, com o anúncio "Perspectiva: RH".

**Tela C · "Meu percurso" (painel, liderança com ação pendente no Q2)**

```
DESKTOP                                             CELULAR 320–390
┌─────────────────────────────────────────────────┐ ┌──────────────────────┐
│ Seu trabalho agora                               │ │ Seu trabalho agora   │
│ ① Q2 · Transformar · Liderança da Expedição      │ │ ① Q2 · Transformar   │
│ ② Próxima entrega: alinhamento de troca de turno │ │ ② Próxima entrega …  │
│    até {mês} · quem recebe: RH                   │ │    quem recebe: RH   │
│ ③ [Registrar o que aconteceu]  → fluxo de ações  │ │ ③ [Registrar o que   │
│ ④ Ver como funciona nesta etapa · Ver o mapa     │ │     aconteceu]       │
├─────────────────────────────────────────────────┤ │ ④ links secundários  │
│ ⑤ Outras lentes com conteúdo disponível ao       │ │ ⑤ Outras lentes      │
│    perfil (ex.: Q4 · reflexão individual), sem   │ │    (recolhido)       │
│    destaque e sem ação concorrente               │ │                      │
└─────────────────────────────────────────────────┘ └──────────────────────┘
```

- **Prioridade:** ① lente e papel; ② a entrega e quem recebe; ③ uma ação.
- **Outras lentes:** Q4, ou qualquer lente com conteúdo, aparecem abaixo, sem disputar a atenção.
- **Com mais de uma ação sem prioridade:** a tela vira o estado `map` da §8 B.

### 11. Interação, componentes e registro

**Micro-CTAs:**
- "O que o SST revisa?"
- "Que evidência chega ao relatório?"
- "Quem recebe isto?"
- "Por que meu nome não aparece?"
- "O que ainda não se sabe?"

**Expansão em linha e diálogo:**
- **Expansão em linha** (`button` com `aria-expanded` e `aria-controls`) para definições.
- **Diálogo** para o extrato completo do Q5 e para o caso inteiro:
  - foco no título ao abrir, com foco preso dentro do diálogo;
  - Escape e "Fechar" devolvem o foco ao acionador;
  - o conteúdo longo rola dentro do diálogo e o fundo não rola.
  - Em tela inteira, mesmos critérios.

**Registro de disponibilidade** (`src/domain/guide/guide-availability.json`):
- **Campos por entrada:** `id`, `lens`, `role`, `capability`, `level` (`descrito` | `demonstrativo` | `local` | `ambiente`), `environment`, `route`, `serverCheck` (o nome da regra de servidor que autoriza o acesso), `decisionRef` e `verifiedAt`.
- **O registro descreve, não autoriza.**
- **Destinos atuais:**
  - devolutiva coletiva do Q2 → `/ivo-integral/q2`;
  - ação da liderança → `/ivo-integral/acoes`;
  - preparação do Q1 → `/ivo-integral/preparar-q1`.

### 12. Direção de arte

- **Faixa editorial (brief):**
  - **Cena:** fotografia hiper-realista de um centro de distribuição brasileiro, na troca de turno. Uma supervisora negra de meia-idade escuta um colega mais jovem junto ao quadro de turno; ao fundo, de forma discreta, trabalhadores operacionais diversos.
  - **Luz:** iluminação cinematográfica de estúdio com luz principal lateral suave, tons de pele naturais e gesto espontâneo.
  - **Enquadramento:** desktop em 16:9, com cerca de 40 % de área livre para o texto; celular em recorte 4:5 próprio, com os rostos no terço superior.
  - **Texto:** sempre em bloco sólido com contraste AA, nunca incrustado na imagem.
  - **Legenda:** "Cena encenada".
  - Confira antes a galeria da apresentação.
- **Variante de pequena empresa:** uma dupla no balcão de uma oficina pequena.
- **Infográfico de passagens:**
  - **Sequência:** Leitura da equipe → Decisão do RH → Ação da liderança → Retorno ao colaborador.
  - **Cada nó:** ícone, verbo e responsável.
  - **Nó ativo:** borda espessa mais o texto "você".
  - **"Que evidência fica?"** abre em linha junto ao nó.
- **Movimento:**

| Efeito | Função | Com movimento reduzido |
|---|---|---|
| Marcador do mapa (≤ 200 ms) | localizar a etapa ativa | troca instantânea |
| Realce entre nós (≤ 300 ms) | mostrar a passagem de responsabilidade | realce fixo |
| Abertura do diálogo (≤ 150 ms) | separar a leitura concentrada | sem animação |

- **Degradação:**
  - **Imagem ausente ou conexão lenta:** área reservada em cor de marca, sem deslocar o layout; dimensões declaradas, imagens responsivas, só a primeira imagem é prioritária.
  - **Texto a 200 %:** sem rolagem horizontal; o infográfico passa a vertical.

### 13. Acesso e engenharia

- **Duas portas:**
  1. A **senha editorial** libera só o conteúdo genérico e sintético para o visitante. A validação é no servidor, a credencial fica em segredo do servidor, o cookie é HttpOnly com escopo de rota, as respostas não vão para cache compartilhado e a sessão expira.
  2. A **sessão institucional** monta no servidor o contexto de "Meu percurso" (papel, módulos, tarefas, ciclo ativo).
- **Antes de reutilizar o acesso da apresentação**, confirme que o armazenamento de sessão funciona no ambiente de destino.
- **Navegação direta** a qualquer rota operacional continua submetida às regras daquela rota. O guia não abre exceção.
- **Proibido:**
  - carregar dados institucionais para escondê-los no navegador;
  - pôr a credencial em Git, bundle, HTML inicial, URL, telemetria ou capturas.
- **Regra de leitura:** ler o guia não gera registro de execução, consentimento, conclusão de treinamento nem certificação.

### 14. Critérios de aceite

| ID | Prioridade | Prova | Aceite |
|---|---|---|---|
| AC-01 | Crítica | Teste de conteúdo da matriz §7 | Cada lente cobre os seis perfis (colaborador, liderança, RH, SST, direção, plataforma) com modo, tarefa ou quem atua, destinatário ou o que consulta, e condição; nenhuma célula vazia; onde há dependência, ela está escrita. |
| AC-02 | Crítica | Teste de conteúdo dos termos | Nenhum texto usa "Compliance", "comprovado" para execução, nem datas de empresa. |
| AC-03 | Crítica | Servidor e navegador, casos de acesso | Senha incorreta, expiração, encerramento e configuração ausente (recusa); nada protegido chega antes da validação. |
| AC-04 | Crítica | Teste do resolvedor com fixture: Q2 e Q4 "habilitados" no contexto (o Q4 só como fixture, porque não há módulo Q4), liderança com uma ação pendente no Q2 | Resultado `task` na ação do Q2; a Tela C destaca a ação do Q2 e mostra o Q4 só em "Outras lentes". |
| AC-05 | Alta | Testes do resolvedor | Sem tarefa e com ciclo ativo disponível → `stage`. Duas ações sem prioridade → `map` com as duas opções. Contexto ausente → `map`. |
| AC-06 | Crítica | Teste de renderização | CTA operacional só com `level = ambiente` **e** contexto do servidor válido; senão, "Ver como funciona". |
| AC-07 | Crítica | Navegador, com sessão de colaborador | Navegação direta a `/ivo-integral/acoes` continua negada; trocar a perspectiva para RH no guia não mostra CTA de RH nem altera privilégios. |
| AC-08 | Alta | Navegador | O CTA da devolutiva leva a `/ivo-integral/q2` (seção de membros); visitante ou ambiente sem nível A veem o exemplo sintético; `/devolutiva` não aparece como destino. |
| AC-09 | Alta | Teste de conteúdo da abertura A | Os três blocos têm o texto da §8 A; os chips seguem o registro; a coleta aparece "Em preparação" enquanto o Q1 estiver `method_pending`; a linha de cobrança tem a redação aprovada. |
| AC-10 | Alta | Teste de conteúdo por lente | Cada lente tem o bloco de validação de privacidade, agregação e publicação; o Q4 não tem nenhuma leitura coletiva; o SST no Q2 não tem tarefa. |
| AC-11 | Alta | Navegador, com sessão SST na pilha descartável | Prova (ou refutação registrada) de que o SST, como membro, vê a devolutiva coletiva e não vê ações. |
| AC-12 | Alta | Continuidade no navegador | Home → abertura → Q2 (RH) → Colaborador → detalhe → voltar → Q5: a etapa e a perspectiva se mantêm, e o extrato de quatro tipos aparece. |
| AC-13 | Alta | Acessibilidade em 320 e 390 px, tablet nas duas orientações e desktop | Sem rolagem horizontal; teclado completo; Escape fecha e devolve o foco; etapa e perfil anunciados; texto a 200 % e movimento reduzido OK (WCAG 2.2 AA). |
| AC-14 | Média | Desempenho em emulação móvel declarada | Título e CTA aparecem antes da foto; sem deslocamento de layout. |
| AC-15 | Alta | Validação com pessoas (§15), quando autorizada | Registrada como pendente até ser executada. |

### 15. Como medir a melhoria (ambição: até 90 %)

"Até 90 %" é uma ambição de projeto. As mesmas tarefas rodam na V1 prototipada e na V2.1, com participantes diferentes em cada versão.

| Medida | Tarefa | Verificável no protótipo | Exige pessoas |
|---|---|---|---|
| Encontra a etapa e a tarefa sem ajuda | "Você é liderança da Expedição. Encontre o que precisa fazer agora." | o caminho existe (AC-04) | acerto sem ajuda e tempo |
| Identifica quem recebe a entrega e o que vem a seguir | Checagem 1, fora do guia | — | acerto e explicação |
| Distingue ação executada de efeito avaliado | Checagem 2, com trecho novo | — | acerto e erros |
| Completa o percurso no celular e por teclado | do início ao Q5 | sim (AC-13) | leitor de tela, quando possível |

Relate contagens e proporções por perfil, com o tamanho da amostra declarado. Com amostras pequenas, relate a diferença descritiva sem extrapolar percentual de ganho.

### 16. Sequência de implementação local

1. **Inventário e registro.**
   - Confirmar §2 na base escolhida.
   - Criar o módulo de conteúdo e o registro de disponibilidade.
   - Testes de conteúdo (AC-01, AC-02, AC-09, AC-10).
2. **Fatia Q2: a primeira entrega.**
   - Abertura A.
   - O caso Q2 nas perspectivas RH, liderança e colaborador, com a checagem 1.
   - Extrato do Q5 limitado ao que vem do Q2 (execução, decisão, mudança, efeito).
   - Resolvedor e Tela C (AC-04, AC-05).
   - Regra de CTA (AC-06 a AC-08).
   - Senha editorial com segredo de teste (AC-03).
   - Navegador em 320, 390 e desktop.
3. **Q1, Q3, Q4 e o Q5 completo.**
   - Q1 com a preparação e "Em preparação" para a coleta.
   - Q3 e Q4 com autonomia e esfera individual.
   - Checagem 2.
   - AC-11 na pilha descartável.
4. **Integração.**
   - Entrada pelo painel.
   - Acessibilidade completa e degradações (AC-12 a AC-14).
   - Gate do candidato.
   - Registro do que foi inspecionado, executado e validado por pessoas.

### 17. Não fazer

- Não mostrar cálculo do IVO, projeção ou associação entre lentes e dimensões sem contrato aprovado e aplicável.
- Não sugerir que um plano de uma lente exige as outras três.
- Não oferecer diretório de SST.
- Não criar visão coletiva do VIA-T.
- Não usar `/devolutiva` como destino institucional.
- Não inferir no navegador papel, tarefa ou ciclo.
- Não publicar, implantar nem contatar terceiros sem autorização específica.

---

## Decisões humanas que ainda alteram escopo, metodologia ou publicação

1. **Acesso de quem já é autenticado.** A pessoa com sessão institucional vê "Meu percurso" sem a senha editorial. Proposto na V2; confirmar.
2. **Armazenamento da sessão editorial no ambiente de destino.** Aprovar um substituto se o mecanismo atual não servir.
3. **Papéis administrativos no Q2.** O banco trata `DIRETOR`, `DGP_RH` e `SESMT_SAUDE` como administradores do livro de registros, e a interface comprovada não os mostra. Decidir o papel deles; até lá, o guia os trata como leitores.
4. **Rótulo "Disponível" em `/programa`.** Alinhar ao registro de disponibilidade ou declarar que se refere ao serviço contratável.
5. **Publicação do Relatório Global para colaboradores.** Decidir se a equipe acessa o relatório anual ou só a devolutiva coletiva.
6. **Validação com pessoas.** Autorizar o roteiro com representantes dos perfis.
