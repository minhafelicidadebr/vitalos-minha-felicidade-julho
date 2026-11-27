# Roteiro · teste de convite com organização fictícia

**Objetivo:** provar o convite de ponta a ponta (RH cria → pessoa aceita → perfil criado), com o limite de assentos do plano, sem pessoas nem dados reais.
**Estado em 23/11/2026:** nível 1 provado; nível 2 não executado (depende de créditos, build, publicação e autorização).

**Migration de assentos, quatro fatos separados:** (1) função `reserve_member_invite` presente no banco do projeto; (2) permissões conferidas (`anon`/`authenticated` sem EXECUTE, `service_role` com); (3) ausente do histórico `supabase_migrations.schema_migrations`; (4) convite de ponta a ponta no app publicado **não testado**. Este roteiro trata só do item 4.

## Nível 1 · pilha descartável local (sem custo, já provado)

| Item | Resultado |
|---|---|
| Função no código × migration | Os 7 parâmetros chamados por `member-invite.server.ts` batem com `reserve_member_invite` (conferido em 23/11) |
| Testes do servidor de convites | 21 pass / 0 fail na `main` (`src/lib/api/member-invite.server.test.ts`); o PR #67, ainda não mesclado, acrescenta 2 testes de isolamento entre organizações (23 pass) |
| Jornada completa em banco descartável | `scripts/integ-local/mo2-journey.ts`: 54 verificações, inclui convite e aceite por papel, 2º administrador recusado no Piloto, 2 pedidos simultâneos com 1 assento (1 aceito), convite de colaborador com assentos cheios, reaceite recusado |
| Repetir | Ver "Como reproduzir o nível 1" abaixo |

### Como reproduzir o nível 1 (outra pessoa, sem dados reais, sem rede do projeto)

Tudo roda em loopback (`127.0.0.1`) numa pilha Docker descartável; **nada toca o banco do projeto, o Lovable ou dados de pessoas**. O script cria os próprios dados fictícios (organizações e contas de teste) dentro dessa pilha; ao final, tudo é descartado.

**Antes de começar**
- Docker em execução; `bun` instalado; `bun install` já feito no checkout.
- Checkout limpo da `main` (a cadeia de migrations aplicada é a do checkout: `apply-chain.sh` mostra o `candidato:` e recusa banco não vazio).
- As imagens da pilha estão listadas em `scripts/integ-local/README.md`. Se não estiverem na máquina, o Docker as baixa uma vez (isso não consome créditos do Lovable).
- As portas `57921`, `57922`, `57924` e `8094` precisam estar livres.

**Passos** (PowerShell ou shell POSIX, na raiz do repositório; o passo 3 usa um segundo terminal)
| # | Comando | O que esperar |
|---|---|---|
| 1 | `bun scripts/integ-local/keygen.ts` | Cria `scripts/integ-local/.env.integ` (ignorado pelo Git; **não abrir, não compartilhar**). Se já existir, imprime "chaves já existem" |
| 2 | `sh scripts/integ-local/reset.sh` | Recria a pilha do zero, aplica a cadeia e termina com "pilha recriada". A linha `guard ok: projeto vitalos-q1q2-integ …` confirma só loopback; qualquer "GUARD FAIL" significa parar |
| 3 | `bun --no-env-file scripts/integ-local/app.ts` (**deixar rodando**) | Roda guard e preflight e sobe o app em `127.0.0.1:8094` |
| 4 | `bun --no-env-file scripts/integ-local/mo2-journey.ts` (segundo terminal) | Uma linha `PASS`/`FAIL` por verificação; no fim, "MO2: todas as verificações passaram." (código de saída 0) ou "MO2: N verificação(ões) falharam." (código 1). Prova registrada em 22/11 (`provas/JORNADA_Q2_INTEGRADA_2026-11-22.txt`): 54 `PASS`, 0 `FAIL`; **não reexecutada em 23/11**, porque nenhum código mudou |
| 5 | Encerrar: `Ctrl+C` no app; depois `docker compose -f scripts/integ-local/compose.yml --env-file scripts/integ-local/.env.integ down` | Pilha e dados descartados (sem volume nomeado) |

**Se falhar:** não repetir em loop nem apontar para outro ambiente. Guardar a primeira linha `FAIL` e a saída do `guard.sh` e registrar. Esta reprodução prova o **código** em ambiente descartável; **não** prova o app publicado nem o banco do projeto (fato 4 da migration continua não testado).

## Nível 2 · app publicado, banco do projeto (não executar sem autorização)

**Pré-condições, todas obrigatórias**
1. Créditos do Lovable restabelecidos (renovação ~26/11); sem top-up.
2. Build com sucesso do commit da `main` (o saldo e o estado do projeto são conferidos antes; se a ação exigir créditos, parar e pedir decisão).
3. Instrução direta do proponente para publicar.
4. Autorização específica do proponente para criar uma **organização de teste** no banco do projeto e para a limpeza ao final.
5. Contas de teste com endereços de e-mail **do próprio proponente** (aliases ou contas dele), nunca de pessoas da equipe.

**Passos** (sempre na organização de teste, plano Growth)
| # | Ação | Papel | Esperado |
|---|---|---|---|
| 1 | Criar a organização de teste e o primeiro RH pelo fluxo de plataforma | Plataforma | RH ativo; 1 administrador |
| 2 | Convidar uma conta de teste como colaborador | RH | Convite criado; link `/aceitar-convite/…` |
| 3 | Aceitar o convite na conta de teste | Colaborador de teste | Perfil `COLABORADOR`; abre `/colaborador` |
| 4 | Aceitar o mesmo convite outra vez | Colaborador de teste | Recusado ("já utilizado") |
| 5 | Convidar administradores até o limite do Growth (5) | RH | O 6º é recusado com mensagem de upgrade; convite de colaborador continua permitido |
| 6 | Conferir no banco (leitura): contagem de convites e perfis só da organização de teste | — | Coerente com os passos |
| 7 | Limpeza **decidida antes do passo 1**. O ensaio local (PR #69) mostrou que a organização não sai só "apagando a organização": `first_admin_invites` é imutável e os gatilhos de módulo barram o ledger e as ondas. Opções: M1 (gatilhos desabilitados, procedimento autorizado), M2 (rotina oficial, PR #72) ou manter a organização marcada como teste, com contas do proponente | Proponente | Conforme a opção: nenhum resíduo, confirmado por leitura; ou organização de teste registrada como tal |

**Parar e registrar** se: aparecer "função não encontrada" (cache de esquema da API: pedir ao proponente a recarga, não repetir), qualquer dado de outra organização, ou qualquer erro de permissão inesperado.

**Custo:** o uso do app e do banco não deve consumir créditos de IA do Lovable (esses cobrem o agente), mas isso não está provado; se uma etapa pedir créditos, parar e informar.

## Fora do escopo deste roteiro
Convite real a pessoas do Instituto, publicação, top-up, "Fix build", alteração do histórico de migrations (`supabase_migrations.schema_migrations` tem só 2 registros e não contém `20261121120000`; não inserir linhas manualmente sem um procedimento oficial compatível com o Lovable).
