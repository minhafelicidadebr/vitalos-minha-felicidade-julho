# Decisão · o limite do plano vale só para administradores · 21/11/2026

**Decisão:** founder, 21/11/2026. O `maxAdminSeats` limita **administradores**, como dizem o nome do campo, a oferta pública em `/privacidade-comercial` e a mensagem de recusa.

**Antes:** `createMemberInvite` contava todo `profile` da organização e aplicava o limite a qualquer convite. No Piloto (1 assento), quem criava a organização ocupava o único assento, e o primeiro convite de qualquer pessoa era recusado.

**Agora** (`src/lib/api/member-invite.server.ts`):
- **Quando o limite se aplica:** só a convites com papel administrativo, ou seja, papéis de `orgAdminRoles()`, a mesma fonte de `requireOrgAdmin` (no pack enterprise, `RH_ADMIN`).
- **O que é contado:** perfis administrativos ativos mais convites administrativos pendentes e ainda não expirados. Assim, dois convites simultâneos não passam do teto.
- **Outros papéis:** convites para eles não consomem assento.

**O que não muda:**
- os tetos de cada plano (Piloto 1, Crescimento 5, Enterprise ilimitado);
- o limite de convites por onda (`maxInvitesPerWave`), que é o teto das respostas;
- a validação de papel pelo pack;
- migrations e RLS.

**Testes** (`member-invite.server.test.ts`):
- Piloto com 1 admin: convite de `COLABORADOR` passa;
- Piloto com 1 admin: convite de `RH_ADMIN` é recusado com a mensagem de upgrade;
- convite de admin pendente conta como assento; convite expirado não conta.

**Fora do escopo:** o plano Piloto não tem limite próprio de pessoas com conta. Se a área comercial quiser esse limite, ele deve ser um campo novo e explícito, não o `maxAdminSeats`.

## Revisão 2 · falha fechada e reserva atômica (21/11/2026)

**O que mudou:**
- **Reserva atômica.** A contagem e o INSERT agora acontecem na RPC `reserve_member_invite` (migration `20261121120000_reserve_member_invite_atomic.sql`), na mesma transação.
  - Um `pg_advisory_xact_lock` por organização serializa as emissões.
  - A função é `SECURITY DEFINER` com `search_path = public`.
  - EXECUTE é só de `service_role`; `anon`, `authenticated` e `PUBLIC` foram revogados, e um bloco no fim da migration confere isso.
- **Falha fechada.** Nestes casos o servidor devolve uma mensagem recuperável ("Não foi possível conferir os assentos do plano agora. Nenhum convite foi criado…") e não cria nada:
  - leitura da organização com erro;
  - erro na RPC;
  - resposta vazia ou malformada;
  - lista de papéis administrativos ausente (a RPC responde `admin_roles_missing`).

**Contrato preservado:**
- Piloto com 1 administrador.
- Só papéis de `orgAdminRoles()` entram na contagem.
- Convite administrativo pendente e válido reserva assento; convite expirado não reserva.
- Outros papéis não consomem assento.
- Plano sem teto: o servidor passa `NULL`.

### Provas

**No código** (`member-invite.server.test.ts`, 20 testes):
- falha de leitura nas três formas (erro, vazio, malformado): mensagem recuperável e nada criado;
- duas emissões simultâneas com 1 assento livre: exatamente uma obtém o convite;
- parâmetros enviados à RPC: papéis canônicos e teto do plano.

O fake desses testes serializa como o lock. Ele prova o contrato do servidor, **não** a atomicidade do banco.

**No banco local descartável** (`vitalos-q1q2-integ-db`, Postgres 17, loopback `127.0.0.1:57922`, derrubado ao fim). A cadeia completa foi aplicada: 72 migrations, incluindo a nova.

| Cenário | Resultado |
|---|---|
| RPC real, 20 chamadas paralelas, 1 assento | 1 convite, 19 `seat_quota_exceeded` |
| Controle negativo: mesma lógica sem lock, janela de 0,3 s | 5 convites (a prova detecta a corrida) |
| Controle com lock, mesma janela | 1 convite |
| Sobreposição forçada: sessão 1 reserva e segura a transação 3 s | A sessão 2 esperou ~3,3 s e recebeu `seat_quota_exceeded` |
| Perfil `RH_ADMIN` ativo no Piloto | Convite `RH_ADMIN` recusado; `COLABORADOR` passa |
| Convites admin expirados | Liberam o assento; o pendente válido seguinte ocupa o assento |
| Lista de papéis vazia | `admin_roles_missing` |
| Teto `NULL` | Convite criado |
| Chamada como `authenticated` | `permission denied` |

