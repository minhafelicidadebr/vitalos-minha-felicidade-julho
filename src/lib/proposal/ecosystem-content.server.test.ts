import { describe, expect, test } from "bun:test";
import { createPresentationVerifier } from "@/lib/presentation/access.server";
import {
  buildEcosystemScenes,
  getEcosystemProposal,
  resolveGlobalStats,
} from "./ecosystem-content.server";
import { createProposalEcosystemHandler, createProposalHandler } from "./proposal-access.server";

const p = getEcosystemProposal();
const text = JSON.stringify(p);

describe("proposta para o ecossistema · conteúdo", () => {
  test("24 cenas na ordem editorial, com ids únicos", () => {
    expect(p.scenes.map((s) => s.number)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(new Set(p.scenes.map((s) => s.id)).size).toBe(24);
  });

  test("percurso executivo = 01, 02, 05, 07, 11, 13, 16, 17, 20 e 24", () => {
    expect(p.scenes.filter((s) => s.executive).map((s) => s.number)).toEqual([
      1, 2, 5, 7, 11, 13, 16, 17, 20, 24,
    ]);
  });

  test("títulos finais da seção 4 (amostra) e chamadas", () => {
    const title = (n: number) => p.scenes[n - 1]!.title;
    expect(title(1)).toBe("Da pesquisa à vitalidade de todo o ecossistema ISG");
    expect(title(16)).toBe("A implantação abrange todo o ecossistema ISG");
    expect(title(20)).toBe("O investimento será dimensionado para o ecossistema");
    expect(title(24)).toBe("Vamos desenhar a implantação no ecossistema ISG?");
    expect(p.scenes[0]!.cta?.label).toBe("Explorar a proposta");
    expect(p.scenes[12]!.cta?.label).toBe("Ver demonstração");
    expect(p.scenes[23]!.cta?.label).toBe("Combinar sessão de desenho");
    expect(p.scenes[19]!.closing).toBe("Investimento a pactuar após dimensionamento.");
    expect(p.demo.title).toBe("Da prioridade à devolutiva");
    expect(p.demo.caption).toBe("Exemplo ilustrativo, com dados fictícios.");
  });

  test("janelas Entenda nas cenas previstas", () => {
    const withUnderstand = p.scenes.filter((s) => s.understand).map((s) => s.number);
    expect(withUnderstand).toEqual([3, 4, 5, 8, 10, 11, 12, 14, 17, 19, 21, 23]);
  });

  test("sem preço, horas, calendário do cenário anterior nem percentuais não aprovados", () => {
    expect(text).not.toMatch(/R\$|60\.000|\d+\s?%|horas? estimad/);
    expect(JSON.stringify(p.scenes)).not.toMatch(/\d{1,2}\/\d{1,2}\/20\d{2}/);
    expect(text).not.toMatch(/14%|78%|70%/);
  });

  test("cena 04 usa a alternativa literal (percentuais Gallup sem claim aprovado)", () => {
    const s = p.scenes[3]!;
    expect(s.lead).toBe(
      "Acompanhar produtividade, absenteísmo e bem-estar ajuda a discutir como as pessoas vivenciam o trabalho e quais prioridades merecem atenção.",
    );
    expect(s.alternative).toBeTruthy();
    expect(s.items.map((i) => i.label)).toEqual(["Produtividade", "Absenteísmo", "Bem-estar"]);
  });

  test("cena 03: números do claim OMS aprovado; sem claim, rótulos sem números (fail-closed)", () => {
    const s = p.scenes[2]!;
    expect(s.items.map((i) => `${i.label} ${i.body}`)).toEqual([
      "12 bilhões de dias de trabalho perdidos por ano",
      "Cerca de US$ 1 trilhão por ano em perdas de produtividade",
    ]);
    const failing = (() => {
      throw new Error("sem claim");
    }) as unknown as Parameters<typeof resolveGlobalStats>[0];
    const fallback = resolveGlobalStats(failing);
    expect(JSON.stringify(fallback)).not.toMatch(/\d/);
    expect(buildEcosystemScenes(failing)[2]!.alternative).toBeTruthy();
  });

  test("fontes oficiais por cena e fala sugerida em todas", () => {
    expect(text).toContain("https://pesquisadefelicidade.com.br/isg/apresentacao");
    expect(text).toContain("www.who.int/news/item/28-09-2022");
    expect(text).toContain("www.gallup.com/workplace/321725");
    expect(text).toContain("normas-regulamentadoras-vigentes/nr-1");
    for (const s of p.scenes) expect(s.speech.length).toBeGreaterThan(20);
  });

  test("imagens geradas são rotuladas", () => {
    for (const s of p.scenes.filter((x) => x.image)) expect(s.imageNote).toBe("Ilustração gerada");
  });
});

const origin = "http://localhost:8094";
const password = "synthetic-proposal-test-only";
const verifier = await createPresentationVerifier(password);
const config = () => ({ origins: [origin], verifier });

function req(path: string, method: string, o: { cookie?: string; password?: string } = {}) {
  const r = new Request(origin + path, {
    method,
    ...(method === "POST" ? { body: JSON.stringify({ password: o.password ?? password }) } : {}),
  });
  if (method !== "GET") {
    r.headers.set("origin", origin);
    r.headers.set("content-type", "application/json");
  }
  if (o.cookie) r.headers.set("cookie", o.cookie);
  return r;
}

describe("proposta para o ecossistema · acesso", () => {
  const session = createProposalHandler({ config });
  const eco = createProposalEcosystemHandler({ config }, session);
  const path = "/api/proposta/ecossistema";

  test("sem configuração: indisponível, sem conteúdo", async () => {
    const h = createProposalEcosystemHandler({ config: () => null }, session);
    const res = await h(req(path, "GET"));
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("ecossistema");
  });

  test("sem sessão: bloqueado, sem conteúdo, no-store", async () => {
    const res = await eco(req(path, "GET"));
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(await res.text()).not.toMatch(/ISG|ecossistema|Brasília/);
  });

  test("a sessão da proposta original abre a nova versão (mesmo cookie)", async () => {
    const ok = await session(req("/api/proposta", "POST"));
    const cookie = ok.headers.get("set-cookie")!.split(";")[0]!;
    const res = await eco(req(path, "GET", { cookie }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body.state).toBe("ready");
    expect(body.deck.scenes).toHaveLength(24);
    // E a original continua servindo o próprio conteúdo com a mesma sessão.
    const original = await (await session(req("/api/proposta", "GET", { cookie }))).json();
    expect(original.deck.investment.total).toBe(60_000);
  });

  test("senha e saída pelo endpoint novo são delegadas à porta original (mesmo limite e cookie)", async () => {
    const wrong = await eco(req(path, "POST", { password: "errada" }));
    expect(wrong.status).toBe(401);
    const ok = await eco(req(path, "POST"));
    expect(ok.headers.get("set-cookie")).toContain("Path=/api/proposta");
    const out = await eco(req(path, "DELETE"));
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  test("cookie de outra porta não abre a nova versão", async () => {
    const res = await eco(req(path, "GET", { cookie: "vitalos_proposal=forjado.123" }));
    expect(res.status).toBe(401);
  });
});
