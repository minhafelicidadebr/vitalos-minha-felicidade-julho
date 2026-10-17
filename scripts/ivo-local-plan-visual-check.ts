#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════
// VERIFICAÇÃO VISUAL LOCAL · PI-13 — incluir ação em plano existente e encerrar plano
// ═══════════════════════════════════════════════════════════════════════════
//
// Dirige um Edge headless (CDP, scripts/ivo-cdp.ts) pela interface REAL de
// /ivo-integral/acoes, com login por link mágico (Mailpit local):
//   1. plano ativo da Alfa (jornada + C8 já gravadas): destino e estado antes de confirmar,
//      accountability obrigatória, foco de teclado, 390px sem rolagem horizontal;
//   2. inclusão pela interface (clique duplo gera UMA ação), "incluída depois" no cartão;
//   3. encerramento recusado com pendências (explicado, botão aria-disabled);
//   4. ações levadas a estados de saída pelos botões; resumo do efeito ANTES de confirmar;
//      Escape cancela e devolve o foco; confirmação por teclado (Tab + Enter);
//   5. plano encerrado: aviso com data civil e papel, sem editar/registrar, histórico legível,
//      avaliação de eficácia independente; recarregar preserva; 390px;
//   6. banco: auditoria do encerramento, C8 byte a byte igual.
//
// Pré-requisitos: demo:ivo:setup, demo:ivo:upgrade, demo:ivo:proof (cria a revisora) e
// demo:ivo:dev em http://localhost:8080. ATENÇÃO: recria o ledger das organizações fictícias
// deste stack local (fases write da jornada e do C8) e deixa o plano ENCERRADO ao final.
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { APP, clickReal, connectPage, focusSequence, magicLinkLogin, navigate, shot, spawnEdge, viewport, waitFor, type Cdp } from "./ivo-cdp";

const ROOT = process.cwd();
const WORKDIR = join(ROOT, ".ivo-demo.local");
const OUT = join(WORKDIR, "screens");
const PORT = 9335;
const PROFILE = join(tmpdir(), `ivo-edge-plan-profile-${Date.now()}`);
const DB_CONTAINER = "supabase_db_vitalos-ivo-local";
mkdirSync(OUT, { recursive: true });

const log = (line: string) => console.log(line);
let failures = 0;
let checks = 0;
function check(label: string, ok: boolean, detail?: string) {
  checks += 1;
  if (!ok) failures += 1;
  log(`  ${ok ? "ok  " : "FAIL"} ${label}${!ok && detail ? ` — ${detail}` : ""}`);
}
const snap = (cdp: Cdp, name: string, full = true) => shot(cdp, OUT, name, log, full);

const GESTORA = "gestora.alfa@alfa.ficticia.test";
const NEW_TITLE = "Oficina de pausas ativas (visual)";
const T = { A: "Rodas de conversa sobre carga de trabalho", B: "Alinhamento de metas do turno", C: "Revisão do plano de benefícios" } as const;