### Não provado

- ~~Caminho completo servidor → PostgREST → RPC~~: provado na Revisão 3 (abaixo).
- **Banco remoto:** a migration **não** foi aplicada. Aplicar exige autorização explícita do founder. Sem ela, `createMemberInvite` falha fechado em produção (a RPC não existe), e convidar fica indisponível até a aplicação.

## Revisão 3 · plano alterado no meio e prova ponta a ponta (21/11/2026)

### Plano alterado entre a leitura e a reserva

Hipótese: o servidor calcula o teto a partir de `organizations.plan` lido **antes** da RPC; um downgrade confirmado nesse intervalo faria a RPC aplicar um teto desatualizado.

Correção mínima (mesma migration `20261121120000`, ainda não aplicada em lugar nenhum fora do local):

- novo parâmetro `p_expected_plan TEXT`: o plano sobre o qual o servidor calculou o teto;
- dentro da transação, depois da trava, a RPC relê `plan` com `FOR SHARE`. Isso bloqueia um `UPDATE` concorrente até o fim da reserva; se o `UPDATE` já foi confirmado, a RPC vê o valor novo;
- plano diferente → `plan_changed` → o servidor responde com a mensagem recuperável e **não cria convite**. A tentativa seguinte já lê o plano novo.

Hoje nenhum código do app altera `organizations.plan` (só o provisionamento insere). A mudança vem de operação manual, por isso a hipótese é rara, mas fica fechada.

Como a assinatura mudou para 7 argumentos, `REVOKE`/`GRANT` e a conferência de privilégios usam a assinatura nova. A migration nunca foi aplicada remotamente, então não fica sobrecarga antiga.

### Semântica de "perfil ativo"

`profiles` não tem coluna de status, desativação ou remoção lógica. Uma pessoa sai da organização quando a linha é apagada (ou quando o usuário de `auth.users` é apagado, por `ON DELETE CASCADE`), e o assento é liberado. Não existe estado "inativo" que deveria liberar assento, então nada foi modelado. Se um dia houver suspensão de conta sem apagar o perfil, a contagem da RPC precisa passar a filtrar esse estado.

### Prova ponta a ponta (pilha descartável `vitalos-q1q2-integ`, loopback)

Cadeia completa aplicada (72 migrations, a conferência de privilégios passou). O script chama a função **real** `createMemberInvite` do servidor, que usa supabase-js → Kong (127.0.0.1:57921) → PostgREST → RPC. Dados sintéticos (`@e2e.test`). A pilha foi derrubada depois; nenhum container restou.

| Prova | Resultado |
|---|---|
| Piloto com 1 `RH_ADMIN` ativo · convite `COLABORADOR` | Criado |
| Piloto com 1 `RH_ADMIN` ativo · convite `RH_ADMIN` | Recusado com mensagem de upgrade |
| Growth (5) com 4 admins · 10 emissões `RH_ADMIN` simultâneas | 1 criado, 9 recusados; 1 convite admin pendente no banco |
| Downgrade growth → pilot em transação aberta durante a emissão | A emissão esperou ~2,5 s, recebeu `plan_changed` e respondeu "indisponível"; 0 convites criados |
| Nova tentativa depois do downgrade confirmado | Criado, com o teto do plano novo |
| API fora do ar (porta sem serviço) | "Indisponível", nada criado |
| RPC chamada pela API com a chave anônima | HTTP 401, código `42501` |

Testes de código: `member-invite.server.test.ts` com o novo caso de plano alterado (21 testes) e `scripts` (manifesto regenerado), 441 aprovados, 0 falhas; `tsc` limpo.

### Ainda não provado

- Banco remoto: a migration **não** foi aplicada; exige autorização explícita do founder. Sem ela, criar convite fica indisponível em produção (falha fechada).
- Downgrade que exceda o novo teto: a prova mostra a recusa por plano alterado; não há um caso separado com admins acima do novo teto, porque a recusa acontece antes da contagem.
