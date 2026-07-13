import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Jornada P0 nº2: portão de demo → Academia/Panorama/Benchmark.
//
// BLOQUEIO CONHECIDO (registrado no handoff 2026-07-13): `AuthGate.tsx`
// chama `supabase.auth.getSession()` em toda rota não-pública. O client
// (`src/integrations/supabase/client.ts`) lança exceção síncrona se
// SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY não existirem — e este projeto usa
// `@lovable.dev/vite-tanstack-config`, que faz sua própria "VITE_* env
// injection" (não dotenv padrão). Fora da plataforma Lovable/CI com esses
// secrets configurados, isto é inalcançável — não é bug desta suíte.
// Rode com SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY (chave publishable/anon,
// client-safe) no ambiente para destravar.
const hasSupabaseEnv = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY,
);

test.describe("jornada demo — Academia, Panorama, Benchmark", () => {
  test.skip(
    !hasSupabaseEnv,
    "requer SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY no ambiente (env injection do Lovable Cloud) — ver comentário no topo do arquivo",
  );

  test.beforeEach(async ({ page }) => {
    // O portão de demo é um modal na landing pública (src/routes/index.tsx),
    // não uma rota própria — abre pelo botão "Entrar no app".
    await page.goto("/");
    await page.getByRole("button", { name: /entrar no app/i }).first().click();
    await page.getByLabel(/senha de acesso/i).fill("luzpazeamor");
    await page.getByRole("button", { name: /entrar na demonstração/i }).click();
  });

  for (const route of ["/academia", "/panorama", "/benchmark"] as const) {
    test(`${route} carrega e mostra a origem do dado`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("status").filter({ hasText: /dado|demonstra/i })).toBeVisible();
    });

    test(`${route} — zero violação a11y crítica ou séria`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      if (blocking.length > 0) {
        console.log(`${route}:`, JSON.stringify(blocking, null, 2));
      }
      expect(blocking).toEqual([]);
    });
  }
});
