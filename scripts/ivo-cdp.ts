// Utilitários compartilhados das verificações visuais LOCAIS da jornada IVO.
//
// Dirigem um Edge headless pelo Chrome DevTools Protocol, sem dependência nova.
// Alvos: http://localhost:8080 (app) e http://127.0.0.1:55424 (Mailpit) — só loopback.
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export const APP = "http://localhost:8080";
export const MAILPIT = "http://127.0.0.1:55424";
export const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

export class Cdp {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async eval<T = any>(expression: string): Promise<T> {
    const r = await this.send<{ result: { value: T }; exceptionDetails?: { exception?: { description?: string } } }>("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "exceção na página");
    return r.result.value;
  }
  close() {
    this.ws.close();
  }
}

/** Abre o CDP de um Edge já iniciado na porta informada. */
export async function connectPage(port: number): Promise<Cdp> {
  let wsUrl = "";
  for (let i = 0; i < 50 && !wsUrl; i++) {
    try {
      const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as Array<{ type: string; webSocketDebuggerUrl: string }>;
      wsUrl = targets.find((t) => t.type === "page")?.webSocketDebuggerUrl ?? "";
    } catch {
      await Bun.sleep(300);
    }
  }
  if (!wsUrl) throw new Error("Edge headless não abriu o CDP");
  const cdp = await Cdp.connect(wsUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  return cdp;
}

export function spawnEdge(port: number, profile: string) {
  return Bun.spawn(
    [EDGE, "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--lang=pt-BR", "--no-first-run", "--no-default-browser-check", "--disable-gpu", "about:blank"],
    { stdout: "ignore", stderr: "ignore" },
  );
}

export async function waitFor(cdp: Cdp, predicate: string, label: string, timeoutMs = 45000): Promise<void> {
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

export const bodyHas = (text: string) => `document.body && document.body.innerText.includes(${JSON.stringify(text)})`;

export async function viewport(cdp: Cdp, width: number, height: number, mobile: boolean) {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
}

export async function shot(cdp: Cdp, outDir: string, name: string, log: (line: string) => void, fullPage = false) {
  const r = await cdp.send<{ data: string }>("Page.captureScreenshot", { format: "png", captureBeyondViewport: fullPage });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(r.data, "base64"));
  const overflow = await cdp.eval<boolean>("document.documentElement.scrollWidth > window.innerWidth + 1");
  log(`  shot ${name}.png · overflow horizontal da página: ${overflow ? "SIM" : "não"}`);
}

export async function navigate(cdp: Cdp, url: string) {
  await cdp.send("Page.navigate", { url });
  await Bun.sleep(600);
  await waitFor(cdp, "document.readyState === 'complete'", `carregar ${url}`);
}

export async function pressKey(cdp: Cdp, key: "Tab" | "Enter") {
  const code = key === "Tab" ? 9 : 13;
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode: code, ...(key === "Enter" ? { text: "\r" } : {}) });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: code });
}

/** Clique de mouse REAL no centro do elemento devolvido pela expressão (rola até ele antes). */
export async function clickReal(cdp: Cdp, elementExpression: string, label: string) {
  const rect = await cdp.eval<{ x: number; y: number } | null>(`(() => {
    const el = (${elementExpression});
    if (!el) return null;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (!rect) throw new Error(`elemento não encontrado para clicar: ${label}`);
  await Bun.sleep(120);
  const again = await cdp.eval<{ x: number; y: number }>(`(() => { const el = (${elementExpression}); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: again.x, y: again.y });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: again.x, y: again.y, button: "left", clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: again.x, y: again.y, button: "left", clickCount: 1 });
}

export async function magicLinkLogin(cdp: Cdp, email: string, redirect = "/ivo-integral") {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
  // O servidor de desenvolvimento renderiza antes de hidratar: um Enter enviado cedo demais é
  // ignorado. Recarrega e tenta de novo até o formulário responder.
  for (let attempt = 0; ; attempt++) {
    await navigate(cdp, `${APP}/entrar?redirect=${encodeURIComponent(redirect)}`);
    await waitFor(cdp, "document.querySelector('#email')", "formulário de login");
    await Bun.sleep(attempt === 0 ? 3000 : 1500);
    await cdp.eval("(() => { const el = document.querySelector('#email'); el.focus(); el.select(); })()");
    await cdp.send("Input.insertText", { text: email });
    await pressKey(cdp, "Enter");
    try {
      await waitFor(cdp, bodyHas("Verifique seu e-mail"), "confirmação de envio", 10000);
      break;
    } catch (error) {
      if (attempt >= 3) throw error;
    }
  }
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

export async function focusSequence(cdp: Cdp, presses: number): Promise<string[]> {
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
