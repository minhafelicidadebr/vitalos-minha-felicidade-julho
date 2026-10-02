# Tecnologia (pilha real, por evidência do repositório)

| Camada | Tecnologia | Evidência |
|---|---|---|
| Frontend/SSR | React + TanStack Start/Router, Vite, Tailwind, Radix, lucide | `vite.config.ts`, `src/routes/`, `package.json` |
| Runtime | Nitro preset `cloudflare-module` → Cloudflare Workers | `.output/nitro.json`, `wrangler.hml.jsonc` |
| Backend de dados | Supabase (Postgres, RLS, RPC `SECURITY DEFINER`) | `supabase/migrations/` |
| Autenticação | Supabase Auth (link mágico OTP), `requireOrgAdmin` server-side | `src/routes/entrar.tsx`, `src/lib/auth/authorize.server.ts` |
| Perímetro HML | Cloudflare Access + JWT RS256 validado no Worker | `src/lib/fibt-hml/cloudflare-access-jwt.server.ts` |
| Testes | `bun test` + Testing Library; suítes SQL em container descartável | `bun run gate`, `bun run db:replay` |
| CI | GitHub Actions `gate.yml` (`build:ci` + `gate`) | `.github/workflows/gate.yml` |
| Produção | Lovable (sync com `main`; publicação manual) | `docs/AMBIENTES_E_DEPLOY.md` |

## Convenções arquiteturais (invioláveis)

- `src/engine/` é puro e **nunca** importa `@/domain` (teste
  `src/engine/engine-domain-boundary.test.ts`). Vocabulário e definições são
  injetados pela composição.
- Código `*.server.ts` fala com o banco; `*.functions.ts` expõe server functions.
- Toda escrita privilegiada passa por RPC `SECURITY DEFINER` com `EXECUTE`
  restrito a `service_role`, chamada após `requireOrgAdmin`.
- Ambiente decidido por `scripts/environment-preflight.ts` (sem default).
- `supabase/config.toml` aponta para produção: nunca `link`/`db push` sem ref
  explícito e autorizado.

Nenhuma tecnologia é substituída por esta fundação.