async function psql(sql: string): Promise<string> {
  const proc = Bun.spawn(["docker", "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-X", "-tA", "-f", "-"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(sql);
  await proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  if ((await proc.exited) !== 0) throw new Error(err.trim());
  return out.trim();
}

async function runPhase(file: string, phase: string): Promise<void> {
  const proc = Bun.spawn([process.execPath, join(ROOT, "scripts", file), phase], { stdout: "ignore", stderr: "inherit" });
  if ((await proc.exited) !== 0) throw new Error(`${file} ${phase} falhou`);
}

// ── Ajudantes de página (cada chamada roda numa IIFE) ───────────────────────
const J = (v: unknown) => JSON.stringify(v);
const H = `
const plan = () => document.querySelector('section[aria-labelledby^="plano-"]');
const art = (t) => [...document.querySelectorAll('article')].find((a) => a.querySelector('h3') && a.querySelector('h3').textContent.trim() === t);
const addSec = () => document.querySelector('section[aria-labelledby^="add-"]');
const closeSec = () => document.querySelector('section[aria-labelledby^="close-"]');
const btn = (scope, text) => scope ? [...scope.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(text)) : null;
const byLabel = (scope, label) => { const l = scope ? [...scope.querySelectorAll('label')].find((x) => x.textContent.trim().startsWith(label)) : null; return l ? document.getElementById(l.getAttribute('for')) : null; };
const setv = (el, v) => {
  const P = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(P, 'value').set.call(el, v);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
};
const txt = (el) => el ? el.innerText.replace(/\\s+/g, ' ').toLowerCase() : '';
`;
const expr = (body: string) => `(() => { ${H} ${body} })()`;
const page = <R,>(cdp: Cdp, body: string) => cdp.eval<R>(expr(body));
const has = (cdp: Cdp, scope: "plan" | "add" | "close" | "body", needle: string) =>
  page<boolean>(cdp, `const el = ${scope === "plan" ? "plan()" : scope === "add" ? "addSec()" : scope === "close" ? "closeSec()" : "document.body"}; return txt(el).includes(${J(needle.toLowerCase())});`);
const waitHas = (cdp: Cdp, scope: "plan" | "add" | "close" | "body", needle: string, label: string, timeout = 45000) =>
  waitFor(cdp, expr(`const el = ${scope === "plan" ? "plan()" : scope === "add" ? "addSec()" : scope === "close" ? "closeSec()" : "document.body"}; return txt(el).includes(${J(needle.toLowerCase())});`), label, timeout);

async function fillAdd(cdp: Cdp, label: string, value: string) {
  const ok = await page<boolean>(cdp, `const el = byLabel(addSec(), ${J(label)}); if (!el) return false; setv(el, ${J(value)}); return true;`);
  if (!ok) throw new Error(`campo não encontrado no formulário de inclusão: ${label}`);
  await Bun.sleep(50);
}
async function pressEscape(cdp: Cdp) {
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
}
async function pressTabEnter(cdp: Cdp, key: "Tab" | "Enter") {
  const code = key === "Tab" ? 9 : 13;
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode: code, ...(key === "Enter" ? { text: "\r" } : {}) });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: code });
}
const stateOf = (cdp: Cdp, title: string) => page<string>(cdp, `return txt(art(${J(title)}));`);
async function setStatus(cdp: Cdp, title: string, button: string, expectedState: string) {
  await clickReal(cdp, expr(`const a = art(${J(title)}); const group = a ? [...a.querySelectorAll('h4')].find((h) => h.textContent.trim() === 'Mudar estado') : null; return btn(group ? group.parentElement : null, ${J(button)});`), `${title} → ${button}`);
  await waitFor(cdp, expr(`return txt(art(${J(title)})).includes(${J(`estado: ${expectedState.toLowerCase()}`)});`), `${title} em estado ${expectedState}`);
}

