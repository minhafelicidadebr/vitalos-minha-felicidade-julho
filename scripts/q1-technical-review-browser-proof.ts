// Run with Node and an existing local Playwright installation.
// Writes only through the app, on the dedicated Q1 browser fixture.
import { execFile, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { setTimeout as wait } from "node:timers/promises";
import { promisify } from "node:util";
import type { BrowserType } from "playwright";

const run = promisify(execFile);
const container = "supabase_db_vitalos-q1-browser-proof";
const app = "http://localhost:8093";
const readiness = "http://127.0.0.1:8093/@vite/client";
const api = "http://127.0.0.1:57721";
const mail = "http://127.0.0.1:57724";
const workdir = ".q1-browser-proof.local";
const path = "/ivo-integral/preparar-q1";
const emails = {
  platform: "platform@institutional.test",
  representative: "colaborador.alfa@institutional.test",
  reviewer: "sst.alfa@institutional.test",
  beta: "beta@institutional.test",
};

async function isolatedAppEnvironment() {
  const config = await readFile(workdir + "/supabase/config.toml", "utf8");
  if (!/^project_id\s*=\s*"vitalos-q1-browser-proof"\s*$/m.test(config))
    throw new Error("O projeto da prova de navegador não é o descartável Q1.");
  const { stdout } = await run(
    "bunx",
    ["supabase@2.119.0", "status", "-o", "env", "--workdir", workdir],
    { timeout: 20000, windowsHide: true },
  );
  const infra = Object.fromEntries(
    stdout.split(/\r?\n/).flatMap((line) => {
      const found = /^([A-Z_]+)="?(.*?)"?$/.exec(line);
      return found ? [[found[1], found[2]]] : [];
    }),
  );
  const db = new URL(infra.DB_URL ?? "about:blank");
  if (
    infra.API_URL !== api ||
    !["127.0.0.1", "localhost"].includes(db.hostname) ||
    !["postgres:", "postgresql:"].includes(db.protocol) ||
    db.port !== "57722" ||
    db.pathname !== "/postgres" ||
    !infra.ANON_KEY ||
    !infra.SERVICE_ROLE_KEY
  )
    throw new Error("A configuração ativa diverge dos endpoints descartáveis do Q1.");
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => !/^(VITALOS_IVO_|FIBT_HML_|VITE_FIBT_HML_|STAGING_)/.test(key),
      ),
    ),
    VITALOS_RUNTIME_ENV: "local",
    VITALOS_DB_TARGET: "local",
    SUPABASE_URL: api,
    VITE_SUPABASE_URL: api,
    SUPABASE_PUBLISHABLE_KEY: infra.ANON_KEY,
    VITE_SUPABASE_PUBLISHABLE_KEY: infra.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: infra.SERVICE_ROLE_KEY,
    VITE_APP_URL: app,
    PLATFORM_ADMIN_EMAILS: emails.platform,
  };
}

async function localRead(query: string) {
  const result = await run(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-XqAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "BEGIN READ ONLY; " + query + "; ROLLBACK;",
    ],
    { timeout: 15000, windowsHide: true },
  );
  return result.stdout.trim();
}

