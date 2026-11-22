# Macro-onda 4 · Operação, experiência e pacote de liberação do Instituto

**Candidato:** `feat/mo3-lentes` `c277371` (MO2 + MO3). **Ambiente:** pilha descartável `vitalos-q1q2-integ` (loopback), dados da jornada da MO2 recriados neste candidato (47/0). Login normal por link mágico entregue no Mailpit da pilha (`scripts/integ-local/mail-link.ts`).

## 1. Fluxos do piloto no navegador

| Perfil | Rota | Largura | O que a pessoa vê e pode fazer | Resultado |
|---|---|---|---|---|
| RH Alfa | `/entrar` → `/rh` | 1280 | Login normal; painel da "Empresa Fictícia Alfa" | OK |
| RH Alfa | `/ivo-integral/acoes` | 1280 | Plano ativo 2026-T4; ação em execução; aplicação e ajuste após revisão; "Eficácia ainda não avaliada"; ajuda "Como ler as evidências deste plano?" | OK, sem overflow |
| RH Alfa | `/ivo-integral/acoes` | 390 | Nenhum elemento interativo coberto pela barra inferior ou pelo concierge em 5 posições de rolagem | OK |
| Liderança Alfa | `/ivo-integral/acoes` | 390 | "Ações sob sua responsabilidade"; só "Registrar execução" nas próprias ações; sem criar ou ativar plano | OK, sem overflow |
| Liderança Alfa | ajuda ⓘ | 390 | Botão 44×44; Enter abre com foco no título; diálogo cabe na tela; Escape fecha | OK |
| Colaborador Alfa | `/diario` | 390 | Devolutiva "O que a organização está fazendo": ação, setor, fator, estado, prazo, "execução registrada", "Eficácia ainda não avaliada"; sem nome do responsável nem conteúdo de evidência; ajuda "O que esta devolutiva mostra?" | OK, sem overflow |
| Colaborador Alfa | `/ivo-integral/acoes` | 390 | Nenhum controle de registro | OK (servidor também recusa: MO2 X1) |

**Limites desta prova:** o painel do navegador estava oculto (animações e capturas não confiáveis); a verificação foi por DOM. O concierge pode ficar sobre texto (não interativo) no celular, pendência global já registrada. Movimento reduzido: o `AppShell` já envolve o app em `MotionConfig reducedMotion={reduceMotion ? "always" : "user"}`; com a preferência ativa, o framer-motion desliga deslocamentos e mantém só transições de opacidade. A impressão anterior de "não respeita" vinha do painel oculto, que congela as animações (correção de 21/11). Sobreposição do concierge sobre a barra inferior no celular: corrigida em `feat/a11y-piloto`.

## 2. Convites, assentos e ordem de liberação

Compatibilidade: a migration `20261121120000` cria uma função nova e não altera tabela; o código da `main` atual não a chama. A função pode existir no banco antes do código, sem efeito.

**Confirmado pelo proponente em 21/11/2026:** o Lovable aplica as migrations de `supabase/migrations/` ao sincronizar a `main`. Logo, **o merge de um PR com migration é uma migration remota** e precisa de autorização explícita para isso. Reverter o arquivo depois não remove a função: a remoção exige uma migration nova.

Atenção: o histórico remoto de migrations foi registrado como não canônico em 28/07/2026. Uma sincronização pode tentar outras migrations que o banco considere pendentes. Por isso a migration vai num PR próprio e pequeno.

| Passo | Quem | Ação | Verificação | Recuperação |
|---|---|---|---|---|
| 1 | Proponente | Autorizar a migration remota e mesclar o **PR A** (`fix/assentos-main`: migration `20261121120000` + código de assentos + teste de inventário) | CI verde; no Lovable, conferir que só esta migration foi aplicada; a própria migration falha se `anon`/`authenticated` tiverem EXECUTE; conferir `has_function_privilege` no banco vivo | Falha na aplicação: a transação não deixa resíduo. Desfazer depois de aplicada: PR com migration nova `DROP FUNCTION public.reserve_member_invite(uuid, text, text, uuid, text[], integer, text);` e revert do código |
| 2 | Proponente | Mesclar o **PR B** (`feat/mo3-lentes`: D2, fundação Q3, roteiros e documentos; sem migration própria) | CI verde; prévia do Lovable atualizada | `git revert -m 1 <merge>` por PR |
| 3 | Proponente | Teste de convite na prévia **somente com organização de teste autorizada** (a prévia usa o banco do projeto) | Convite de colaborador aceito; 6º administrador recusado no Growth | Excluir a organização de teste pelo procedimento autorizado |
| 4 | Proponente | Publicar | Convite real só depois do pacote do Instituto aprovado | Republicar a versão anterior |

