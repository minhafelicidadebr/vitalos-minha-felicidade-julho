// Testes do scanner (§14 "Scanner") + gate real contra a landing pública.

import { describe, expect, test } from "bun:test";
import { orphanFindings, scanCommercialSurfaceText } from "./commercial-claims-scanner";
import * as LandingCopy from "@/features/landing/data/landing-copy";

/**
 * §12 diz para buscar "nas superfícies registradas" — não em toda a landing.
 * O texto abaixo é exatamente os 7 campos bindados na B4 (identidade do
 * instrumento, privacidade, GRO/PGR, VIA-T, sustentabilidade, baseline
 * econômico, sanções). Varrer o arquivo inteiro (1700+ linhas de copy não
 * migrada nesta fatia, cheia de usos legítimos de "diagnóstico"/"anonimato"/
 * "benchmark" como nome de feature real) pertence a uma varredura site-wide
 * futura maior — fora do escopo "MVP enxuto" desta fatia.
 */
function registeredSurfaceTexts(): string[] {
  const t1 = LandingCopy.NR1_LANDING.jornada.quarters.find((r) => r.q === "T1")!;
  return [
    t1.instrument,
    LandingCopy.METHOD_DEEP.stages.find((s) => s.title === "Mensurar")!.what,
    LandingCopy.NR1_LANDING.hero.sub,
    LandingCopy.LENSES_DEEP.pillars.find((l) => l.q.startsWith("Q4"))!.why,
    LandingCopy.NR1_LANDING.jornada.finale.text,
    LandingCopy.ECONOMIC_BASELINE.text,
    LandingCopy.NR1_LANDING.mudou.body,
  ];
}

describe("commercial-claims-scanner — classificação básica", () => {
  test("detecta número órfão (percentual sem governança nem exceção)", () => {
    const findings = scanCommercialSurfaceText("Aumente sua produtividade em 47% com o programa.");
    expect(findings.some((f) => f.term === "percentual" && f.classification === "orphan")).toBe(
      true,
    );
  });

  test("ignora (classifica como governed) número que cai DENTRO do span de um texto aprovado", () => {
    // Nenhum dos 8 claims reais do MVP tem número na variant (por desenho —
    // §7 proíbe números novos nesta fatia). Para provar o mecanismo de span,
    // injeta um texto "aprovado" sintético via override — só para este teste.
    const fixtureGoverned = "Recuperação estimada em até 87% dos casos documentados.";
    const findings = scanCommercialSurfaceText(fixtureGoverned, [fixtureGoverned]);
    const pct = findings.find((f) => f.term === "percentual");
    expect(pct?.classification).toBe("governed");
  });

  test("número FORA do span de qualquer texto aprovado continua órfão, mesmo com um claim governado por perto", () => {
    const fixtureGoverned = "Recuperação estimada em até 87% dos casos documentados.";
    const text = `${fixtureGoverned} Além disso, aumente sua receita em 500%.`;
    const findings = scanCommercialSurfaceText(text, [fixtureGoverned]);
    const orphanPct = findings.find((f) => f.match === "500%");
    expect(orphanPct?.classification).toBe("orphan");
  });

  test("detecta ROI órfão (razão N:N sem governança)", () => {
    const findings = scanCommercialSurfaceText("Alcance um retorno de 5:1 sobre o investimento.");
    expect(findings.some((f) => f.term === "razão" && f.classification === "orphan")).toBe(true);
  });

  test("detecta chancela órfã", () => {
    const findings = scanCommercialSurfaceText("Conteúdo sob chancela de uma universidade renomada.");
    expect(findings.some((f) => f.term === "chancela" && f.classification === "orphan")).toBe(
      true,
    );
  });

  test("detecta parceria órfã", () => {
    const findings = scanCommercialSurfaceText("Em parceria oficial com institutos internacionais.");
    expect(findings.some((f) => f.term === "parceria" && f.classification === "orphan")).toBe(
      true,
    );
  });

  test("detecta garantia órfã", () => {
    const findings = scanCommercialSurfaceText("Resultado garantido em até 90 dias.");
    expect(findings.some((f) => f.term === "garantido" && f.classification === "orphan")).toBe(
      true,
    );
  });
});

describe("commercial-claims-scanner — sem falso positivo nas exceções estruturais (§12)", () => {
  test("Q1/Q2 não geram órfão de percentual/razão", () => {
    const findings = scanCommercialSurfaceText("No Q1 medimos risco; no Q2, ecossistema.");
    expect(findings.filter((f) => f.classification === "orphan")).toEqual([]);
  });

  test("versão 1.0 não gera órfão", () => {
    const findings = scanCommercialSurfaceText("Registry na versão 1.0, congelado.");
    expect(findings.filter((f) => f.classification === "orphan")).toEqual([]);
  });

  test("data ISO não gera órfão", () => {
    const findings = scanCommercialSurfaceText("Revisado em 2026-07-23.");
    expect(findings.filter((f) => f.classification === "orphan")).toEqual([]);
  });

  test("'41 itens' não gera órfão", () => {
    const findings = scanCommercialSurfaceText("A bateria cobre 41 itens estruturais.");
    expect(findings.filter((f) => f.classification === "orphan")).toEqual([]);
  });

  test("'n≥5 autorizado' não gera órfão", () => {
    const findings = scanCommercialSurfaceText("Agregação com n≥5 autorizado pelo engine.");
    expect(findings.filter((f) => f.classification === "orphan")).toEqual([]);
  });
});

describe("commercial-claims-scanner — gate real contra as superfícies registradas (§12, regressão)", () => {
  const registeredText = registeredSurfaceTexts().join(" \n ");

  test("zero achados órfãos nas 7 superfícies bindadas", () => {
    // Fechamento do achado da entrega anterior: o prefixo livre de
    // NR1_LANDING.hero.sub usava "anonimato" fora de qualquer span
    // governado. Corrigido (fechamento H2.1B) trocando por "acesso por
    // token e publicação agregada com limiar mínimo de grupo" — mesma
    // exatidão técnica, sem o termo que o scanner não pode aceitar como
    // exceção. Nenhum uso público livre de "anonimato" sobrevive nas
    // superfícies registradas.
    const orphans = orphanFindings(registeredText);
    expect(orphans).toEqual([]);
  });

  test("'anonimato' nunca é uma exceção estrutural do scanner", () => {
    // Trava explícita contra o risco apontado pelo founder: nenhuma versão
    // futura deste arquivo pode "resolver" o achado acima adicionando
    // "anonimato" à lista SAFE_EXCEPTIONS em vez de corrigir o texto.
    const findings = scanCommercialSurfaceText("Dado tratado com anonimato garantido pela plataforma.");
    const anonimatoFinding = findings.find((f) => f.term === "anonimato");
    expect(anonimatoFinding?.classification).not.toBe("suspicious");
    expect(anonimatoFinding?.classification).toBe("orphan");
  });

  test("regressão explícita: os termos já removidos na H2.1A continuam ausentes das superfícies registradas", () => {
    const lower = registeredText.toLowerCase();
    for (const term of [
      "bateria copsoq ii",
      "diagnóstico científico",
      "garantido por construção",
      "nr-1 pagar por si mesma",
      "r$ 1.610",
      "r$ 6.708",
      "chancela da university of oxford",
    ]) {
      expect(lower).not.toContain(term);
    }
  });
});
