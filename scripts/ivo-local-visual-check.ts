#!/usr/bin/env bun
// Verificação visual LOCAL da jornada IVO (opcional; exige Microsoft Edge).
//
// Dirige um Edge headless via Chrome DevTools Protocol, sem dependência nova:
//   1. abre /ivo-integral sem sessão (o que um visitante vê);
//   2. entra pelo fluxo REAL de link mágico: /entrar → e-mail no Mailpit local
//      → link → /auth/callback;
//   3. captura /ivo-integral, /ivo-integral/q2 e /ivo-integral/acoes em
//      largura de desktop e de celular, mede overflow horizontal;
//   4. percorre a página de ações só com Tab e registra a ordem de foco;
//   5. registra uma evidência pelo formulário (teclado), RECARREGA e confere;
//   6. repete o login como admin da organização Beta e captura a leitura Q2.
//
// Saída: PNGs e relatório em .ivo-demo.local/screens/ (ignorado pelo git).
// Alvos: http://localhost:8080 (app) e http://127.0.0.1:55424 (Mailpit) — só
// loopback. Pré-requisitos: demo:ivo:setup, demo:ivo:proof e demo:ivo:dev.

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const APP = "http://localhost:8080";
const MAILPIT = "http://127.0.0.1:55424";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9333;
const OUT = join(process.cwd(), ".ivo-demo.local", "screens");
const PROFILE = join(tmpdir(), `ivo-edge-profile-${Date.now()}`);
mkdirSync(OUT, { recursive: true });

const report: string[] = [];
const log = (line: string) => {
  report.push(line);
  console.log(line);
};

class Cdp {
  private id = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private constructor(private ws: WebSocket) {
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
      }
    };
  }
  static connect(url: string): Promise<Cdp> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.onopen = () => resolve(new Cdp(ws));
      ws.onerror = () => reject(new Error("CDP indisponível"));
    });
  }
  send<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval<T = any>(expression: string): Promise<T> {
    const r = await this.send<{ result: { value: T } }>("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return r.result.value;
  }
  close() {
    this.ws.close();
  }
}

async function waitFor(cdp: Cdp, predicate: string, label: string, timeoutMs = 45000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (await cdp.eval<boolean>(`(() => { try { return !!(${predicate}); } catch { return false; } })()`)) return;
    } catch {
      /* navegação em curso */
    }
    await Bun.sleep(400);
  }
  const text = await cdp.eval<string>("location.pathname + ' :: ' + (document.body ? document.body.innerText : '')").catch(() => "");
  throw new Error(`tempo esgotado esperando: ${label} — página: ${text.replace(/\s+/g, " ").slice(0, 300)}`);
}

const bodyHas = (text: string) => `document.body && document.body.innerText.includes(${JSON.stringify(text)})`;

async function viewport(cdp: Cdp, width: number, height: number, mobile: boolean) {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
}

async function shot(cdp: Cdp, name: string) {
  const r = await cdp.send<{ data: string }>("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(r.data, "base64"));
  const overflow = await cdp.eval<boolean>("document.documentElement.scrollWidth > window.innerWidth + 1");
  log(`  shot ${name}.png · overflow horizontal da página: ${overflow ? "SIM" : "não"}`);
}

async function navigate(cdp: Cdp, url: string) {
  await cdp.send("Page.navigate", { url });
  await Bun.sleep(600);
  await waitFor(cdp, "document.readyState === 'complete'", `carregar ${url}`);
}

async function pressKey(cdp: Cdp, key: "Tab" | "Enter") {
  const code = key === "Tab" ? 9 : 13;
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode: code, ...(key === "Enter" ? { text: "\r" } : {}) });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: code });
}