## 3. Pacote de liberação do Instituto (proposta para aprovação)

| Item | Proposta | Decide |
|---|---|---|
| Finalidade | Verificar a operação da jornada Q2 ponta a ponta (tarefas, dúvidas, erros, continuidade). Não avalia eficácia | Proponente |
| Coorte | Equipe interna do Instituto, 8–15 pessoas; nenhum recorte publicado com menos de 5 respostas | Instituto |
| Plano | Growth (decidido em 21/11) | Decidido |
| Período | 6 semanas: semana 0 preparação e comunicado; 1–2 leitura FIB-T; 3–5 plano, execução e aprendizagem; 6 devolutiva e revisão | Instituto |
| Papéis | 1 RH_ADMIN; liderança responsável pelas ações; colaboradores; SST só se houver responsável competente (Q1 preparação) | Instituto |
| Responsável operacional | Pessoa do Instituto a nomear (o papel metodológico do proponente não a designa) | Instituto |
| Comunicação | Protocolo existente: participação voluntária, saída livre, canal de dúvidas; versão e responsável a fixar | Proponente e Instituto |
| Dados | Respostas FIB-T anônimas por link, só agregados ≥ 5; plano e evidências no ledger da organização; colaborador vê só a devolutiva coletiva. Retenção e descarte a definir (PIL-04) | Instituto (controlador) |
| Suporte | Canal de dúvidas com resposta em até 2 dias úteis; registro de cada dúvida e erro | Responsável operacional |
| Critérios de pausa | Qualquer exibição de dado de grupo < 5; acesso indevido; perda de registro; falha recorrente de convite ou login | Responsável operacional |
| Recuperação | Reversão do código por PR; função de assentos removível; republicação da versão anterior | Proponente |
| Medidas do piloto | Conclusão de cada tarefa por papel, erros, dúvidas, tempo até a primeira ação registrada, continuidade semanal. Eficácia exige desenho próprio | Proponente |

### Escopo por lente no piloto

| Lente | No piloto | Condição |
|---|---|---|
| Q1 | Preparação (comunicado, controles, delegação, revisão SST) | Coleta só com a ficha da II-Br |
| Q2 | Jornada completa | D1 aplicado; extensão da D10 (PIL-07) |
| Q3 | Prática Vitalidade 001 v0.2.0, educativa | Extensão da aprovação ao piloto |
| Q4 | Fora | PR do Codex e contrato da leitura coletiva |
| Q5 | Fora (só síntese sintética) | Contrato do modo real |

## 4. Critério de entrada no piloto real

| Requisito | Q2 (escopo proposto) | Estado |
|---|---|---|
| Prova da jornada no candidato | MO2 47/0; navegador MO4 | Atendido |
| Identidade e papéis conferidos | Convites por papel; elegibilidade; recusas | Atendido no ensaio |
| Privacidade preservada | Limiar 5; isolamento entre empresas; devolutiva sem nomes | Atendido no ensaio |
| Dados de origem identificados | Onda FIB-T, setor, fator, versão do instrumento | Atendido |
| Dependências | PR A com migration remota autorizada; PR B; publicação | **Pendente (autorização)** |
| Suporte e recuperação | Seção 2 e pacote | **Pendente (aprovação do pacote e responsável)** |

**Decisão de liberação:** o pacote "Q2 completo + Q1 preparação + Q3 prática" fica **pronto para aprovação**, não para operação. Entra em piloto quando D1 estiver aplicado, a D10 estendida, o pacote aprovado e o responsável operacional nomeado. O marco "piloto completo Q1–Q5" não é alcançável neste candidato.