async function main(): Promise<void> {
  try {
    const up = await fetch(APP).then((r) => r.status).catch(() => 0);
    if (!up) throw new Error(`o app não responde em ${APP}. Rode: bun run demo:ivo:dev`);
    if (!existsSync(join(WORKDIR, "proof-state.json"))) throw new Error("rode antes: bun run demo:ivo:proof");

    log("\n── 0 · Estado de partida: plano ativo da Alfa com a história C8 (fases write da jornada e do C8) ──");
    await runPhase("ivo-local-journey-proof.ts", "write");
    await runPhase("ivo-local-c8-proof.ts", "write");
    const c8Before = await psql(`SELECT md5(
      COALESCE((SELECT string_agg(row_to_json(p)::TEXT, '|' ORDER BY p.id) FROM public.efficacy_protocols p), '') ||
      COALESCE((SELECT string_agg(row_to_json(o)::TEXT, '|' ORDER BY o.id) FROM public.efficacy_observations o), '') ||
      COALESCE((SELECT string_agg(row_to_json(v)::TEXT, '|' ORDER BY v.id) FROM public.efficacy_verdicts v), ''));`);
    check(
      "estado de partida: plano ativo com 3 ações e história C8 gravada (≥ 3 pareceres)",
      (await psql(`SELECT ((SELECT status FROM public.action_plans ORDER BY created_at DESC LIMIT 1) = 'active' AND (SELECT COUNT(*) FROM public.action_items) = 3 AND (SELECT COUNT(*) FROM public.efficacy_verdicts) >= 3)::TEXT;`)) === "true",
    );

    const edge = spawnEdge(PORT, PROFILE);
    let cdp: Cdp | null = null;
    try {
      cdp = await connectPage(PORT);
      await viewport(cdp, 1280, 900, false);
      await magicLinkLogin(cdp, GESTORA, "/ivo-integral/acoes");
      await navigate(cdp, `${APP}/ivo-integral/acoes`);
      await waitHas(cdp, "body", "Incluir ação neste plano", "formulário de inclusão visível");

      log("\n── 1 · Plano ativo (desktop 1280px) ──");
      await snap(cdp, "pi13-01-desktop-plano-ativo");
      check("destino e estado aparecem ANTES de confirmar a inclusão", (await has(cdp, "add", "Destino: plano do ciclo")) && (await has(cdp, "add", "ativo")) && (await has(cdp, "add", "3 ações")));
      check("plano ativo: a regra de accountability é explicada e os campos são obrigatórios", (await has(cdp, "add", "um plano ativo não aceita ação sem eles")) && (await page<boolean>(cdp, `const s = addSec(); return !!byLabel(s, 'Responsável') && byLabel(s, 'Responsável').required && byLabel(s, 'Prazo').required && byLabel(s, 'Indicador de execução').required;`)));
      check("a instrução diz que nenhum valor do resultado é copiado e que as ações atuais não mudam", await has(cdp, "add", "nenhum valor do resultado é copiado"));
      check("encerramento: pendências explicadas (1 planejada · 1 em execução) e botão aria-disabled", (await has(cdp, "close", "ainda não é possível encerrar: 2 ações estão em andamento (1 planejada(s) · 1 em execução)")) && (await page<boolean>(cdp, `const b = btn(closeSec(), 'Revisar encerramento'); return !!b && b.getAttribute('aria-disabled') === 'true' && !!b.getAttribute('aria-describedby');`)));
      await clickReal(cdp, expr(`return btn(closeSec(), 'Revisar encerramento');`), "revisar encerramento (bloqueado)");
      await Bun.sleep(300);
      check("clicar no botão bloqueado não abre a confirmação", !(await has(cdp, "close", "confirmar o encerramento")));
      check("execução, aprendizagem e avaliação seguem separadas na tela (cada cartão tem as três seções)", await page<boolean>(cdp, `const a = art(${J(T.A)}); return !!a && !!a.querySelector('section[aria-label^="Evidência de execução"]') && !!a.querySelector('section[aria-label^="Aprendizagem"]') && !!a.querySelector('section[aria-label^="Avaliação de eficácia"]');`));

      // Teclado: Tab pelo formulário de inclusão, indicador de foco em todos os campos.
      await page(cdp, `const el = byLabel(addSec(), 'Setor com leitura publicada'); el.scrollIntoView({ block: 'center', behavior: 'instant' }); el.focus();`);
      const focus = await focusSequence(cdp, 12);
      log(`       foco: ${focus.join(" → ")}`);
      // O campo de data nativo do Chrome tem vários pontos de Tab (dia, mês, ano, ícone do calendário):
      // o mesmo controle repetido conta como um só, e basta que o controle mostre o indicador de foco.
      const byControl = new Map<string, boolean>();
      for (const f of focus) {
        const control = f.split(" · foco visível")[0]!.split(" · SEM indicador de foco")[0]!;
        byControl.set(control, (byControl.get(control) ?? false) || f.includes("foco visível"));
      }
      check(`teclado: ${byControl.size} controles do formulário de inclusão em 12 Tab, todos com indicador de foco visível (data nativa conta como um controle)`, byControl.size >= 10 && [...byControl.values()].every(Boolean));

      log("\n── 2 · Formulário em 390px (celular) ──");
      await viewport(cdp, 390, 844, true);
      await Bun.sleep(500);
      await snap(cdp, "pi13-02-mobile-formulario-inclusao");
      check("390px sem rolagem horizontal da página", !(await cdp.eval<boolean>("document.documentElement.scrollWidth > window.innerWidth + 1")));
      check("390px: botões de enviar e de revisar o encerramento têm alvo de toque ≥ 44px", await page<boolean>(cdp, `const a = btn(addSec(), 'Incluir ação'); const b = btn(closeSec(), 'Revisar encerramento'); return a.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().height >= 44;`));
      await viewport(cdp, 1280, 900, false);
      await Bun.sleep(400);

      log("\n── 3 · Incluir ação pela interface ──");
      await fillAdd(cdp, "Título da nova ação", NEW_TITLE);
      await clickReal(cdp, expr(`return btn(addSec(), 'Incluir ação');`), "incluir sem accountability");
      await Bun.sleep(600);
      // O navegador barra o envio pelos campos obrigatórios (aviso nativo) e leva o foco ao primeiro vazio.
      check(
        "sem responsável/prazo/indicador o envio é barrado nos campos obrigatórios (foco no primeiro vazio), nada é gravado e o título digitado é MANTIDO",
        (await page<boolean>(cdp, `const r = byLabel(addSec(), 'Responsável'); return document.activeElement === r && r.matches(':invalid') && r.validationMessage.length > 0;`)) &&
        (await page<string>(cdp, `return byLabel(addSec(), 'Título da nova ação').value;`)) === NEW_TITLE &&
        (await psql(`SELECT COUNT(*) FROM public.action_items WHERE title = '${NEW_TITLE}';`)) === "0",
      );
      await fillAdd(cdp, "O que será feito", "Duas oficinas curtas por mês, sem nomes.");
      await fillAdd(cdp, "Responsável", "Gestão de pessoas");
      await fillAdd(cdp, "Prazo", "2026-12-15");
      await fillAdd(cdp, "Indicador de execução", "Oficinas realizadas");
      await fillAdd(cdp, "Meta", "2");
      await fillAdd(cdp, "Unidade", "oficinas");
      check("prazo escolhido aparece por extenso (data civil)", await has(cdp, "add", "15 de dezembro de 2026"));
      // Clique duplo no MESMO instante (dois cliques no mesmo ciclo do navegador): o segundo é ignorado
      // pelo bloqueio de envio. O rótulo do botão muda durante o envio, então o botão é achado pelo tipo.
      await page(cdp, `const b = addSec().querySelector('button[type="submit"]'); b.scrollIntoView({ block: 'center', behavior: 'instant' }); b.click(); b.click();`);
      await waitFor(cdp, expr(`return !!art(${J(NEW_TITLE)});`), "cartão da nova ação");
      await waitHas(cdp, "add", "ação incluída no plano.", "confirmação junto do formulário");
      await Bun.sleep(1200);
      check("clique duplo gera UMA ação (um cartão, um registro no banco)", (await page<number>(cdp, `return [...document.querySelectorAll('article')].filter((a) => a.querySelector('h3') && a.querySelector('h3').textContent.trim() === ${J(NEW_TITLE)}).length;`)) === 1 && (await psql(`SELECT COUNT(*) FROM public.action_items WHERE title = '${NEW_TITLE}';`)) === "1");
      check("o formulário limpa o que foi enviado e anuncia o sucesso na própria região", (await page<string>(cdp, `return byLabel(addSec(), 'Título da nova ação').value;`)) === "" && (await page<boolean>(cdp, `const s = addSec(); const st = s.querySelector('[role="status"]'); return !!st && st.innerText.includes('Ação incluída no plano.');`)));
      check("o cartão mostra 'incluída depois da criação do plano' com data e papel; estado Planejada; eficácia não avaliada", await page<boolean>(cdp, `const t = txt(art(${J(NEW_TITLE)})); return t.includes('incluída depois da criação do plano') && t.includes('por rh_admin') && t.includes('estado: planejada') && t.includes('eficácia: não avaliada') && t.includes('gestão de pessoas');`));
      check("o destino passou a contar 4 ações", await has(cdp, "add", "4 ações"));
      await snap(cdp, "pi13-03-desktop-acao-incluida");

      log("\n── 4 · Encerrar: pendências → estados de saída → confirmação ──");
      check("com 3 ações em andamento o encerramento segue recusado e a lista diz quais", (await has(cdp, "close", "3 ações estão em andamento")) && (await has(cdp, "close", `${T.A.toLowerCase()} — em execução`)) && (await has(cdp, "close", `${NEW_TITLE.toLowerCase()} — planejada`)));
      await setStatus(cdp, T.A, "Concluída", "Concluída");
      await setStatus(cdp, T.C, "Interrompida", "Interrompida");
      await setStatus(cdp, NEW_TITLE, "Interrompida", "Interrompida");
      await waitHas(cdp, "close", "revisar encerramento do plano", "painel pronto para encerrar");
      check("com todas as ações em estado de saída, a pendência some e o botão fica habilitado", !(await has(cdp, "close", "ainda não é possível encerrar")) && (await page<boolean>(cdp, `return btn(closeSec(), 'Revisar encerramento').getAttribute('aria-disabled') === 'false';`)));
      await clickReal(cdp, expr(`return btn(closeSec(), 'Revisar encerramento');`), "revisar encerramento");
      await waitHas(cdp, "close", "confirmar o encerramento do plano", "resumo do efeito");
      check("resumo do efeito ANTES de confirmar: contagem por estado, o que deixa de existir, sem reabertura, não é eficácia", (await has(cdp, "close", "4 ações: 2 concluída(s), 0 em vigilância, 2 interrompida(s)")) && (await has(cdp, "close", "não aceita novas ações, mudanças de estado nem novos registros")) && (await has(cdp, "close", "não há reabertura nesta versão")) && (await has(cdp, "close", "não avalia eficácia, não altera o ivo, não valida o método")));
      check("o foco vai para o título da confirmação", await page<boolean>(cdp, `return document.activeElement && document.activeElement.id.includes('confirm-title');`));
      await snap(cdp, "pi13-04-desktop-confirmacao");
      await pressEscape(cdp);
      await Bun.sleep(300);
      check("Escape cancela sem encerrar e devolve o foco ao botão de origem", !(await has(cdp, "close", "confirmar o encerramento do plano")) && (await page<boolean>(cdp, `return document.activeElement && document.activeElement.textContent.trim().startsWith('Revisar encerramento');`)) && (await psql(`SELECT status FROM public.action_plans ORDER BY created_at DESC LIMIT 1;`)) === "active");
      await clickReal(cdp, expr(`return btn(closeSec(), 'Revisar encerramento');`), "reabrir a confirmação");
      await waitHas(cdp, "close", "confirmar o encerramento do plano", "confirmação reaberta");
      await pressTabEnter(cdp, "Tab");
      check("teclado: o primeiro Tab desde o título leva a 'Confirmar encerramento'", await page<boolean>(cdp, `return document.activeElement && document.activeElement.textContent.trim().startsWith('Confirmar encerramento');`));
      await pressTabEnter(cdp, "Enter");
      await waitFor(cdp, expr(`return !!document.querySelector('section[aria-label="Plano encerrado"]');`), "aviso de plano encerrado", 60000);

      log("\n── 5 · Plano encerrado (desktop) ──");
      await Bun.sleep(600);
      check("a faixa do topo anuncia o encerramento (região de status)", await page<boolean>(cdp, `const s = [...document.querySelectorAll('[role="status"]')].find((x) => x.innerText.includes('Plano encerrado.')); return !!s;`));
      check("aviso: data civil, papel de quem encerrou, o que deixa de existir e que não há reabertura", (await has(cdp, "plan", "plano encerrado em")) && (await has(cdp, "plan", "por rh_admin")) && (await has(cdp, "plan", "não aceita novas ações, mudanças de estado nem novos registros")) && (await has(cdp, "plan", "não há reabertura nesta versão")) && (await has(cdp, "plan", "o encerramento é definitivo")));
      check("a data do aviso é a data civil de hoje no fuso do produto", await page<boolean>(cdp, `const t = document.querySelector('section[aria-label="Plano encerrado"] time'); if (!t) return false; const d = new Date(t.getAttribute('datetime')); const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' }); return t.textContent.trim() === today;`));
      check("nenhuma edição disponível: sem 'Mudar estado', sem registrar execução/aprendizagem, sem incluir ação, sem encerrar", await page<boolean>(cdp, `const t = txt(document.body); return !t.includes('mudar estado') && !btn(document.body, 'Registrar execução') && !btn(document.body, 'Registrar aprendizagem') && !addSec() && !closeSec();`));
      check("cada cartão explica por que a edição não está disponível", (await page<number>(cdp, `return [...document.querySelectorAll('article')].filter((a) => txt(a).includes('plano encerrado: o estado e os registros de execução e aprendizagem desta ação estão somente para leitura')).length;`)) === 4);
      check("histórico legível: evidências da ação A e a ação incluída seguem no plano", (await has(cdp, "plan", "ata do 1º encontro")) && (await has(cdp, "plan", "incluída depois da criação do plano")));
      check("a avaliação de eficácia segue visível e independente (uma por ação, com os pareceres C8)", (await page<number>(cdp, `return document.querySelectorAll('section[aria-label^="Avaliação de eficácia"]').length;`)) >= 3 && (await has(cdp, "body", "a avaliação de eficácia, abaixo, é independente do encerramento")));
      await snap(cdp, "pi13-05-desktop-plano-encerrado");

      log("\n── 6 · Recarregar e 390px ──");
      await navigate(cdp, `${APP}/ivo-integral/acoes`);
      await waitFor(cdp, expr(`return !!document.querySelector('section[aria-label="Plano encerrado"]');`), "plano encerrado após recarregar", 60000);
      check("recarregar preserva o plano encerrado, a auditoria e a ação incluída", (await has(cdp, "plan", "por rh_admin")) && !!(await page<boolean>(cdp, `return !!art(${J(NEW_TITLE)});`)));
      await viewport(cdp, 390, 844, true);
      await Bun.sleep(500);
      await snap(cdp, "pi13-06-mobile-plano-encerrado");
      check("390px: plano encerrado sem rolagem horizontal e com o aviso legível", !(await cdp.eval<boolean>("document.documentElement.scrollWidth > window.innerWidth + 1")) && (await has(cdp, "plan", "não há reabertura nesta versão")));
    } finally {
      cdp?.close();
      edge.kill();
      await Bun.sleep(500);
      try {
        rmSync(PROFILE, { recursive: true, force: true });
      } catch {
        /* perfil temporário em uso: o sistema limpa depois */
      }
    }

    log("\n── 7 · Banco depois da navegação ──");
    check("auditoria do encerramento gravada pelo banco (instante, autor e papel da sessão)", (await psql(`SELECT status || '|' || (closed_at IS NOT NULL)::TEXT || '|' || (closed_by IS NOT NULL)::TEXT || '|' || closed_by_role FROM public.action_plans ORDER BY created_at DESC LIMIT 1;`)) === "closed|true|true|RH_ADMIN");
    check("a ação incluída pela interface tem autor, papel e chave de idempotência", (await psql(`SELECT (added_by IS NOT NULL)::TEXT || '|' || added_by_role || '|' || (add_request_id IS NOT NULL)::TEXT FROM public.action_items WHERE title = '${NEW_TITLE}';`)) === "true|RH_ADMIN|true");
    const c8After = await psql(`SELECT md5(
      COALESCE((SELECT string_agg(row_to_json(p)::TEXT, '|' ORDER BY p.id) FROM public.efficacy_protocols p), '') ||
      COALESCE((SELECT string_agg(row_to_json(o)::TEXT, '|' ORDER BY o.id) FROM public.efficacy_observations o), '') ||
      COALESCE((SELECT string_agg(row_to_json(v)::TEXT, '|' ORDER BY v.id) FROM public.efficacy_verdicts v), ''));`);
    check("C8 byte a byte igual depois de incluir ação e encerrar pela interface", c8After === c8Before, `${c8Before} → ${c8After}`);
  } catch (error) {
    check(`exceção: ${(error as Error).message}`, false);
  }
  log(`\nverificações=${checks} · falhas=${failures}`);
  process.exit(failures > 0 ? 1 : 0);
}

await main();
