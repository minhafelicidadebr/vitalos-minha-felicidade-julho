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
