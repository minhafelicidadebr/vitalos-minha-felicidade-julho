# Roteiro · teste de convite com organização fictícia

**Objetivo:** provar o convite de ponta a ponta (RH cria → pessoa aceita → perfil criado), com o limite de assentos do plano, sem pessoas nem dados reais.
**Estado em 23/11/2026:** nível 1 provado; nível 2 não executado (depende de créditos, build, publicação e autorização).

**Migration de assentos, quatro fatos separados:** (1) função `reserve_member_invite` presente no banco do projeto; (2) permissões conferidas (`anon`/`authenticated` sem EXECUTE, `service_role` com); (3) ausente do histórico `supabase_migrations.schema_migrations`; (4) convite de ponta a ponta no app publicado **não testado**. Este roteiro trata só do item 4.

## Nível 1 · pilha descartável local (sem custo, já provado)

| Item | Resultado |
|---|---|
| Função no código × migration | Os 7 parâmetros chamados por `member-invite.server.ts` batem com `reserve_member_invite` (conferido em 23/11) |
| Testes do servidor de convites | 21 pass / 0 fail (`src/lib/api/member-invite.server.test.ts`) |
| Jornada completa em banco descartável | `scripts/integ-local/mo2-journey.ts`: 54 verificações, inclui convite e aceite por papel, 2º administrador recusado no Piloto, 2 pedidos simultâneos com 1 assento (1 aceito), convite de colaborador com assentos cheios, reaceite recusado |
| Repetir | `sh scripts/integ-local/reset.sh` → `bun --no-env-file scripts/integ-local/app.ts` → `bun --no-env-file scripts/integ-local/mo2-journey.ts` |

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
| 7 | Limpeza: remover a organização de teste e suas contas, pelo procedimento autorizado | Proponente | Nenhum resíduo; confirmar por leitura |

**Parar e registrar** se: aparecer "função não encontrada" (cache de esquema da API: pedir ao proponente a recarga, não repetir), qualquer dado de outra organização, ou qualquer erro de permissão inesperado.

**Custo:** o uso do app e do banco não deve consumir créditos de IA do Lovable (esses cobrem o agente), mas isso não está provado; se uma etapa pedir créditos, parar e informar.

## Fora do escopo deste roteiro
Convite real a pessoas do Instituto, publicação, top-up, "Fix build", alteração do histórico de migrations (`supabase_migrations.schema_migrations` tem só 2 registros e não contém `20261121120000`; não inserir linhas manualmente sem um procedimento oficial compatível com o Lovable).