async function magicLinkLogin(cdp: Cdp, email: string) {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
  await navigate(cdp, `${APP}/entrar?redirect=%2Fivo-integral`);
  await waitFor(cdp, "document.querySelector('#email')", "formulário de login");
  await cdp.eval("document.querySelector('#email').focus()");
  await cdp.send("Input.insertText", { text: email });
  await pressKey(cdp, "Enter");
  await waitFor(cdp, bodyHas("Verifique seu e-mail"), "confirmação de envio");
  let link = "";
  for (let i = 0; i < 40 && !link; i++) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/messages`)).json()) as { messages: Array<{ ID: string; To: Array<{ Address: string }> }> };
    const msg = list.messages.find((m) => m.To.some((t) => t.Address === email));
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { HTML: string; Text: string };
      const match = /(https?:\/\/[^"'\s<>]+\/auth\/v1\/verify[^"'\s<>]+)/.exec(`${full.HTML} ${full.Text}`);
      if (match) link = match[1]!.replace(/&amp;/g, "&");
    }
    if (!link) await Bun.sleep(500);
  }
  if (!link) throw new Error(`link mágico de ${email} não chegou ao Mailpit`);
  await navigate(cdp, link);
  await waitFor(cdp, "location.pathname.startsWith('/ivo-integral')", "redirecionamento pós-login", 60000);
}

async function focusSequence(cdp: Cdp, presses: number): Promise<string[]> {
  const seq: string[] = [];
  for (let i = 0; i < presses; i++) {
    await pressKey(cdp, "Tab");
    await Bun.sleep(60);
    seq.push(
      await cdp.eval<string>(`(() => {
        const a = document.activeElement; if (!a || a === document.body) return '(body)';
        const s = getComputedStyle(a);
        const ring = s.outlineStyle !== 'none' || (s.boxShadow && s.boxShadow !== 'none');
        const name = (a.getAttribute('aria-label') || a.labels?.[0]?.textContent || a.textContent || a.getAttribute('placeholder') || '').replace(/\\s+/g,' ').trim().slice(0, 70);
        return a.tagName.toLowerCase() + ' · ' + name + (ring ? ' · foco visível' : ' · SEM indicador de foco');
      })()`),
    );
  }
  return seq;
}

async function main() {
  const edge = Bun.spawn(
    [EDGE, "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--no-default-browser-check", "--disable-gpu", "about:blank"],
    { stdout: "ignore", stderr: "ignore" },
  );
  try {
    let wsUrl = "";
    for (let i = 0; i < 50 && !wsUrl; i++) {
      try {
        const targets = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as Array<{ type: string; webSocketDebuggerUrl: string }>;
        wsUrl = targets.find((t) => t.type === "page")?.webSocketDebuggerUrl ?? "";
      } catch {
        await Bun.sleep(300);
      }
    }
    if (!wsUrl) throw new Error("Edge headless não abriu o CDP");
    const cdp = await Cdp.connect(wsUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await viewport(cdp, 1366, 900, false);

    log("1. Visitante sem sessão");
    await navigate(cdp, `${APP}/ivo-integral`);
    await Bun.sleep(2500);
    await shot(cdp, "01-sem-sessao-desktop");
    log(`  texto visível: ${(await cdp.eval<string>("document.body.innerText")).replace(/\s+/g, " ").slice(0, 160)}`);

    log("2. Login real (link mágico) como admin da Organização Fictícia Alfa");
    await magicLinkLogin(cdp, "gestora.alfa@alfa.ficticia.test");
    await waitFor(cdp, bodyHas("Q2 · FIB-T 1.0.0"), "resumo da leitura Q2");
    await shot(cdp, "02-ivo-alfa-desktop");
    await viewport(cdp, 390, 844, true);
    await Bun.sleep(800);
    await shot(cdp, "03-ivo-alfa-celular");

    await viewport(cdp, 1366, 900, false);
    await navigate(cdp, `${APP}/ivo-integral/q2`);
    await waitFor(cdp, bodyHas("Leitura por setor"), "leitura Q2");
    await shot(cdp, "04-q2-alfa-desktop");
    await viewport(cdp, 390, 844, true);
    await Bun.sleep(800);
    await shot(cdp, "05-q2-alfa-celular");

    await viewport(cdp, 1366, 900, false);
    await navigate(cdp, `${APP}/ivo-integral/acoes`);
    await waitFor(cdp, bodyHas("Eficácia: não avaliada"), "ação persistida");
    await shot(cdp, "06-acoes-alfa-desktop");

    log("3. Ordem de foco por teclado em /ivo-integral/acoes (primeiras 18 paradas)");
    await cdp.eval("document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)");
    for (const step of await focusSequence(cdp, 18)) log(`  Tab → ${step}`);

    log("4. Registrar evidência pelo formulário (teclado) e recarregar");
    const marker = `Checklist da 2ª roda (verificação visual ${new Date().toISOString().slice(11, 19)})`;
    const focused = await cdp.eval<boolean>(`(() => { const el = document.querySelector('input[id^="execucao-"][id$="-content"]'); if (!el) return false; el.focus(); return true; })()`);
    if (!focused) throw new Error("formulário de evidência não encontrado (plano ativo?)");
    await cdp.send("Input.insertText", { text: marker });
    await pressKey(cdp, "Enter");
    await waitFor(cdp, bodyHas("Evidência de execução registrada."), "confirmação da evidência");
    await cdp.send("Page.reload", { ignoreCache: true });
    await Bun.sleep(800);
    await waitFor(cdp, bodyHas(marker), "evidência após recarregar");
    log("  ok evidência registrada pela UI reaparece após recarregar a página");
    await viewport(cdp, 390, 844, true);
    await Bun.sleep(800);
    await shot(cdp, "07-acoes-alfa-celular");

    log("5. Login como admin da Organização Fictícia Beta (outra organização)");
    await viewport(cdp, 1366, 900, false);
    await cdp.eval("localStorage.clear(); sessionStorage.clear()");
    await magicLinkLogin(cdp, "gestor.beta@beta.ficticia.test");
    await navigate(cdp, `${APP}/ivo-integral/q2`);
    await waitFor(cdp, bodyHas("Leitura por setor"), "leitura Q2 Beta");
    const leaks = await cdp.eval<string>("['Operações','Atendimento','Organização Fictícia Alfa', " + JSON.stringify(marker) + "].filter(t => document.body.innerText.includes(t)).join(',')");
    log(`  Beta vê dados da Alfa? ${leaks ? `SIM (${leaks})` : "não"}`);
    await shot(cdp, "08-q2-beta-desktop");
    await navigate(cdp, `${APP}/ivo-integral/acoes`);
    await Bun.sleep(2500);
    const betaActions = await cdp.eval<boolean>(bodyHas("Rodas de conversa"));
    log(`  Beta vê ações da Alfa? ${betaActions ? "SIM" : "não"}`);
    await shot(cdp, "09-acoes-beta-desktop");
    cdp.close();
  } finally {
    edge.kill();
    await Bun.sleep(500);
    try {
      rmSync(PROFILE, { recursive: true, force: true });
    } catch {
      /* perfil temporário em uso; o SO limpa */
    }
    writeFileSync(join(OUT, "relatorio.txt"), `${report.join("\n")}\n`);
  }
}

await main();
