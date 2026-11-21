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

- **Caminho completo servidor → PostgREST → RPC:** não testado, porque o auth/rest da stack não foi subido. O que foi provado é a RPC direto no Postgres e o servidor com o fake.
- **Banco remoto:** a migration **não** foi aplicada. Aplicar exige autorização explícita do founder. Sem ela, `createMemberInvite` falha fechado em produção (a RPC não existe), e convidar fica indisponível até a aplicação.
