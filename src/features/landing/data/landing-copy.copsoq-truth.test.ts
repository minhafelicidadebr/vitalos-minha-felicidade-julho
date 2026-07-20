// Gate de paridade Truth Layer pública (Onda T3, §9 da auditoria COPSOQ II Product Truth).
// Varre TODO o texto de landing-copy.ts contra forbidden_claims do manifesto canônico
// (src/domain/survey/copsoq-instrument-manifest.json) — nenhuma superfície pública pode
// voltar a dizer "COPSOQ II validado", "aplica o COPSOQ II", "conformidade NR-1 garantida",
// "anonimato garantido", "blindagem jurídica" ou "laudo automático". Escaneia o módulo
// inteiro (não só as seções conhecidas hoje) para que uma seção NOVA que mencione COPSOQ
// também seja coberta automaticamente — é isto que torna a regressão da Onda T1 impossível
// por construção, e não apenas verificada uma vez.

import { describe, expect, test } from "bun:test";

import * as LandingCopy from "./landing-copy";
import { findForbiddenClaimMatches, getCopsoqManifest } from "@/domain/survey/copsoq-instrument-manifest";

/** Extrai recursivamente todas as strings de um módulo/objeto exportado. */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      collectStrings((value as Record<string, unknown>)[key], out);
    }
  }
  return out;
}

describe("landing-copy × manifesto COPSOQ — paridade Truth Layer pública", () => {
  test("nenhum texto da landing contém um claim proibido pelo manifesto canônico", () => {
    const manifest = getCopsoqManifest();
    const allText = collectStrings(LandingCopy).join(" \n ");
    const matches = findForbiddenClaimMatches(allText, manifest);
    expect(matches).toEqual([]);
  });

  test("as seções NR-1/COPSOQ da landing existem e não regrediram para claims curados", () => {
    expect(collectStrings(LandingCopy.NR1).join(" ")).not.toMatch(/copsoq ii validado/i);
    expect(collectStrings(LandingCopy.NR1_LANDING).join(" ")).not.toMatch(/aplica o copsoq ii/i);
    expect(collectStrings(LandingCopy.NR1_LANDING).join(" ")).not.toMatch(
      /conformidade nr-1 (sem dor|garantida)/i,
    );
  });

  test("sanity: o detector reconhece um claim proibido plantado deliberadamente", () => {
    // Garante que o teste acima falharia de verdade se um claim proibido voltasse —
    // sem isto, um bug no extrator de strings faria o teste passar sempre "verde".
    const planted = collectStrings(LandingCopy).join(" ") + " Aplicamos o COPSOQ II validado.";
    expect(findForbiddenClaimMatches(planted)).not.toEqual([]);
  });
});
