#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════
// VERIFICAÇÃO VISUAL LOCAL — protocolo C8, aprendizagem vinculada e governança
// ═══════════════════════════════════════════════════════════════════════════
//
// Dirige um Edge headless (CDP, scripts/ivo-cdp.ts) pela interface REAL, com
// login por link mágico (Mailpit local), e deixa no stack local o estado da
// demonstração persistente:
//   · ação A (Bem-Estar)        → rascunho INCOMPLETO persistido → protocolo
//                                 registrado → observação → parecer FAVORÁVEL
//   · ação B (Satisfação)       → parecer DESFAVORÁVEL com a ação CONCLUÍDA
//   · ação C (Padrão de Vida)   → leitura publicada (só referência) → parecer
//                                 INCONCLUSIVO, sem número inventado
//   · aprendizagem de A vinculada a conteúdo de TESTE identificado
//   · quem criou o protocolo (gestora) não emite o parecer; a revisora
//     independente (RH_ADMIN fictícia) emite os três
//   · /ivo-integral/governanca: propostas consultáveis, aprovação indisponível
//   · Beta não vê nada da Alfa; recarregar preserva tudo
// Ao final roda a fase READ da prova C8 em PROCESSO NOVO sobre esses dados.
//
// Critérios dos desfechos são FICTÍCIOS (ver CRITERIOS). O parecer conclusivo só
// é aceito porque `demo:ivo:dev` liga a governança D9 de TESTE SINTÉTICO.
//
// Pré-requisitos: demo:ivo:setup, demo:ivo:upgrade (schema C8), demo:ivo:proof
// (cria a revisora fictícia) e demo:ivo:dev. ATENÇÃO: recria o ledger das
// organizações fictícias deste stack local (fase write da jornada).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { APP, bodyHas, clickReal, connectPage, focusSequence, magicLinkLogin, navigate, shot, spawnEdge, viewport, waitFor, type Cdp } from "./ivo-cdp";

const ROOT = process.cwd();
const WORKDIR = join(ROOT, ".ivo-demo.local");
const OUT = join(WORKDIR, "screens");
const PORT = 9334;
const PROFILE = join(tmpdir(), `ivo-edge-c8-profile-${Date.now()}`);
const DB_CONTAINER = "supabase_db_vitalos-ivo-local";
mkdirSync(OUT, { recursive: true });

const report: string[] = [];
const log = (line: string) => {
  report.push(line);
  console.log(line);
};
let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (!ok) failures += 1;
  log(`  ${ok ? "ok  " : "FAIL"} ${label}${!ok && detail ? ` — ${detail}` : ""}`);
}
const snap = (cdp: Cdp, name: string) => shot(cdp, OUT, name, log);

/** Critérios FICTÍCIOS e explícitos (sem valor científico). */
const CRITERIOS = {
  A: { baseline: 40, meta: 60, diferenca: 5, observado: 62 }, // favorável: 40→62 supera a meta
  B: { baseline: 50, meta: 60, diferenca: 5, observado: 48 }, // desfavorável: 50→48 piora
  C: { meta: 2 }, // inconclusivo: leitura publicada; sem resolução protegida do valor
} as const;
const T = { A: "Rodas de conversa sobre carga de trabalho", B: "Alinhamento de metas do turno", C: "Revisão do plano de benefícios" } as const;
const GESTORA = "gestora.alfa@alfa.ficticia.test";
const REVISORA = "revisora.alfa@alfa.ficticia.test";
const BETA = "gestor.beta@beta.ficticia.test";

const todayBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const day = (offset: number) => {
  const d = new Date(`${todayBR}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

// ── Ajudantes de página (cada chamada roda numa IIFE: sem redeclarar const) ──
const J = (v: unknown) => JSON.stringify(v);
const H = `
const art = (t) => [...document.querySelectorAll('article')].find((a) => a.querySelector('h3') && a.querySelector('h3').textContent.trim() === t);
const aid = (t) => { const a = art(t); return a ? a.getAttribute('aria-labelledby').replace('acao-', '') : null; };
const byId = (t, prefix, suffix) => document.getElementById(prefix + '-' + aid(t) + '-' + suffix);
const eff = (t) => { const a = art(t); return a ? a.querySelector('section[aria-label^="Avaliação de eficácia"]') : null; };
const btn = (scope, text) => scope ? [...scope.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(text)) : null;
const setv = (el, v) => {
  const P = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(P, 'value').set.call(el, v);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
};
`;
const expr = (body: string) => `(() => { ${H} ${body} })()`;
const page = <R>(cdp: Cdp, body: string) => cdp.eval<R>(expr(body));
const effText = (cdp: Cdp, title: string) => page<string>(cdp, `const s = eff(${J(title)}); return s ? s.innerText.replace(/\\s+/g, ' ') : '';`);
const artText = (cdp: Cdp, title: string) => page<string>(cdp, `const a = art(${J(title)}); return a ? a.innerText.replace(/\\s+/g, ' ') : '';`);
const waitEff = (cdp: Cdp, title: string, text: string, label: string) =>
  waitFor(cdp, expr(`const s = eff(${J(title)}); return !!s && s.innerText.includes(${J(text)});`), label);

async function fill(cdp: Cdp, title: string, prefix: string, suffix: string, value: string) {
  const ok = await page<boolean>(cdp, `const el = byId(${J(title)}, ${J(prefix)}, ${J(suffix)}); if (!el) return false; setv(el, ${J(value)}); return true;`);
  if (!ok) {
    const where = await page<string>(cdp, `const s = eff(${J(title)}); return s ? s.innerText.replace(/\\s+/g, ' ').slice(0, 400) : '(sem seção de eficácia)';`);
    throw new Error(`campo não encontrado: ${title} → ${prefix}-…-${suffix} · seção: ${where}`);
  }
  await Bun.sleep(60);
}
async function clickEffButton(cdp: Cdp, title: string, text: string) {
  await clickReal(cdp, expr(`return btn(eff(${J(title)}), ${J(text)});`), `${title} → ${text}`);
  await Bun.sleep(250);
}
async function clickArtButton(cdp: Cdp, title: string, text: string) {
  await clickReal(cdp, expr(`return btn(art(${J(title)}), ${J(text)});`), `${title} → ${text}`);
}
async function alertText(cdp: Cdp, title: string): Promise<string> {
  await waitFor(cdp, expr(`const s = eff(${J(title)}); return !!s && !!s.querySelector('[role="alert"]');`), `alerta em ${title}`);
  return page<string>(cdp, `return eff(${J(title)}).querySelector('[role="alert"]').innerText.replace(/\\s+/g, ' ');`);
}

interface ProtocolValues {
  objetivo: string;
  indicador: string;
  unidade: string;
  origem: "medida_da_organizacao" | "leitura_publicada";
  baselineValor?: string;
  metaValor: string;
  diferenca?: string;
  fonte: string;
}
async function fillProtocol(cdp: Cdp, title: string, v: ProtocolValues) {
  const closed = await page<boolean>(cdp, `return !!btn(eff(${J(title)}), 'Preparar protocolo de avaliação');`);
  if (closed) await clickEffButton(cdp, title, "Preparar protocolo de avaliação");
  const F = (suffix: string, value: string) => fill(cdp, title, "efic", suffix, value);
  await F("origem", v.origem);
  await F("tipo", "resultado");
  await F("direcao", "aumentar");
  await F("objetivo", v.objetivo);
  await F("indicador", v.indicador);
  await F("unidade", v.unidade);
  await F("base-data", day(-45));
  await F("base-populacao", "Operações, turno da manhã (fictício)");
  await F("base-fonte", v.origem === "leitura_publicada" ? "Leitura publicada FIB-T que originou a ação" : "Pesquisa interna fictícia de demonstração");
  if (v.baselineValor !== undefined) await F("base-valor", v.baselineValor);
  await F("meta-tipo", "numerico");
  await F("meta-valor", v.metaValor);
  if (v.diferenca !== undefined) await F("dif-minima", v.diferenca);
  await F("janela-ini", day(-30));
  await F("janela-fim", day(60));
  await F("fonte", v.fonte);
  await F("resp", "Coordenação de Operações");
  await F("rev", "Revisão independente de RH");
  await F("limit", "Critérios fictícios de demonstração; sem valor científico.");
  if (v.origem === "medida_da_organizacao") {
    for (const label of ["Mesmo recorte (setor)", "Mesma versão do instrumento", "Mesma versão do cálculo"]) {
      const findBox = `const l = [...eff(${J(title)}).querySelectorAll('label')].find((x) => x.textContent.includes(${J(label)})); return l ? l.querySelector('input') : null;`;
      const already = await page<boolean>(cdp, `const i = (() => { ${findBox} })(); return !!i && i.checked;`);
      if (!already) await clickReal(cdp, expr(findBox), label);
    }
  }
}

async function logout(cdp: Cdp) {
  await cdp.eval("localStorage.clear(); sessionStorage.clear()");
}

async function psqlScalar(sql: string): Promise<string> {
  const proc = Bun.spawn(["docker", "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-X", "-tA", "-f", "-"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(sql);
  await proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  if ((await proc.exited) !== 0) throw new Error((await new Response(proc.stderr).text()).trim());
  return out.trim();
}

async function emitVerdict(cdp: Cdp, title: string, verdict: string, reason: string) {
  await fill(cdp, title, "ver", "parecer", verdict);
  await fill(cdp, title, "ver", "grau", verdict === "inconclusiva" ? "descritiva" : "pre_pos");
  await fill(cdp, title, "ver", "motivo", reason);
  await clickEffButton(cdp, title, "Emitir parecer");
}

async function main() {
  for (const f of ["demo.env", "demo-users.json", "demo-manifest.json"]) {
    if (!existsSync(join(WORKDIR, f))) throw new Error(`${f} ausente. Rode: bun run demo:ivo:setup`);
  }
  const users = JSON.parse(readFileSync(join(WORKDIR, "demo-users.json"), "utf8")) as Array<{ key: string }>;
  if (!users.some((u) => u.key === "alfa_revisora")) throw new Error("revisora fictícia ausente. Rode: bun run demo:ivo:proof");
  const manifest = JSON.parse(readFileSync(join(WORKDIR, "demo-manifest.json"), "utf8")) as { orgs: { alfa: { orgId: string } } };

  log("0. Estado inicial: recria o ledger das organizações fictícias (fase write da jornada; a cascata limpa o C8)");
  const reset = Bun.spawn([process.execPath, join(ROOT, "scripts", "ivo-local-journey-proof.ts"), "write"], { stdout: "ignore", stderr: "inherit" });
  if ((await reset.exited) !== 0) throw new Error("não foi possível recriar o estado inicial (journey write)");

  const edge = spawnEdge(PORT, PROFILE);
  try {
    const cdp = await connectPage(PORT);
    await viewport(cdp, 1366, 900, false);

    log("1. Gestora Alfa (quem cria o protocolo) entra pelo link mágico e abre as ações");
    await magicLinkLogin(cdp, GESTORA, "/ivo-integral/acoes");
    await navigate(cdp, `${APP}/ivo-integral/acoes`);
    await waitFor(cdp, bodyHas(T.A), "ações do ciclo");
    await waitEff(cdp, T.A, "Eficácia: não avaliada", "eficácia inicial de A");
    check("três ações a partir da leitura publicada, cada uma com 'Eficácia: não avaliada'", (await Promise.all([T.A, T.B, T.C].map((t) => effText(cdp, t)))).every((s) => s.includes("Eficácia: não avaliada")));
    const a0 = await artText(cdp, T.A);
    check("a ação mostra a origem (FIB-T, setor, fator) e a dimensão IVO com mapeamento pendente", a0.includes("FIB-T 1.0.0 · Operações · fator Bem-Estar") && a0.includes("mapeamento pendente"));
    const summary0 = await page<string>(cdp, "const s = document.querySelector('section[aria-label^=\"Resumo de acompanhamento\"]'); return s ? s.innerText.replace(/\\s+/g, ' ') : '';");
    check("resumo de acompanhamento presente e sem avaliação concluída", summary0.includes("Encerramento operacional não é avaliação de eficácia") && summary0.includes("Avaliações:") && !summary0.includes("meta atingida") && !summary0.includes("inconclusiva"));
    await snap(cdp, "c8-01-acoes-inicial-desktop");

    log("2. Ação A · protocolo INCOMPLETO fica em rascunho e sobrevive ao recarregamento");
    await clickEffButton(cdp, T.A, "Preparar protocolo de avaliação");
    await fill(cdp, T.A, "efic", "objetivo", "Rascunho inicial ainda incompleto");
    await clickEffButton(cdp, T.A, "Salvar rascunho");
    await waitEff(cdp, T.A, "Rascunho do protocolo salvo.", "rascunho salvo");
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitFor(cdp, bodyHas(T.A), "página recarregada");
    await waitEff(cdp, T.A, "Para registrar, falta:", "pendências do rascunho");
    const draftSection = await effText(cdp, T.A);
    const kept = await page<boolean>(cdp, `const el = byId(${J(T.A)}, 'efic', 'objetivo'); return !!el && el.value === 'Rascunho inicial ainda incompleto';`);
    check("rascunho incompleto reaparece após recarregar, com o texto e a lista do que falta", kept && draftSection.includes("Eficácia: não avaliada") && draftSection.includes("permanece em rascunho"));
    await clickEffButton(cdp, T.A, "Registrar protocolo");
    const refused = await alertText(cdp, T.A);
    check("registrar incompleto é recusado com o motivo e segue rascunho", refused.includes("incompleto") && (await effText(cdp, T.A)).includes("Eficácia: não avaliada"), refused);
    await snap(cdp, "c8-02-rascunho-incompleto-desktop");

    log("3. Ação A · completa, registra o protocolo e observa (fictício: base 40, meta 60, diferença mínima 5, observado 62)");
    await fillProtocol(cdp, T.A, {
      objetivo: "Elevar o índice fictício de carga percebida no turno (critério de demonstração)",
      indicador: "Índice fictício de carga percebida (0–100)",
      unidade: "pontos",
      origem: "medida_da_organizacao",
      baselineValor: String(CRITERIOS.A.baseline),
      metaValor: String(CRITERIOS.A.meta),
      diferenca: String(CRITERIOS.A.diferenca),
      fonte: "Pesquisa interna fictícia de demonstração (segunda rodada)",
    });
    await clickEffButton(cdp, T.A, "Registrar protocolo");
    await waitEff(cdp, T.A, "Protocolo registrado.", "protocolo A registrado");
    check("protocolo A registrado; sem campos editáveis (só nova revisão)", await page<boolean>(cdp, `return !byId(${J(T.A)}, 'efic', 'objetivo') && !!btn(eff(${J(T.A)}), 'Iniciar nova revisão');`));
    await fill(cdp, T.A, "obs", "valor", String(CRITERIOS.A.observado));
    await clickReal(cdp, expr(`return eff(${J(T.A)}).querySelector('form[aria-label="Registrar observação"] button[type="submit"]');`), "registrar observação A");
    await waitEff(cdp, T.A, "Observação registrada.", "observação A");

    log("4. Ação A · quem criou o protocolo tenta emitir o parecer (deve ser recusado)");
    await emitVerdict(cdp, T.A, "meta_atingida", "Tentativa da própria criadora do protocolo.");
    const sameUser = await alertText(cdp, T.A);
    check("a mesma pessoa não emite o parecer", sameUser.includes("pessoa diferente de quem criou o protocolo"), sameUser);
    await snap(cdp, "c8-03-parecer-recusado-mesma-pessoa");

    log("5. Ação A · aprendizagem vinculada a conteúdo de TESTE identificado (execução e aprendizagem separadas)");
    const options = await page<string[]>(cdp, `const s = byId(${J(T.A)}, 'aprendizagem', 'content-link'); return s ? [...s.options].map((o) => o.textContent.trim()) : [];`);
    check("o seletor oferece só conteúdo do fator Bem-Estar, identificado como TESTE", options.some((o) => o.includes("TESTE")) && !options.some((o) => o.includes("Satisfação")), options.join(" | "));
    await fill(cdp, T.A, "aprendizagem", "content", "A pauta curta ajudou o turno a decidir o que priorizar");
    await page(cdp, `const s = byId(${J(T.A)}, 'aprendizagem', 'content-link'); setv(s, [...s.options].find((o) => o.value.startsWith('TESTE-')).value); return true;`);
    await clickReal(cdp, expr(`return byId(${J(T.A)}, 'aprendizagem', 'content').form.querySelector('button[type="submit"]');`), "registrar aprendizagem A");
    await waitFor(cdp, expr(`return art(${J(T.A)}).innerText.includes('Aprendizagem registrada.');`), "aprendizagem registrada");
    const counts = await page<{ exec: number; learn: number }>(cdp, `const a = art(${J(T.A)}); const n = (label) => { const s = a.querySelector('section[aria-label^="' + label + '"]'); return s ? s.querySelectorAll('ol > li, ul > li').length : -1; }; return { exec: n('Evidência de execução'), learn: n('Aprendizagem') };`);
    check("execução e aprendizagem ficam em cartões separados, cada um com os próprios registros", counts.exec >= 1 && counts.learn >= 2, J(counts));

    log("6. Ação B · desfavorável (fictício: base 50, meta 60, observado 48) com a AÇÃO CONCLUÍDA");
    await fillProtocol(cdp, T.B, {
      objetivo: "Elevar o índice fictício de clareza de metas no turno (critério de demonstração)",
      indicador: "Índice fictício de clareza de metas (0–100)",
      unidade: "pontos",
      origem: "medida_da_organizacao",
      baselineValor: String(CRITERIOS.B.baseline),
      metaValor: String(CRITERIOS.B.meta),
      diferenca: String(CRITERIOS.B.diferenca),
      fonte: "Pesquisa interna fictícia de demonstração (segunda rodada)",
    });
    await clickEffButton(cdp, T.B, "Registrar protocolo");
    await waitEff(cdp, T.B, "Protocolo registrado.", "protocolo B registrado");
    await fill(cdp, T.B, "obs", "valor", String(CRITERIOS.B.observado));
    await clickReal(cdp, expr(`return eff(${J(T.B)}).querySelector('form[aria-label="Registrar observação"] button[type="submit"]');`), "registrar observação B");
    await waitEff(cdp, T.B, "Observação registrada.", "observação B");
    const stateBefore = (await effText(cdp, T.B)).match(/Eficácia: [^.]*?(?= Concluir)/)?.[0] ?? "";
    await clickArtButton(cdp, T.B, "Em execução");
    await waitFor(cdp, expr(`return art(${J(T.B)}).innerText.toLowerCase().includes('estado: em execução');`), "B em execução");
    await clickArtButton(cdp, T.B, "Concluída");
    await waitFor(cdp, expr(`return art(${J(T.B)}).innerText.toLowerCase().includes('estado: concluída');`), "B concluída");
    const bText = await effText(cdp, T.B);
    check("concluir a ação não cria parecer nem altera a avaliação", !/Parecer:/.test(bText) && bText.startsWith(stateBefore) && !bText.includes("meta atingida"), `${stateBefore} → ${bText.slice(0, 80)}`);

    log("7. Ação C · indicador de leitura publicada: só referência, sem valor e sem observação numérica");
    await fillProtocol(cdp, T.C, {
      objetivo: "Elevar o fator Padrão de Vida na próxima leitura publicada (critério de demonstração)",
      indicador: "Fator Padrão de Vida — leitura publicada (referência)",
      unidade: "escala 0–4",
      origem: "leitura_publicada",
      metaValor: String(CRITERIOS.C.meta),
      fonte: "Próxima leitura publicada FIB-T do mesmo recorte",
    });
    await clickEffButton(cdp, T.C, "Registrar protocolo");
    await waitEff(cdp, T.C, "Protocolo registrado.", "protocolo C registrado");
    const cText = await effText(cdp, T.C);
    check("baseline por REFERÊNCIA (nenhum valor protegido exibido ou copiado)", cText.includes("referência à leitura publicada de") && /Linha de base: referência/.test(cText), cText.slice(0, 200));
    check("observação sobre leitura publicada de outro ciclo aparece como indisponível, sem campo de valor", cText.includes("resolução protegida do valor não foi implementada") && !(await page<boolean>(cdp, `return !!byId(${J(T.C)}, 'obs', 'valor');`)));
    await snap(cdp, "c8-04-tres-protocolos-registrados-desktop");

    log("8. Revisora independente (outra pessoa, RH_ADMIN fictícia) emite os três pareceres");
    await logout(cdp);
    await magicLinkLogin(cdp, REVISORA, "/ivo-integral/acoes");
    await navigate(cdp, `${APP}/ivo-integral/acoes`);
    await waitEff(cdp, T.A, "Parecer do revisor", "ação A vista pela revisora");
    await emitVerdict(cdp, T.A, "meta_atingida", "Critérios fictícios: meta 60; base 40 → observado 62 supera a diferença mínima de 5.");
    await waitEff(cdp, T.A, "Parecer registrado.", "parecer A registrado");
    await emitVerdict(cdp, T.B, "meta_nao_atingida", "Critérios fictícios: meta 60; base 50 → observado 48 piora.");
    await waitEff(cdp, T.B, "Parecer registrado.", "parecer B registrado");
    await emitVerdict(cdp, T.C, "meta_atingida", "Tentativa de parecer conclusivo sobre leitura publicada.");
    const conclusiveC = await alertText(cdp, T.C);
    check("parecer conclusivo sobre leitura publicada é recusado (resolução protegida indisponível), nada gravado", conclusiveC.includes("resolução protegida"), conclusiveC);
    await emitVerdict(cdp, T.C, "inconclusiva", "Critérios fictícios: sem resolução protegida do valor de outro ciclo; nenhum número é inventado.");
    await waitEff(cdp, T.C, "Parecer registrado.", "parecer C registrado");
    const [ea, eb, ec] = await Promise.all([effText(cdp, T.A), effText(cdp, T.B), effText(cdp, T.C)]);
    check("A · 'Eficácia: meta atingida' · parecer identificado como TESTE SINTÉTICO · atribuição causal não avaliada", ea.toLowerCase().includes("eficácia: meta atingida") && ea.includes("TESTE SINTÉTICO") && ea.includes("Atribuição causal: não avaliada"), ea.slice(0, 160));
    check("B · 'Eficácia: meta não atingida' mesmo com a ação concluída", eb.toLowerCase().includes("eficácia: meta não atingida"), eb.slice(0, 160));
    check("C · 'Eficácia: inconclusiva' com o motivo, sem número", ec.toLowerCase().includes("eficácia: avaliação inconclusiva") && ec.includes("Parecer: Avaliação inconclusiva") && !/Valor observado/.test(ec), ec.slice(0, 160));
    await snap(cdp, "c8-05-tres-desfechos-desktop");

    log("9. Linha do tempo e resumo refletem; conteúdo de TESTE identificado");
    await clickReal(cdp, expr(`return [...art(${J(T.A)}).querySelectorAll('summary')].find((s) => s.textContent.includes('Linha do tempo da ação'));`), "abrir linha do tempo de A");
    await Bun.sleep(300);
    const timeline = await page<string>(cdp, `const d = [...art(${J(T.A)}).querySelectorAll('details')].find((x) => x.querySelector('summary').textContent.includes('Linha do tempo')); return d ? d.innerText.replace(/\\s+/g, ' ') : '';`);
    check("linha do tempo de A: origem, ativação, execução, aprendizagem com conteúdo de TESTE, protocolo, observação e parecer", ["Prioridade definida", "Plano ativado", "Execução registrada", "Conteúdo estudado:", "teste sintético", "Protocolo de avaliação registrado", "Observação registrada", "Parecer de eficácia: meta atingida"].every((t) => timeline.includes(t)), timeline.slice(0, 300));
    const summary1 = await page<string>(cdp, "const s = document.querySelector('section[aria-label^=\"Resumo de acompanhamento\"]'); return s ? s.innerText.replace(/\\s+/g, ' ') : '';");
    check("resumo: 3 protocolos registrados; 1 meta atingida · 1 não atingida · 1 inconclusiva; encerramento operacional ≠ eficácia", (() => { const s = summary1.toLowerCase(); return s.includes("3 registrado(s)") && s.includes("1 meta atingida") && s.includes("1 meta não atingida") && s.includes("1 avaliação inconclusiva") && s.includes("há ações ainda em andamento"); })(), summary1.slice(0, 400));
    const edu = await artText(cdp, T.A);
    check("educação: curadoria pendente (D10) é dita; conteúdo de TESTE não vira recomendação aprovada", edu.includes("Curadoria pendente") && edu.includes("(D10)") && edu.includes("conteúdo de TESTE — não é recomendação aprovada") && !edu.includes("conteúdo aprovado"), edu.slice(0, 200));
    await page(cdp, "window.scrollTo(0, 0); return true;");
    await snap(cdp, "c8-06-resumo-e-timeline-desktop");

    log("10. Recarregar preserva tudo (mesma sessão)");
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitFor(cdp, bodyHas(T.A), "página recarregada");
    await waitEff(cdp, T.A, "Eficácia: Meta atingida", "A após recarregar");
    const [ra, rb, rc] = await Promise.all([effText(cdp, T.A), effText(cdp, T.B), effText(cdp, T.C)]);
    check("os três desfechos reaparecem após recarregar", ra.includes("Eficácia: Meta atingida") && rb.includes("Eficácia: Meta não atingida") && rc.includes("Eficácia: Avaliação inconclusiva"));
    check("a aprendizagem vinculada reaparece com o conteúdo de TESTE", (await artText(cdp, T.A)).includes("Conteúdo estudado:") && (await artText(cdp, T.A)).includes("conteúdo de TESTE"));
    await viewport(cdp, 390, 844, true);
    await Bun.sleep(800);
    await snap(cdp, "c8-07-acoes-celular");
    await viewport(cdp, 1366, 900, false);

    log("11. Governança metodológica (R8): consulta aberta, aprovação indisponível com motivo");
    await navigate(cdp, `${APP}/ivo-integral/governanca`);
    await waitFor(cdp, bodyHas("Situação do registro metodológico"), "página de governança");
    const gov = await cdp.eval<string>("document.body.innerText.replace(/\\s+/g, ' ')");
    check("16 entradas (D1–D10, M1–M6), todas em proposta; nenhuma aprovada", gov.includes("16 de 16 entradas") && gov.includes("Nenhuma decisão ou mapeamento foi aprovado") && gov.includes("nenhuma dimensão recebe valor"));
    check("autoridade: nenhuma configurada; RH_ADMIN não aprova método global; motivo explícito", gov.includes("Nenhuma autoridade metodológica configurada neste ambiente") && gov.includes("não aprova método global") && gov.includes("Aprovação indisponível:"));
    check("efeito de D9 visível: governança de TESTE SINTÉTICO local liberando pareceres conclusivos", gov.includes("TESTE SINTÉTICO — ambiente local descartável"));
    await clickReal(cdp, expr(`return [...document.querySelectorAll('summary')].find((s) => s.textContent.includes('D9'));`), "abrir D9");
    await Bun.sleep(300);
    const d9 = await cdp.eval<string>(`(() => { const s = [...document.querySelectorAll('summary')].find((x) => x.textContent.includes('D9')); return s.closest('details').innerText.replace(/\\s+/g, ' '); })()`);
    check("D9 mostra proposta, justificativa, alternativas, fontes, critérios, efeito da pendência e 'Preparar decisão' desabilitado", ["Proposta:", "Justificativa:", "Alternativas consideradas", "Fontes", "Critérios para aprovar", "Efeito enquanto estiver pendente", "Preparar decisão"].every((t) => d9.includes(t)));
    const disabled = await cdp.eval<boolean>(`(() => { const s = [...document.querySelectorAll('summary')].find((x) => x.textContent.includes('D9')); const b = [...s.closest('details').querySelectorAll('button')].find((x) => x.textContent.includes('Preparar decisão')); return !!b && b.getAttribute('aria-disabled') === 'true'; })()`);
    check("botão 'Preparar decisão' indisponível (aria-disabled)", disabled);
    await snap(cdp, "c8-08-governanca-desktop");
    log("  foco por teclado na governança (primeiras 10 paradas)");
    await cdp.eval("document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)");
    for (const step of await focusSequence(cdp, 10)) log(`  Tab → ${step}`);
    await viewport(cdp, 390, 844, true);
    await Bun.sleep(800);
    await snap(cdp, "c8-09-governanca-celular");
    await viewport(cdp, 1366, 900, false);

    log("12. Beta (outra organização) não vê a Alfa; a governança metodológica é consulta global");
    await logout(cdp);
    await magicLinkLogin(cdp, BETA, "/ivo-integral/acoes");
    await navigate(cdp, `${APP}/ivo-integral/acoes`);
    await Bun.sleep(3000);
    const betaText = await cdp.eval<string>("document.body.innerText.replace(/\\s+/g, ' ')");
    const leaks = [T.A, T.B, T.C, "Organização Fictícia Alfa", "Protocolo de avaliação", "Eficácia: Meta"].filter((t) => betaText.includes(t));
    check("Beta não vê ações, protocolos, pareceres nem aprendizagem da Alfa", leaks.length === 0, leaks.join(","));
    await snap(cdp, "c8-10-acoes-beta-desktop");
    await navigate(cdp, `${APP}/ivo-integral/governanca`);
    await waitFor(cdp, bodyHas("Situação do registro metodológico"), "governança (Beta)");
    check("Beta consulta o mesmo registro metodológico (não é dado da Alfa)", (await cdp.eval<string>("document.body.innerText")).includes("16 de 16 entradas"));
    cdp.close();
  } finally {
    edge.kill();
    await Bun.sleep(500);
    try {
      rmSync(PROFILE, { recursive: true, force: true });
    } catch {
      /* perfil temporário em uso; o SO limpa */
    }
  }

  log("13. Releitura em PROCESSO NOVO sobre os dados criados pela interface (fase read da prova C8)");
  const rows = await psqlScalar(`SELECT string_agg(source_factor_id || ':' || id::TEXT, ',') FROM public.action_items WHERE org_id = '${manifest.orgs.alfa.orgId}';`);
  const ids = Object.fromEntries(rows.split(",").map((p) => p.split(":") as [string, string]));
  writeFileSync(join(WORKDIR, "proof-c8-state.json"), J({ A: ids.bem_estar, B: ids.satisfacao_empresa, C: ids.padrao_de_vida, reviewerId: "" }));
  const read = Bun.spawn([process.execPath, join(ROOT, "scripts", "ivo-local-c8-proof.ts"), "read"], { stdout: "pipe", stderr: "pipe" });
  const readOut = await new Response(read.stdout).text();
  const readCode = await read.exited;
  for (const line of readOut.split(/\r?\n/).filter((l) => /^\s+(ok|FAIL)|fase=/.test(l))) log(line);
  check("processo novo relê os três desfechos, o vínculo educativo, a imutabilidade e o isolamento", readCode === 0);
}

try {
  await main();
} catch (error) {
  failures += 1;
  log(`  FAIL exceção: ${(error as Error).message}`);
}
writeFileSync(join(OUT, "relatorio-c8.txt"), `${report.join("\n")}\n`);
log(`\nverificação visual C8 · falhas=${failures}`);
process.exit(failures > 0 ? 1 : 0);