export async function checkQ1BrowserTarget() {
  const bindings = await Promise.all(
    [
      [container, "5432", "57722"],
      ["supabase_kong_vitalos-q1-browser-proof", "8000", "57721"],
      ["supabase_inbucket_vitalos-q1-browser-proof", "8025", "57724"],
    ].map(async ([name, internal, external]) => {
      const { stdout } = await run("docker", ["port", name, internal + "/tcp"], {
        timeout: 10000,
        windowsHide: true,
      });
      return stdout
        .trim()
        .split(/\r?\n/)
        .some((line) => line.endsWith(":" + external));
    }),
  );
  if (bindings.includes(false)) throw new Error("As portas do stack descartável Q1 divergem.");
  const fixture = JSON.parse(
    await localRead(`
    SELECT json_build_object(
      'alfa',(SELECT id FROM public.organizations WHERE slug='institutional-alfa' AND pack_id='enterprise'),
      'representative',(SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id=p.id JOIN public.organizations o ON o.id=p.org_id
        WHERE o.slug='institutional-alfa' AND p.role='COLABORADOR' AND u.email='colaborador.alfa@institutional.test'),
      'reviewer',(SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id=p.id JOIN public.organizations o ON o.id=p.org_id
        WHERE o.slug='institutional-alfa' AND p.role='SST_PROFISSIONAL' AND u.email='sst.alfa@institutional.test'),
      'beta',(SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id=p.id JOIN public.organizations o ON o.id=p.org_id
        WHERE o.slug='institutional-beta' AND p.role='RH_ADMIN' AND u.email='beta@institutional.test'),
      'platform',EXISTS(SELECT 1 FROM auth.users WHERE email='platform@institutional.test'),
      'enabled',(SELECT count(*) FROM public.org_module_entitlements e JOIN public.organizations o ON o.id=e.org_id
        WHERE o.slug IN ('institutional-alfa','institutional-beta') AND e.module='Q1' AND e.enabled),
      'schema',to_regclass('institutional.q1_technical_review_events') IS NOT NULL
        AND to_regclass('institutional.q1_delegate_history') IS NOT NULL)
  `),
  ) as {
    alfa?: string;
    representative?: string;
    reviewer?: string;
    beta?: string;
    platform?: boolean;
    enabled?: number;
    schema?: boolean;
  };
  if (
    !fixture.alfa ||
    !fixture.representative ||
    !fixture.reviewer ||
    !fixture.beta ||
    !fixture.platform ||
    fixture.enabled !== 2 ||
    !fixture.schema
  )
    throw new Error(
      "Fixture incompleta: verifique as migrations, os vínculos fictícios e Q1 ligado nas duas empresas.",
    );
  const cycle = await localRead(`
    SELECT y::text||'-T'||q::text FROM generate_series(2080,2097) y CROSS JOIN generate_series(1,4) q
    WHERE NOT EXISTS (SELECT 1 FROM institutional.q1_preparation_events WHERE cycle_key=y::text||'-T'||q::text)
      AND NOT EXISTS (SELECT 1 FROM institutional.q1_technical_review_events WHERE cycle_key=y::text||'-T'||q::text)
    ORDER BY y,q LIMIT 1
  `);
  if (!/^20\d{2}-T[1-4]$/.test(cycle)) throw new Error("Não há ciclo fictício livre.");
  return {
    alfa: fixture.alfa,
    representative: fixture.representative,
    reviewer: fixture.reviewer,
    cycle,
  };
}

