// Ensaio pela UI real. Use a instalação local de Playwright (PLAYWRIGHT_MODULE_PATH
// pode apontar para o pacote do runtime desktop). Nenhuma dependência da aplicação.
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as wait } from "node:timers/promises";
import type { BrowserType, Page } from "playwright";
// O harness do banco usa Bun; o transporte oficial de navegador roda em Node.
const run = promisify(execFile);
async function institutionalSql(query: string) {
  if (!query.startsWith("SELECT ")) throw new Error("A comprovação de navegador só relê o banco.");
  const result = await run(
    "bun",
    [
      "--no-env-file",
      "-e",
      "import {institutionalSql} from './scripts/institutional-local'; process.stdout.write(await institutionalSql(process.argv[1]))",
      query,
    ],
    { timeout: 15000, windowsHide: true },
  );
  return result.stdout.trim();
}
const app = "http://localhost:8091",
  mail = "http://127.0.0.1:57624",
  api = "http://127.0.0.1:57621";
await run(
  "bun",
  [
    "--no-env-file",
    "-e",
    "import {institutionalEnv} from './scripts/institutional-local'; await institutionalEnv()",
  ],
  { timeout: 30000, windowsHide: true },
);
console.log("Alvo institucional local validado. Abrindo navegador isolado.");
const { chromium }: { chromium: BrowserType } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE_PATH || "playwright",
);
const browser = await chromium.launch({ channel: "msedge", headless: true, timeout: 30000 });
const out = join(process.cwd(), ".institutional-admin.local", "q1-preparation");
mkdirSync(out, { recursive: true });
const downloads = new Map<string, string>();
const path = "/ivo-integral/preparar-q1";
const check = (condition: unknown, label: string) => {
  if (!condition) throw new Error(label);
  console.log("PASS " + label);
};
async function login(account: "alfa" | "beta" | "platform", destination: string) {
  const email = account + "@institutional.test";
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 },
  });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return [app, api].includes(url.origin) || ["data:", "blob:"].includes(url.protocol)
      ? route.continue()
      : route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const list = async () =>
    (
      await (
        await fetch(mail + "/api/v1/search?query=" + encodeURIComponent("to:" + email), {
          signal: AbortSignal.timeout(5000),
        })
      ).json()
    ).messages as { ID: string; To: { Address: string }[] }[];
  const before = new Set((await list()).map((m) => m.ID));
  await page.goto(app + "/entrar?redirect=" + encodeURIComponent(destination), {
    waitUntil: "networkidle",
  });
  await page.getByLabel("E-mail corporativo").fill(email);
  await page.getByRole("button", { name: "Entrar com link mágico" }).click();
  await page.getByText("Verifique seu e-mail", { exact: true }).waitFor();
  let link: URL | undefined;
  for (let attempt = 0; attempt < 24 && !link; attempt++) {
    const latest = (await list()).find(
      (m) => !before.has(m.ID) && m.To.some((t) => t.Address === email),
    );
    if (latest) {
      const full = await (
        await fetch(mail + "/api/v1/message/" + encodeURIComponent(latest.ID))
      ).json();
      const match = /(https?:\/\/[^"'\s<>]+\/auth\/v1\/verify[^"'\s<>]+)/.exec(full.HTML);
      if (match) link = new URL(match[1].replaceAll("&amp;", "&"));
    }
    if (!link) await wait(500);
  }
  if (
    !link ||
    link.origin !== api ||
    link.pathname !== "/auth/v1/verify" ||
    new URL(link.searchParams.get("redirect_to") || "about:blank").origin !== app
  )
    throw new Error("Link local da fixture indisponível.");
  try {
    await page.goto(link.href, { waitUntil: "domcontentloaded" });
    await page.waitForURL(
      (u: URL) => u.origin === app && !["/entrar", "/auth/callback"].includes(u.pathname),
      { timeout: 30000 },
    );
  } catch {
    throw new Error("O retorno do link mágico local não completou.");
  }
  if (new URL(page.url()).pathname !== destination) await page.goto(app + destination);
  return page;
}
const roleState = () =>
  institutionalSql(
    "SELECT revision::text||':'||enabled::text FROM public.org_module_entitlements e JOIN public.organizations o ON e.org_id=o.id WHERE o.slug='institutional-alfa' AND module='Q1'",
  );
const sqlCycle = await institutionalSql(
  "SELECT y::text||'-T'||q::text FROM generate_series(2027,2097) y CROSS JOIN generate_series(1,4) q WHERE NOT EXISTS (SELECT 1 FROM institutional.q1_preparation_events WHERE cycle_key=y::text||'-T'||q::text) ORDER BY y,q LIMIT 1",
);
if (!/^20\d{2}-T[1-4]$/.test(sqlCycle)) throw new Error("Ciclo novo para o ensaio indisponível.");
const initial = await roleState();
const [initialRev, enabled] = initial.split(":");
if (!/^\d+$/.test(initialRev) || !["true", "false"].includes(enabled))
  throw new Error("Habilitação local indeterminada.");
const title = "Pausas durante a jornada";
let platform: Page,
  attemptedEnable = false;
let completedAlfa: Page | undefined;
async function selectLocalAlfa() {
  await platform.goto(app + "/plataforma", { waitUntil: "domcontentloaded" });
  const section = platform.getByRole("region", { name: "Habilitação empresarial" });
  const option = section.locator("option").filter({ hasText: "institutional-alfa" });
  await option.waitFor({ state: "attached" });
  const localAlfa = await institutionalSql(
    "SELECT id FROM public.organizations WHERE slug='institutional-alfa' AND pack_id='enterprise'",
  );
  check(
    (await option.getAttribute("value")) === localAlfa,
    "empresa do aplicativo corresponde à fixture no banco local validado",
  );
  await section.getByRole("combobox").selectOption(localAlfa);
  return section;
}
async function toggle(button: string, revision: number) {
  const section = await selectLocalAlfa();
  const row = section
    .getByText(new RegExp("^Q1 · COPSOQ .*revisão " + revision + "$"))
    .locator("..");
  await row.getByRole("button", { name: button, exact: true }).click();
  await platform.getByRole("button", { name: "Confirmar alteração", exact: true }).click();
  await platform.getByRole("group", { name: "Confirmar alteração" }).waitFor({ state: "hidden" });
}
async function openCycle(page: Page) {
  await page.getByLabel("Ciclo de preparação").fill(sqlCycle);
  await page.getByRole("button", { name: "Abrir ciclo", exact: true }).click();
  await page.locator("legend").filter({ hasText: sqlCycle }).waitFor();
}
const recovery = process.argv.find((v) => v.startsWith("--restore-alfa-revision="))?.split("=")[1];
if (recovery !== undefined) {
  try {
    check(
      /^\d+$/.test(recovery) && initial === recovery + ":true",
      "a revisão informada é a habilitação temporária ainda vigente",
    );
    platform = await login("platform", "/plataforma");
    await toggle("Desabilitar Q1", Number(recovery));
    check(
      (await roleState()) === String(Number(recovery) + 1) + ":false",
      "habilitação inicial da Alfa restabelecida",
    );
  } finally {
    await browser.close();
  }
  process.exit(0);
}
try {
  platform = await login("platform", "/plataforma");
  if (enabled === "true") await selectLocalAlfa();
  if (enabled === "false") {
    attemptedEnable = true;
    await toggle("Habilitar Q1", Number(initialRev));
  }
  const page = await login("alfa", "/rh");
  await page.getByRole("link", { name: "Preparar avaliação Q1" }).click();
  await openCycle(page);
  await page.getByRole("link", { name: "Revisar o comunicado aos trabalhadores" }).click();
  const second = await page.context().newPage();
  await second.goto(app + path);
  await openCycle(second);
  for (const p of [page, second]) {
    await p.getByLabel(/Canal institucional para dúvidas/).fill("Plantão coletivo da Alfa");
    await p.getByLabel(/Onde a equipe acompanhará/).fill("Mural da expedição");
  }
  await Promise.all(
    [page, second].map((p) =>
      p.getByRole("button", { name: "Registrar comunicado revisado" }).click(),
    ),
  );
  await Promise.all(
    [page, second].map((p) =>
      p
        .getByText(/Registro salvo no ciclo|O registro mudou em outra sessão/)
        .first()
        .waitFor(),
    ),
  );
  const losers = [];
  for (const p of [page, second])
    if (await p.getByText(/O registro mudou em outra sessão/).isVisible()) losers.push(p);
  check(
    losers.length === 1,
    "duas abas na revisão zero geraram uma revisão e um conflito explícito",
  );
  await losers[0].getByRole("button", { name: "Reler preparação" }).click();
  await page.getByRole("button", { name: "Baixar comunicado" }).waitFor();
  await second.close();
  async function download(label: string, file: string) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: label }).click();
    const downloaded = await (await pending).path();
    if (!downloaded) throw new Error("Arquivo de ensaio indisponível.");
    downloads.set(file, downloaded);
  }
  await download("Baixar comunicado", "comunicado.pdf");
  await page.getByText("Declarar um controle", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("Controle existente", { exact: true }).selectOption("breaks");
  await page.getByLabel(/Recorte de trabalho/).fill("Expedição · turno da noite");
  await page.getByRole("button", { name: "Registrar controle declarado" }).click();
  const card = page.getByRole("article", { name: /Pausas durante a jornada/ });
  await card.getByText("Conferir a cobertura", { exact: true }).click();
  await card.getByLabel(/Como a cobertura foi conferida/).selectOption("dialogue");
  await card
    .getByLabel(/Referência da evidência coletiva/)
    .fill("Reunião coletiva sobre a escala de pausas");
  await card.getByLabel(/Cobertura encontrada/).selectOption("partial");
  await card
    .getByLabel(/Qual condição ainda precisa mudar/)
    .fill("Falta cobertura na primeira hora do turno.");
  await card.getByRole("button", { name: "Salvar conferência" }).click();
  await card.getByText("Planejar medida para esta lacuna", { exact: true }).click();
  await card.getByLabel(/Mudança na organização/).fill("Reorganizar a cobertura na primeira hora.");
  await card.getByLabel(/Função responsável/).fill("Supervisão de expedição");
  await card.getByLabel(/Prazo de execução/).fill(sqlCycle.slice(0, 4) + "-12-15");
  await card
    .getByLabel(/Como conferir a execução/)
    .fill("Escalas com cobertura verificadas em reunião coletiva");
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 820 });
    const size = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    check(size.scroll <= size.width, "formulário aberto sem rolagem horizontal a " + width + " px");
  }
  await card.getByRole("button", { name: "Registrar medida" }).focus();
  await page.keyboard.press("Enter");
  await card.getByText("Medida planejada", { exact: true }).waitFor();
  await card.getByText("Registrar acompanhamento", { exact: true }).click();
  await card
    .getByLabel(/O que foi observado/)
    .fill("A escala foi ajustada e conferida com a equipe no início do turno.");
  await card.getByLabel(/Situação da medida/).selectOption("observed");
  await card.getByRole("button", { name: "Salvar acompanhamento" }).click();
  await card.getByText("Execução observada", { exact: true }).waitFor();
  await page.getByRole("link", { name: "Consultar a memória de preparação" }).waitFor();
  await download("Baixar memória de preparação", "memoria.pdf");
  await page.reload();
  await page.locator("legend").filter({ hasText: sqlCycle }).waitFor();
  check(
    new URL(page.url()).searchParams.get("cycle") === sqlCycle,
    "ciclo selecionado preservado na URL e na recarga",
  );
  await card.getByText("Execução observada", { exact: true }).waitFor();
  check(
    await card.getByText(title, { exact: true }).isVisible(),
    "medida vinculada ao controle após recarga",
  );
  const beta = await login("beta", path);
  const betaEnabled =
    (await institutionalSql(
      "SELECT enabled FROM public.org_module_entitlements e JOIN public.organizations o ON e.org_id=o.id WHERE o.slug='institutional-beta' AND module='Q1'",
    )) === "t";
  if (betaEnabled) {
    await openCycle(beta);
    await beta.getByText(/O ciclo ainda não tem controles/).waitFor();
  } else await beta.getByText(/empresa habilitada para Q1/).waitFor();
  const counts = await institutionalSql(
    "SELECT string_agg(s||':'||n,',' ORDER BY s) FROM (SELECT o.slug AS s,count(e.request_id) AS n FROM public.organizations o LEFT JOIN institutional.q1_preparation_events e ON e.org_id=o.id AND e.cycle_key='" +
      sqlCycle +
      "' WHERE o.slug IN ('institutional-alfa','institutional-beta') GROUP BY o.slug) x",
  );
  check(
    counts === "institutional-alfa:5,institutional-beta:0",
    "releitura independente no PostgreSQL · cinco eventos Alfa, zero Beta",
  );
  console.log("Ciclo fictício " + sqlCycle + " · PDFs em " + out);
  completedAlfa = page;
} finally {
  try {
    if (attemptedEnable) {
      const now = await roleState();
      if (now === String(Number(initialRev) + 1) + ":true") {
        await toggle("Desabilitar Q1", Number(initialRev) + 1);
        check((await roleState()).endsWith(":false"), "habilitação inicial da Alfa restabelecida");
        if (completedAlfa) {
          await completedAlfa.reload();
          await completedAlfa.getByText(/empresa habilitada para Q1/).waitFor();
          check(
            (await completedAlfa.getByRole("button", { name: "Baixar comunicado" }).count()) === 0,
            "sessão aberta relida após desabilitação sem acesso ao PDF",
          );
        }
      } else
        check(
          now === initial,
          "habilitação da Alfa preservada sem sobrescrever mudança concorrente",
        );
    }
  } finally {
    if (completedAlfa) for (const [name, file] of downloads) copyFileSync(file, join(out, name));
    await browser.close();
  }
}
