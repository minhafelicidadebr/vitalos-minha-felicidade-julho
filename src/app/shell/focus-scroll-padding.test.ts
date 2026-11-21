/**
 * Rolagem do foco e barras fixas do AppShell (WCAG 2.2 · 2.4.11, Foco não obscurecido).
 *
 * Medido no navegador real (390 px, Tab pelo formulário de inclusão de /ivo-integral/acoes): sem reserva
 * embaixo, o campo que recebia o foco ficava 100% atrás da barra inferior móvel. O cabeçalho sticky já era
 * protegido por `scroll-padding-top`; a barra inferior (fixed, `bottom-3`, só abaixo de xl) passou a ter o par
 * `scroll-padding-bottom`. Este teste só lê arquivos: trava o acoplamento entre a barra, o breakpoint e a reserva.
 * O comportamento em si é conferido por `bun run demo:ivo:visual:plan` (Tab em 390 px).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..");
const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
const shell = readFileSync(join(ROOT, "src/app/shell/AppShell.tsx"), "utf8");

describe("AppShell — rolagem do foco com barras fixas", () => {
  test("a barra inferior móvel é fixed, ancorada embaixo e some em xl (80rem)", () => {
    expect(shell).toMatch(/<nav\s+className="fixed [^"]*\bbottom-3\b[^"]*\bxl:hidden\b/);
    // O breakpoint xl é o padrão do Tailwind (80rem): a regra abaixo só vale se ninguém o sobrescreveu.
    expect(css).not.toMatch(/--breakpoint-xl\s*:/);
  });

  test("abaixo de xl a rolagem do foco para 6rem acima da borda de baixo, a mesma folga do pb-24 do <main>", () => {
    expect(css).toMatch(/@media \(width < 80rem\)\s*\{\s*html\s*\{\s*scroll-padding-bottom:\s*6rem;\s*\}\s*\}/);
    expect(shell).toMatch(/<main\b[^>]*className="[^"]*\bpb-24\b[^"]*\bxl:pb-0\b/);
  });

  test("o cabeçalho sticky segue protegido em cima por scroll-padding-top (6rem cobre a altura h-16 + borda)", () => {
    expect(shell).toMatch(/<header className="sticky top-0 [^"]*"/);
    expect(shell).toMatch(/\bh-16\b/);
    expect(css).toMatch(/html\s*\{[^}]*scroll-padding-top:\s*6rem;/);
  });
});
