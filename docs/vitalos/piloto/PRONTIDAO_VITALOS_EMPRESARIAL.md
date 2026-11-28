# Prontidão do VitalOS Empresarial — matriz única

> Documento de controle da macro-onda **VitalOS Empresarial — da contratação ao próximo ciclo**.
> Única matriz de prontidão do segmento empresarial. Atualize esta, não crie outra.

## Base e procedência

| Item | Valor |
| --- | --- |
| Commit base | `main` @ `78ed5d5` (merge do #83) |
| Branch desta continuação | `claude/empresarial-onda0-q1-continuidade` (parte de `codex/empresarial-ativacao-q1`, PR #84, commit `968c63c`) |
| PRs abertos que podem duplicar trabalho | #80, #81 (orientação Q2 por perfil), #82 (Q5 decisão + cabeçalho 320 px), #67 (isolamento de assentos entre orgs). Rever antes de tocar Q2/Q5 ou convites. |
| Verificação local nesta sessão | `bun test src`: 4330 testes, 25 falhas, **todas pré-existentes e de ambiente** (pacotes `ajv`, `ajv-formats` e `motion-utils` não instalados porque 35 entradas do `bun.lock` apontam para um espelho privado bloqueado). Lista de falhas idêntica antes/depois desta mudança. `tsc --noEmit`: 13 erros, todos `Cannot find module 'ajv'`. **O gate completo (`bun run gate`) precisa rodar num ambiente com o lockfile resolvido antes do merge.** |

### Estados

**Demonstrativa** (dado fictício) · **Implementada** (caminho no código + contrato de servidor identificado) · **Comprovada em homologação** (ponta a ponta com org e contas de teste) · **Operacional para a organização** (versão, configuração e acesso verificados no ambiente de uso) · **Pendente** (decisão/dependência com responsável e impacto).

Regra de evidência: teste verde comprova só o que ele cobre; commit sincronizado no Lovable comprova recebimento do código; publicação e prova por perfil são verificações próprias.

---

## 1. Matriz por fase

| Fase · tarefa | Perfil | Condição de acesso | Estado | Evidência (ambiente · versão · resultado) | Próximo passo |
| --- | --- | --- | --- | --- | --- |
| 0 · Criar organização | Operador IFT (`PLATFORM_ADMIN`) | Sessão de plataforma | Implementada | Código: `/plataforma`, `first-admin.functions.ts`. Sem prova nesta versão. | Prova em homologação com org limpa. |
| 0 · Unidades da organização | Operador IFT, admin empresarial | Escopo contratado | **Pendente — lacuna de modelo** | O pack declara hierarquia `organization/site/department/team/shift`, mas nenhuma migration cria unidade; `profiles` tem só `org_id`. | Decisão D-01 (abaixo). Não bloqueia a prova de 1 unidade. |
| 0 · Pacote e capacidades | Operador IFT | `org_module_entitlements` | Implementada (parcial) | Migration `20261115135955`: só módulos `Q1` e `Q2`, falha fechada, revisão otimista. Q3–Q5 sem entitlement. | Estender lista de módulos quando Q3/Q4 tiverem contrato (D-02). |
| 0 · Primeiro administrador | Operador IFT → RH | Convite emitido para a conta designada | Implementada | `issue/revoke/inspect/acceptFirstAdminFn`; aceite leva a `/rh` (#84). Testes de servidor do Codex: 49 em 5 suítes (local, 27/11). | Prova em navegador: emitir → aceitar → `/rh` → cartão Q1. |
| 0 · Convidar integrantes e atribuir papéis | RH autorizado | Org, papel, teto de assentos | Implementada (parcial) | `member-invite.*`: criar, listar, checar, aceitar; reserva atômica de assentos (`20261121120000`); expiração tratada. **Sem revogação nem reenvio para convite de integrante** (só o do primeiro admin tem revogação). | Recorte 0.2: revogar/reenviar convite de integrante + teste de vínculo incorreto. |
| 0 · Isolamento entre organizações | Todos | RLS + servidor | Implementada | Oráculo adversarial e paridade RLS existentes; PR #67 aberto com teste de assentos entre orgs. | Prova com 2ª org de teste (exigida no critério da Onda 0). |
| 0 · Papel efetivo nas telas | Todos com conta real | Sessão `ready` | **Implementada (recortes 0.3 + 0.3b)** | Local, 28/11, branch `feat/empresarial-papel-efetivo-academia`: `resolveRoleContext` + `useEffectiveRole` em `/academia`, `DemoRouteGuard`, `/experimentos`, `/onda`, `/devolutiva`, `/copilota`, `/viat`, `/reconhecimento`, `/ondas`, `useLiveEconomy`. Guarda `effective-role-consumers.test.ts` trava a lista de leitores diretos da persona (11, cada um com motivo). Sem regressão na suíte. Sem prova em navegador. | Prova em homologação: conta colaborador com persona "RH" salva no navegador não abre rota de RH nem vê agregado. |
| 1 · Preparar Q1 (escopo, público, comunicado, responsáveis) | RH, representante autorizado | Entitlement Q1 + `checkQ1PreparationAccess` | Implementada | `q1-preparation`, `q1-delegation`; atalho no `/rh` (#84). | Prova visual aceite → preparação → estado persistido → retomada. |
| 1 · Revisão técnica SST | SST | Delegação registrada | Implementada | `q1-technical-review.functions.ts`, migration `20261119103000`. | Incluir na mesma prova, com a conta SST. |
| 1 · Aplicar COPSOQ | RH + SST competentes | Versão, licença, cálculo e publicação validados | **Pendente — externo** | Diligência de licenciamento aberta (Opção B, 22/07); manifesto `copsoq-instrument-manifest.json` congelado. Responsável: founder + jurídico. | Nenhum código até nova decisão formal (`DECISAO_T5…` §6–§8). Q1 segue só com preparação. |
| 2 · Nova escuta FIB-T → leitura agregada → prioridade → plano → designação → evidência → revisão → devolutiva | RH, liderança, colaborador | Entitlement Q2 + leitura elegível (k ≥ 5) | Comprovada em pilha descartável (histórico) | `CHECKLIST_LIBERACAO_PILOTO_Q2_2026-11-23.md`; demo com testes próprios (#78, #83). Versão atual não reprovada. | Repetir com contas de teste na versão atual; checar supressão em totais e exportações. |
| 3 · Prática educativa | Perfis elegíveis | Prática aprovada | Demonstrativa | Política de papéis Q3 escrita e testada, sem ligação ao fluxo institucional (MO3). | Ligar a política ao servidor quando a Onda 2 estiver comprovada. |
| 3 · Coleta PERMA+V | Perfis elegíveis | Fonte, parâmetros e acesso comprovados | Pendente — metodológico | `docs/vitalos/Q3_PERMA_V_FUNDACAO_2026-11-19.md`. | Decisão metodológica (D-03). |
| 4 · Devolutiva individual VIA-T | Participante | Leitura individual autorizada | Demonstrativa | Engine `viat` com testes; lente exploratória, não VIA Survey oficial. | Contrato de controle de acesso pela pessoa. |
| 4 · Leitura coletiva de forças | Equipe | Finalidade + elegibilidade | Pendente | Sem contrato de publicação coletiva. | Definir após devolutiva individual. |
| 5 · Síntese institucional + Relatório ESG + Plano do próximo ano | RH, direção | Registros autorizados do ciclo | Demonstrativa | Síntese fictícia integrada no #83; #82 aberto (proposta do próximo ciclo). | Contrato de evidências do Q5 assim que a estrutura do Q2 estiver comprovada. |

---

## 2. Matriz por perfil — quem vê, aprende, executa e acompanha

Diagnóstico de 28/11 (pack `enterprise`, 53 itens de navegação): `COLABORADOR` vê 24 itens, `LIDER_EQUIPE` 31, `RH_ADMIN` 51, `SST_PROFISSIONAL` 17. Oito itens são `all` (`overview, wave, ivo, devolutiva, ai, access, methodology, settings`). A amplitude do colaborador vem desses oito somados a 16 itens explícitos de prática e participação; a trilha "Liderando com Segurança Psicológica" já é restrita a liderança/RH/CHRO no catálogo.

| Eixo do menu | Colaborador | Liderança | RH | SST | Direção |
| --- | --- | --- | --- | --- | --- |
| Visão Geral | **Vê**: próxima tarefa, práticas, devolutivas | Vê ações atribuídas | **Acompanha** implantação e cobertura | Vê frente técnica | Vê síntese |
| Medir | **Executa**: responde escutas elegíveis; **vê** devolutiva coletiva publicada | Vê leitura da equipe (k ≥ 5) | **Executa**: abre ondas, publica leituras | **Executa**: revisão técnica Q1 | Vê leitura agregada |
| Comunidade e Educação | **Aprende**: trilhas do próprio papel | **Aprende** facilitação; trilhas de liderança | **Aprende** intervenção; cura catálogo | Trilhas técnicas | Trilhas estratégicas |
| Agir e Transformar | **Executa** prática atribuída; sugere | **Executa** e registra evidência das ações | **Pactua** prioridades; designa | Encaminhamentos de prevenção | Aprova prioridades |
| Provar e Estratégico | Vê compromissos coletivos | Vê evidências da equipe | **Consolida** evidências | Vê evidência técnica | **Decide** continuidade (Q5) |
| Confiança | **Vê** uso dos próprios dados e canais | idem | Administra permissões | idem | Governança |

Regra de aceite desta matriz: a mesma resposta precisa valer no **menu**, na **tela** e na **autorização do servidor**, condicionada a contratado × habilitado × condição metodológica.

---

## 3. Registro de decisões (ToT, ≤ 5 linhas cada)

**Onda 0–1 · Codex (27/11).** Reutilizar o convite institucional e o controle de acesso da preparação. Completar a passagem ao Q1 no `/rh` fecha a primeira lacuna com duas mudanças de interface. Retomar: se a prova em navegador falhar no aceite, investigar `acceptFirstAdminFn` antes de alterar a UI.

**Recorte 0.3 · papel efetivo (28/11).** Ramos: (a) reutilizar `resolveEffectiveRoleId` direto na Academia; (b) completar com `resolveRoleContext` que distingue `pending` e suprime sinais fictícios para conta real; (c) criar camada de autorização de curadoria no servidor. Escolhido (b): fecha a incoerência apontada (menu ≠ Academia ≠ origem do dado) com uma função pura testável e sem migration. Evidência: AppShell usa o papel da sessão, `academia.tsx` lia `usePersona()` e calculava prioridades com `getSectorData` + `MARINA_VIAT_RESULT`. Retomar (c) quando a Academia tiver progresso persistido por organização.

**Recorte 0.3b · consumidores restantes (28/11).** Regra única: **sessão pendente = visão mais restrita**. Achados que motivaram a regra:
- `DemoRouteGuard` (aplicado pelo AppShell também a sessões reais) liberava rota pela persona salva no navegador, não pelo papel da conta. Corrigido: usa o papel efetivo e aguarda a sessão.
- `/onda`, `/devolutiva` e `canSeeCollective` usam **lista de bloqueio** (quem não é participante vê o agregado). Com papel ainda indefinido, isso liberava o agregado. Corrigido para pendente → individual. Fica a decisão D-06: trocar por lista de permissão, pois papéis reais como `SST_PROFISSIONAL`, `CIPA_MEMBRO`, `CONSULTOR_EXTERNO` e `PARCEIRO_LOCAL` caem hoje na visão agregada dessas telas.
- `/ondas` envia `actorRole` do cliente a `transitionWave`. O servidor é `ephemeral_demo` (não persiste), então não expõe dado real; a gestão institucional de ondas passa por `wave-admin.server`. Agora usa o papel efetivo e não dispara sem papel.
- `ContextualHelp` aparece várias vezes por tela: **não** chama a sessão (seriam N consultas). Quem chama passa `roleId`; acrescentado em `/devolutiva`, `/expedicao` e nas variantes reais dos dashboards de colaborador e RH. Faltam `LiderDashboard`, `/embaixadorias` e as seções internas de `/viat`.
- `AppShell` ainda usa a persona durante o carregamento da sessão (o menu de demo pisca). Alinhar a `resolveRoleContext` em coordenação com o Lovable, dono visual do arquivo.

### Decisões humanas agrupadas

| ID | Decisão | Quem | Impacto se adiada |
| --- | --- | --- | --- |
| D-01 | Unidades: modelar `org_units` (site/departamento/equipe) agora ou operar o piloto com 1 unidade e recortes por cohort? | Founder | Bloqueia só "troca de unidade" e recortes por unidade; a prova de 1 unidade segue. |
| D-02 | Entitlements Q3/Q4/Q5: quais módulos entram no pacote contratado? | Founder + comercial | Q3–Q5 ficam demonstrativos; não bloqueia Q1/Q2. |
| D-03 | Instrumento PERMA+V: versão, método de leitura e fonte. | Comitê científico | Bloqueia coleta Q3; prática educativa segue. |
| D-04 | Homologação: qual projeto/ambiente e quais contas de teste usar para as provas da Onda 0. | Founder | Bloqueia a passagem de "Implementada" para "Comprovada". |
| D-05 | Lockfile: trocar o espelho privado por `registry.npmjs.org` no `bun.lock` ou manter. | Founder | Gate completo só roda fora desta sessão. |
| D-06 | Telas com lista de bloqueio (`/onda`, `/devolutiva`, `canSeeCollective`): trocar por lista de permissão do que cada papel vê agregado. | Founder + produto | SST, CIPA, consultor e parceiro seguem vendo a visão agregada demonstrativa. |

---

## 4. Protocolo de execução por recorte

1. Base: `git pull`, registrar commit, checar PRs abertos da tabela acima.
2. ToT em 3 ramos (reutilizar · completar menor lacuna · criar), decisão em ≤ 5 linhas na §3.
3. Critério de aceite → teste ou prova reproduzível **antes** do código.
4. Menor mudança que fecha o percurso; diff revisado; `bun run gate`.
5. Prova no papel que inicia, no papel que recebe e no registro persistido; retomada; isolamento se tocou acesso.
6. Atualizar a linha da matriz com ambiente · versão · resultado. Reabrir se a evidência cobrir só parte.
7. PR em rascunho, um recorte por PR. Produção, migrations e dados reais só com autorização explícita.

## 5. Próximos recortes (em ordem)

| # | Recorte | Critério de aceite |
| --- | --- | --- |
| 0.1 | Prova em homologação: org limpa → primeiro admin → aceite → `/rh` → cartão Q1 → preparação salva → retomada | Roteiro executado com 2 orgs de teste; prints + IDs de request; nenhuma leitura cruzada. Depende de D-04. |
| 0.2 | Revogar e reenviar convite de integrante | Convite revogado não aceita; reenvio invalida o anterior; teste de servidor + teste de vínculo com conta de outra org. |
| 0.3b | ✅ Código entregue (28/11). Falta a prova em navegador | Quem explorou a demo como liderança entra como colaborador e recebe trilhas, tarefas e devolutivas do papel real; a liderança da mesma org recebe as ações atribuídas. |
| 0.3c | Papel nos ícones de ajuda restantes + `AppShell` sem piscar menu de demo | Guarda estendida: todo `<ContextualHelp>` em tela com sessão recebe `roleId`. |
| 1.1 | Prova Q1 com RH + SST | RH conclui preparação, SST revisa, estado persiste, interface mostra próximo passo e motivo da pendência COPSOQ. |
| 2.1 | Re-prova do percurso Q2 institucional na versão atual | Oito transições com autoria e data; retomada; supressão k ≥ 5 também em totais e exportações. |
| 5.0 | Contrato de evidências do Q5 sobre a estrutura do Q2 | Cada seção aponta fase, origem, período, cobertura e limitações. |

## Fontes internas

- [Continuidade do dashboard](MACRO_ONDA_DASHBOARD_CONTINUIDADE_2026-11-25.md)
- [Roteiro de convite](ROTEIRO_TESTE_CONVITE_ORG_FICTICIA_2026-11-23.md)
- [Checklist de liberação Q2](CHECKLIST_LIBERACAO_PILOTO_Q2_2026-11-23.md)
- [Prontidão por lente](MO3_LENTES_2026-11-21.md)
