#!/usr/bin/env bun
// Verificação visual LOCAL da jornada IVO (opcional; exige Microsoft Edge).
//
// Dirige um Edge headless via Chrome DevTools Protocol, sem dependência nova
// (utilitários em scripts/ivo-cdp.ts):
//   1. abre /ivo-integral sem sessão (o que um visitante vê);
//   2. entra pelo fluxo REAL de link mágico: /entrar → e-mail no Mailpit local
//      → link → /auth/callback;
//   3. captura /ivo-integral, /ivo-integral/q2 e /ivo-integral/acoes em
//      largura de desktop e de celular, mede overflow horizontal;
//   4. percorre a página de ações só com Tab e registra a ordem de foco;
//   5. registra uma evidência pelo formulário (teclado), RECARREGA e confere;
//   6. repete o login como admin da organização Beta e captura a leitura Q2.
//
// O fluxo de protocolo de eficácia, aprendizagem vinculada e governança (C8/R7/R8)
// tem verificação própria: scripts/ivo-local-c8-visual-check.ts.
//
// Saída: PNGs e relatório em .ivo-demo.local/screens/ (ignorado pelo git).
// Alvos: http://localhost:8080 (app) e http://127.0.0.1:55424 (Mailpit) — só
// loopback. Pré-requisitos: demo:ivo:setup, demo:ivo:proof e demo:ivo:dev.

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { APP, bodyHas, connectPage, focusSequence, magicLinkLogin, navigate, shot, spawnEdge, viewport, waitFor, type Cdp } from "./ivo-cdp";

const PORT = 9333;
const OUT = join(process.cwd(), ".ivo-demo.local", "screens");
const PROFILE = join(tmpdir(), `ivo-edge-profile-${Date.now()}`);
mkdirSync(OUT, { recursive: true });

const report: string[] = [];
const log = (line: string) => {
  report.push(line);
  console.log(line);
};
const snap = (cdp: Cdp, name: string) => shot(cdp, OUT, name, log);

async function main() {
  const edge = spawnEdge(PORT, PROFILE);
  try {
    const cdp = await connectPage(PORT);
    await viewport(cdp, 1366, 900, false);

    log("1. Visitante sem sessão");
    await navigate(cdp, `${APP}/ivo-integral`);
    await Bun.sleep(2500);
    await snap(cdp, "01-sem-sessao-desktop");
    log(`  texto visível: ${(await cdp.eval<string>("document.body.innerText")).replace(/\s+/g, " ").slice(0, 160)}`);

    log("2. Login real (link mágico) como admin da Organização Fictícia Alfa");
    await magicLinkLogin(cdp, "gestora.alfa@alfa.ficticia.test");
    await waitFor(cdp, bodyHas("Q2 · FIB-T 1.0.0"), "resumo da leitura Q2");
    await snap(cdp, "02-ivo-alfa-desktop");
    await viewport(cdp, 390, 844, true);
    await Bun.sleep(800);
    await snap(cdp, "03-ivo-alfa-celular");

    await viewport(cdp, 1366, 900, false);
    await navigate(cdp, `${APP}/ivo-integral/q2`);
    await waitFor(cdp, bodyHas("Leitura por setor"), "leitura Q2");
    await snap(cdp, "04-q2-alfa-desktop");
    await viewport(cdp, 390, 844, true);
    await Bun.sleep(800);
    await snap(cdp, "05-q2-alfa-celular");

    await viewport(cdp, 1366, 900, false);
    await navigate(cdp, `${APP}/ivo-integral/acoes`);
    await waitFor(cdp, bodyHas("Eficácia:"), "ação persistida");
    await snap(cdp, "06-acoes-alfa-desktop");

    log("3. Ordem de foco por teclado em /ivo-integral/acoes (primeiras 18 paradas)");
    await cdp.eval("document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)");
    for (const step of await focusSequence(cdp, 18)) log(`  Tab → ${step}`);

    log("4. Registrar evidência pelo formulário (teclado) e recarregar");
    const marker = `Checklist da 2ª roda (verificação visual ${new Date().toISOString().slice(11, 19)})`;
    const focused = await cdp.eval<boolean>(`(() => { const el = document.querySelector('textarea[id^="execucao-"][id$="-content"]'); if (!el) return false; el.focus(); return true; })()`);
    if (!focused) throw new Error("formulário de evidência não encontrado (plano ativo?)");
    await cdp.send("Input.insertText", { text: marker });
    // O campo agora é textarea (Enter quebra linha): envia pelo botão "Registrar execução".
    await cdp.eval(`document.querySelector('section[aria-label^="Evidência de execução"] form button[type="submit"]').click()`);
    await waitFor(cdp, bodyHas("Evidência de execução registrada."), "confirmação da evidência");
    await cdp.send("Page.reload", { ignoreCache: true });
    await Bun.sleep(800);
    await waitFor(cdp, bodyHas(marker), "evidência após recarregar");
    log("  ok evidência registrada pela UI reaparece após recarregar a página");
    await viewport(cdp, 390, 844, true);
    await Bun.sleep(800);
    await snap(cdp, "07-acoes-alfa-celular");

    log("5. Login como admin da Organização Fictícia Beta (outra organização)");
    await viewport(cdp, 1366, 900, false);
    await cdp.eval("localStorage.clear(); sessionStorage.clear()");
    await magicLinkLogin(cdp, "gestor.beta@beta.ficticia.test");
    await navigate(cdp, `${APP}/ivo-integral/q2`);
    await waitFor(cdp, bodyHas("Leitura por setor"), "leitura Q2 Beta");
    const leaks = await cdp.eval<string>("['Operações','Atendimento','Organização Fictícia Alfa', " + JSON.stringify(marker) + "].filter(t => document.body.innerText.includes(t)).join(',')");
    log(`  Beta vê dados da Alfa? ${leaks ? `SIM (${leaks})` : "não"}`);
    await snap(cdp, "08-q2-beta-desktop");
    await navigate(cdp, `${APP}/ivo-integral/acoes`);
    await Bun.sleep(2500);
    const betaActions = await cdp.eval<boolean>(bodyHas("Rodas de conversa"));
    log(`  Beta vê ações da Alfa? ${betaActions ? "SIM" : "não"}`);
    await snap(cdp, "09-acoes-beta-desktop");
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