async function main() {
  const env = await isolatedAppEnvironment();
  const fixture = await checkQ1BrowserTarget();
  console.log("Alvo e fixtures do Q1 confirmados.");
  if (process.argv.includes("--check")) return;
  const { chromium }: { chromium: BrowserType } = createRequire(import.meta.url)(
    process.env.PLAYWRIGHT_MODULE_PATH || "playwright",
  );
  const browser = await chromium.launch({ channel: "msedge", headless: true, timeout: 30000 });
  let server: ReturnType<typeof spawn> | undefined;
  const cycleUrl = path + "?cycle=" + fixture.cycle;
  const log = (message: string) => console.log("PASS " + message);
  const contact = "Plantão fictício da prova de revisão";
  const rationale = "Revisar a cobertura de pausas com a equipe fictícia.";
  try {
    await run(
      "bun",
      ["--no-env-file", "run", "scripts/environment-preflight.ts", "--runtime=local", "--db=local"],
      {
        env,
        timeout: 20000,
        windowsHide: true,
      },
    );
    let alreadyListening = false;
    try {
      await fetch(readiness, { signal: AbortSignal.timeout(1000) });
      alreadyListening = true;
    } catch {
      // The runner owns its app process. It never attaches to an existing app.
    }
    if (alreadyListening) throw new Error("A porta 8093 já está em uso.");
    server = spawn(
      process.execPath,
      ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "8093", "--strictPort"],
      { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    let diagnostic = "";
    const remember = (chunk: Buffer) => {
      const line = chunk
        .toString()
        .split(/\r?\n/)
        .find(
          (candidate) =>
            /error|failed|timeout|denied|EADDRINUSE|exited/i.test(candidate) &&
            !/token|key|secret|authorization|password|cookie/i.test(candidate),
        );
      if (line) diagnostic = line.replace(/https?:\/\/\S+/g, "[URL]").slice(0, 250);
    };
    server.stderr?.on("data", remember);
    server.stdout?.on("data", remember);
    let launchFailed = false;
    server.on("error", () => {
      launchFailed = true;
    });
    let ready = false;
    for (let attempt = 0; attempt < 30 && !ready; attempt++) {
      if (launchFailed || server.exitCode !== null)
        throw new Error("O app descartável falhou ao iniciar.");
      try {
        ready = (await fetch(readiness, { signal: AbortSignal.timeout(1500) })).ok;
      } catch {
        // Retry only within the bounded startup window.
      }
      if (!ready) await wait(500);
    }
    if (!ready) throw new Error("O app descartável não respondeu na porta 8093.");
    try {
      const loginRoute = await fetch(app + "/entrar", { signal: AbortSignal.timeout(75000) });
      if (!loginRoute.ok) throw new Error("HTTP " + loginRoute.status);
    } catch (error) {
      throw new Error(
        "Rota de entrada do app descartável: " +
          (error instanceof Error ? error.message : "falha") +
          (diagnostic ? " · " + diagnostic : ""),
      );
    }
    console.log("App descartável e rota de entrada disponíveis.");
    async function login(account: keyof typeof emails, destination: string) {
      const email = emails[account];
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        return [app, api].includes(url.origin) || ["data:", "blob:"].includes(url.protocol)
          ? route.continue()
          : route.abort();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const list = async () => {
        const result = await fetch(
          mail + "/api/v1/search?query=" + encodeURIComponent("to:" + email),
          {
            signal: AbortSignal.timeout(5000),
          },
        );
        if (!result.ok) throw new Error("A consulta ao correio fictício falhou.");
        return (await result.json()).messages as { ID: string; To: { Address: string }[] }[];
      };
      const before = new Set((await list()).map((m) => m.ID));
      await page.goto(app + "/entrar?redirect=" + encodeURIComponent(destination), {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page.getByLabel("E-mail corporativo").fill(email);
      await page.getByRole("button", { name: "Entrar com link mágico" }).click();
      await page.getByText("Verifique seu e-mail", { exact: true }).waitFor();
      let link: URL | undefined;
      for (let count = 0; count < 24 && !link; count++) {
        const message = (await list()).find(
          (m) => !before.has(m.ID) && m.To.some((t) => t.Address === email),
        );
        if (message) {
          const full = await fetch(mail + "/api/v1/message/" + encodeURIComponent(message.ID), {
            signal: AbortSignal.timeout(5000),
          });
          const match = /(https?:\/\/[^"'\s<>]+\/auth\/v1\/verify[^"'\s<>]+)/.exec(
            (await full.json()).HTML,
          );
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
        throw new Error("Link mágico fora do alvo de prova ou indisponível.");
      try {
        await page.goto(link.href, { waitUntil: "domcontentloaded" });
        await page.waitForURL(
          (url) => url.origin === app && !["/entrar", "/auth/callback"].includes(url.pathname),
        );
      } catch {
        throw new Error("O retorno do link mágico local não completou.");
      }
      await page.goto(app + destination, { waitUntil: "domcontentloaded", timeout: 45000 });
      return page;
    }

    const platform = await login("platform", "/plataforma");
    const delegation = platform
      .locator("details")
      .filter({ has: platform.getByText("Delegação de preparação Q1", { exact: true }) });
    await delegation.locator("summary").click();
    await delegation.getByLabel("ID da empresa").fill(fixture.alfa);
    await delegation.getByLabel("ID da pessoa vinculada").fill(fixture.representative);
    await delegation.getByRole("button", { name: "Consultar vínculo" }).click();
    await delegation.getByRole("button", { name: "Conceder preparação", exact: true }).click();
    await delegation.getByText("Delegação concedida.", { exact: true }).waitFor();

    const assignment = platform
      .locator("details")
      .filter({ has: platform.getByText("Designação de revisor técnico Q1", { exact: true }) });
    await assignment.locator("summary").click();
    await assignment.getByLabel("ID da empresa").fill(fixture.alfa);
    await assignment.getByLabel("Ciclo Q1").fill(fixture.cycle);
    await assignment.getByRole("button", { name: "Consultar designação" }).click();
    await assignment.getByLabel("ID do profissional de SST").fill(fixture.reviewer);
    await assignment.getByRole("button", { name: "Designar revisor", exact: true }).click();
    await assignment.getByText("Revisor designado.", { exact: true }).waitFor();

    const representative = await login("representative", "/painel");
    await representative.getByRole("link", { name: "Abrir preparação Q1" }).click();
    await representative.getByLabel("Ciclo de preparação").fill(fixture.cycle);
    await representative.getByRole("button", { name: "Abrir ciclo" }).click();
    await representative.getByLabel(/Canal institucional para dúvidas/).fill(contact);
    await representative.getByLabel(/Onde a equipe acompanhará/).fill("Mural fictício");
    await representative.getByRole("button", { name: "Registrar comunicado revisado" }).click();
    await representative.getByText("Registro salvo no ciclo " + fixture.cycle + ".").waitFor();
    const review = representative.getByRole("region", { name: "Revisão técnica do ciclo" });
    await review.getByRole("button", { name: "Atualizar revisão" }).click();
    await review.getByRole("button", { name: "Encaminhar revisão 1" }).click();
    await review.getByText(/Aguardando devolução/).waitFor();
    log("representante sem RH prepara e encaminha");

    const beta = await login("beta", cycleUrl);
    await beta.getByText(/O ciclo ainda não tem controles declarados/).waitFor();
    if (await beta.getByText(contact, { exact: false }).count())
      throw new Error("A Beta recebeu conteúdo da Alfa.");
    if (await beta.getByText("Ler memória encaminhada", { exact: true }).count())
      throw new Error("A Beta recebeu a memória da Alfa.");
    log("Beta habilitada abre somente o próprio ciclo");

    const reviewer = await login("reviewer", cycleUrl);
    const reviewerPanel = reviewer.getByRole("region", { name: "Revisão técnica do ciclo" });
    await reviewerPanel.getByText("Ler memória encaminhada").click();
    await reviewerPanel.getByText(contact, { exact: false }).waitFor();
    await reviewer.setViewportSize({ width: 320, height: 760 });
    if (await reviewer.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      throw new Error("O Q1 não cabe na largura móvel de 320 px.");
    await reviewerPanel.getByLabel("Devolução", { exact: true }).selectOption("changes_requested");
    await reviewerPanel.getByLabel("Justificativa técnica").fill(rationale);
    await reviewerPanel.getByRole("button", { name: "Registrar devolução" }).click();
    await reviewerPanel.getByText("Ajustes solicitados", { exact: true }).waitFor();
    const confirmed = await localRead(`
      SELECT count(*) FROM institutional.q1_technical_review_events e JOIN public.organizations o ON o.id=e.org_id
      WHERE o.slug='institutional-alfa' AND e.cycle_key='${fixture.cycle}' AND e.kind='respond'
        AND e.preparation_revision=1 AND e.actor_id='${fixture.reviewer}'::uuid
    `);
    if (confirmed !== "1") throw new Error("A releitura independente não confirmou a devolução.");
    log("revisor lê e devolve; gravação confirmada em outro processo");

    const returning = await login("representative", cycleUrl);
    await returning
      .getByRole("region", { name: "Revisão técnica do ciclo" })
      .getByText(rationale)
      .waitFor();
    log("representante lê a devolução após novo login");

    // A resposta altera a sequência da designação. Releia antes de revogar.
    await assignment.getByRole("button", { name: "Consultar designação" }).click();
    await assignment.getByRole("button", { name: "Revogar designação" }).click();
    await assignment.getByText("Designação revogada.", { exact: true }).waitFor();
    await reviewerPanel.getByRole("button", { name: "Atualizar revisão" }).click();
    await reviewerPanel.waitFor({ state: "hidden" });
    await reviewer.reload();
    await reviewer.getByText(/A preparação exige autorização da empresa/).waitFor();
    if (await reviewer.getByText(contact, { exact: false }).count())
      throw new Error("A memória permaneceu acessível após revogação.");
    log("revogação na sessão aberta e depois da recarga");

    await delegation.getByRole("button", { name: "Consultar vínculo" }).click();
    await delegation.getByRole("button", { name: "Revogar delegação", exact: true }).click();
    await delegation.getByText("Delegação revogada.", { exact: true }).waitFor();
    const download = returning.getByRole("button", { name: "Baixar comunicado" });
    if (await download.isVisible()) await download.click();
    await returning.getByText(/A preparação exige autorização da empresa/).waitFor();
    if (await download.count())
      throw new Error("O comunicado permaneceu disponível após revogação.");
    log("representante revogado perde a preparação e a exportação");
  } finally {
    server?.kill();
    await browser.close();
  }
}

await main().catch((error) => {
  // Browser exceptions can include magic links and request details.
  console.error(
    "Prova Q1 interrompida:",
    error instanceof Error
      ? error.message.split("\n")[0].replace(/https?:\/\/\S+/g, "[URL]")
      : "erro não identificado",
  );
  process.exitCode = 1;
});
