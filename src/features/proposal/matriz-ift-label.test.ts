// Guarda da decisão do fundador (23/11/2026): o rótulo público do ciclo Mensurar · Educar ·
// Transformar · Evoluir é "Matriz IFT". "M.E.T.E."/"METE" só sobrevivem como nome técnico legado
// (comentários, identificadores, chaves internas), nunca em texto que uma pessoa lê.
import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";

const PATTERN = String.raw`M\.E\.T\.E|\bMETE\b`;

const visibleLines = () =>
  execSync(`git grep -nE "${PATTERN}" -- "src/**/*.ts" "src/**/*.tsx"`, { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((l) => !/\.test\.tsx?:/.test(l))
    .filter((l) => !/crosswalk-engine\.ts/.test(l))
    .filter((l) => !/^\s*(\/\/|\/\*|\*|\{\/\*)/.test(l.replace(/^[^:]+:\d+:/, "")))
    // Mensagem técnica de validação, só para desenvolvedores.
    .filter((l) => !/não resolve a um modo M\.E\.T\.E\./.test(l));

describe("Matriz IFT · rótulo público", () => {
  test("o padrão de busca encontra o nome antigo (a guarda não está cega)", () => {
    const re = new RegExp(PATTERN);
    expect(re.test("Ciclo M.E.T.E.")).toBe(true);
    expect(re.test("#METE")).toBe(true);
    expect(re.test("MeteEsgMatrixPreview")).toBe(false);
  });

  test("nenhum texto visível usa o nome antigo", () => {
    expect(visibleLines()).toEqual([]);
  });
});
