import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Jornada P0 nº1: landing pública (`/`, PUBLIC_PREFIXES em AuthGate.tsx) —
// a única rota que renderiza sem depender da injeção de env do Supabase
// pelo Lovable Cloud (ver demo-journey.spec.ts para o porquê das outras
// jornadas ficarem skip localmente).
test.describe("landing pública", () => {
  test("carrega e mostra a proposta de valor", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/VitalOS/i);
    // Dois botões "Entrar no app" existem (header desktop + rodapé) — o
    // primeiro do DOM já basta para provar que a proposta de valor carregou.
    await expect(page.getByRole("button", { name: /entrar no app/i }).first()).toBeVisible();
  });

  test("zero violação a11y crítica ou séria", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    if (blocking.length > 0) {
      console.log(JSON.stringify(blocking, null, 2));
    }
    expect(blocking).toEqual([]);
  });
});
