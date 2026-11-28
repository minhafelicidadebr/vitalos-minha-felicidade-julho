# Passagem de bastão — VitalOS Empresarial, Onda 0 (28/11/2026)

> Para a próxima sessão (Claude Code). Leia este arquivo e a matriz
> `docs/vitalos/piloto/PRONTIDAO_VITALOS_EMPRESARIAL.md` antes de agir.
> Super prompt de referência: **"VitalOS Empresarial — da contratação ao próximo ciclo"**
> (missão, ondas 0–5, matriz única, ToT de 3 ramos por onda, critério de conclusão por onda).

## 1. Estado do Git

| Item | Valor |
| --- | --- |
| `main` | `78ed5d5` (merge #83). **Não alterada.** |
| PR #84 (Codex, rascunho) | `codex/empresarial-ativacao-q1` @ `968c63c`: primeiro RH aceito → `/rh` com cartão de preparação Q1 + matriz inicial |
| PR #85 (esta sessão, rascunho) | `feat/empresarial-papel-efetivo-academia`, **empilhado sobre o #84** (base = `codex/empresarial-ativacao-q1`) |
| Merge | Primeiro #84, depois rebase do #85 na `main`. Nada foi enviado à `main`, a produção, migrations ou Lovable |

Commits do #85: `bf81e4f` Academia + matriz · `fd53b2c` guarda de rota + `/experimentos` · `66661c5` telas de leitura (pendente = visão restrita) · `e1a3b1a` `/ondas`, economia viva, ajuda contextual · `87628e8` guarda de consumidores + matriz 0.3b/D-06 · este arquivo.

## 2. O que foi feito (super prompt §3 e Onda 0)

1. **Matriz única de prontidão** expandida: fases 0–5 com estado e evidência, matriz por perfil (vê · aprende · executa · acompanha), registro ToT, decisões D-01…D-06, protocolo de recorte e próximos recortes com critério de aceite.
2. **Recorte 0.3 (papel efetivo):** `resolveRoleContext()` em `src/engine/rbac/rbac.ts` (`session | demo | pending`) + hook `src/app/identity/useEffectiveRole.ts`. `/academia` com conta real usa só o recorte por papel, sem sinais fictícios (`getSectorData`, `MARINA_VIAT_RESULT`).
3. **Recorte 0.3b:** mesma regra em `DemoRouteGuard` (liberava rota pela persona salva no navegador, inclusive para conta real), `/experimentos`, `/onda`, `/devolutiva`, `/copilota`, `/viat`, `/reconhecimento`, `/ondas` e `useLiveEconomy`. Regra única: **sessão pendente = visão mais restrita**.
4. **Guardas:** `src/routes/academia.role-source.test.ts` e `src/app/identity/effective-role-consumers.test.ts`, que trava a lista fechada dos 11 leitores diretos de `usePersona`, cada um com motivo. Uma tela nova que leia a persona quebra o teste.

## 3. Verificação e limites

- `bun test src`: sem falha nova (comparação nome a nome com a linha de base). As 25 falhas existentes vêm do ambiente: `ajv`, `ajv-formats` e `motion-utils` não instalados porque 35 entradas do `bun.lock` apontam para um espelho privado bloqueado naquela sessão.
- `tsc --noEmit`: só erros `Cannot find module 'ajv'`.
- **Primeira ação aqui:** `bun install && bun run gate` com o lockfile resolvido. Se ficar verde, registrar na matriz.
- **Sem prova em navegador nem homologação.** Tudo está como "Implementada", nada como "Comprovada".

## 4. Onde parou

Recorte **0.2 (revogar e reenviar convite de integrante)**. Apenas leitura, sem edição. Achado: `public.member_invites` (`20260714120000`) tem `used_at` e `expires_at`, mas **nenhum campo de revogação**, e `reserve_member_invite` (`20261121120000`) conta assento por `used_at IS NULL AND não expirado`. Portanto:

- revogar exige **migration** (ex.: `revoked_at`/`revoked_by` + RPC `SECURITY DEFINER` só para `service_role`, e a contagem de assentos e o aceite passando a ignorar convites revogados) → **pedir autorização ao founder antes**. Usar a skill `supabase-rls-security-definer-auditor`.
- reenvio = revogar o anterior + emitir novo na mesma transação, para não ocupar dois assentos.
- Critério de aceite: convite revogado não aceita; reenvio invalida o anterior; assento liberado; teste de servidor + teste de vínculo com conta de outra organização (ver PR #67, aberto, sobre isolamento de assentos).

## 5. Decisões pendentes do founder

| ID | Decisão | Bloqueia |
| --- | --- | --- |
| D-01 | Unidades: modelar `org_units` agora ou piloto com 1 unidade | Troca de unidade e recortes por unidade |
| D-02 | Quais módulos Q3/Q4/Q5 entram no pacote contratado (hoje só `Q1`,`Q2`) | Q3–Q5 institucionais |
| D-03 | Instrumento PERMA+V (versão, método, fonte) | Coleta Q3 |
| D-04 | **Ambiente de homologação + contas de teste** | Toda passagem para "Comprovada" |
| D-05 | Trocar o espelho privado do `bun.lock` pelo registro público | Gate em ambientes sem o espelho |
| D-06 | Trocar listas de bloqueio (`/onda`, `/devolutiva`, `canSeeCollective`) por listas de permissão | SST/CIPA/consultor/parceiro veem a visão agregada demonstrativa |
| — | Autorizar a migration do recorte 0.2 | Revogação e reenvio |

## 6. Próxima fila (ordem)

1. `bun run gate` verde → atualizar a evidência na matriz.
2. 0.2 revogação/reenvio (após autorização da migration).
3. 0.3c: `roleId` nos `<ContextualHelp>` restantes (`LiderDashboard`, `/embaixadorias`, seções internas do `/viat`) + `AppShell` sem piscar o menu de demo durante o carregamento (coordenar com o Lovable).
4. Com D-04 definida: prova 0.1 em homologação (org limpa → primeiro admin → aceite → `/rh` → preparação Q1 → retomada, com 2ª org para isolamento) e prova 0.3b (conta colaborador com persona "RH" salva não abre rota de RH nem vê agregado).
5. 1.1 prova Q1 RH + SST → 2.1 re-prova Q2 institucional → 5.0 contrato de evidências do Q5.

Regras: CLAUDE.md (branch por recorte, `bun run gate` antes do commit, nunca push na `main` sem confirmação, nada de produção sem pedido explícito), ToT de 3 ramos registrado na §3 da matriz, um recorte por PR em rascunho.
