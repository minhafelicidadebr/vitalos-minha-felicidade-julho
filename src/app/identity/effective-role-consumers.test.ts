// Guarda: telas empresariais leem o papel por useEffectiveRole, que dá
// precedência ao papel institucional da sessão. Ler a persona de demo direto
// só é permitido nos pontos abaixo, cada um com motivo registrado.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(import.meta.dir, "..", "..");

const ALLOWED: Record<string, string> = {
  "app/identity/useEffectiveRole.ts": "fonte do papel efetivo",
  "app/shell/AppShell.tsx": "seletor de persona; já resolve com resolveEffectiveRoleId",
  "features/help/ContextualHelp.tsx":
    "fallback; quem chama passa roleId (evita 1 sessão por ícone)",
  "app/shell/PackSwitcher.tsx": "só grava a persona (setRole), não lê papel",
  "features/guide/Q2DemoWalkthrough.tsx": "só grava a persona (setRole) no percurso demonstrativo",
  "routes/acesso.tsx": "explica a fronteira de acesso da demonstração (buildDemoAccessStory)",
  "routes/q3-demo.tsx": "página explicitamente demonstrativa com org fictícia",
  "routes/escola.tsx": "home setorial fora do escopo empresarial",
  "routes/governo.tsx": "home setorial fora do escopo empresarial",
  "routes/condominios.tsx": "home setorial fora do escopo empresarial",
  "routes/saude.tsx": "home setorial fora do escopo empresarial",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

describe("papel efetivo · consumidores da persona", () => {
  const readers = walk(SRC)
    .filter((file) => readFileSync(file, "utf8").includes("usePersona("))
    .map((file) => relative(SRC, file).split("\\").join("/"))
    .sort();

  test("só os pontos registrados leem a persona de demonstração direto", () => {
    expect(readers).toEqual(Object.keys(ALLOWED).sort());
  });

  test("telas com lista de bloqueio tratam sessão pendente como visão restrita", () => {
    const onda = readFileSync(join(SRC, "routes/onda.tsx"), "utf8");
    const devolutiva = readFileSync(join(SRC, "routes/devolutiva.tsx"), "utf8");
    const copilota = readFileSync(join(SRC, "routes/copilota.tsx"), "utf8");
    expect(onda).toContain("roleId === null ||");
    expect(devolutiva).toContain("roleId === null || INDIVIDUAL_ROLES.has(roleId)");
    expect(copilota).toContain("roleId !== null && canSeeCollective(packId, roleId)");
  });
});
