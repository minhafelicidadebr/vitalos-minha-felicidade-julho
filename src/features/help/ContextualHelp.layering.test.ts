import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// Camadas: concierge (z-60) < fundo da ajuda < conteúdo da ajuda. Assim o lançador fica
// escurecido atrás do diálogo, como no diálogo de método do IVO (z-79/z-80).
const z = (src: string, re: RegExp) => Number(re.exec(src)?.[1] ?? NaN);
const help = readFileSync("src/features/help/ContextualHelp.tsx", "utf8");
const concierge = readFileSync("src/components/concierge/ConciergeWidget.tsx", "utf8");

describe("camadas da ajuda contextual", () => {
  test("fundo acima do concierge e conteúdo acima do fundo", () => {
    const launcher = z(concierge, /right-5 z-\[(\d+)\]/);
    const overlay = z(help, /overlayClassName="z-\[(\d+)\]/);
    const content = z(help, /className="z-\[(\d+)\] flex max-h/);
    expect(launcher).toBe(60);
    expect(overlay).toBeGreaterThan(launcher);
    expect(content).toBeGreaterThan(overlay);
  });
});
