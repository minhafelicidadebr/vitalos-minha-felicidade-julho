// Fronteira Engine ≠ Domínio como TESTE, não como doutrina em doc (P1-07).
// O engine faz conta; o significado (packs, labels, mapeamentos) é injetado
// pela camada de composição (src/app/composition/). Se alguém importar
// domain/ de dentro de src/engine/, este teste falha com o arquivo exato —
// a mesma filosofia do schema-parity: invariante que se auto-verifica.
//
// Exceção permitida: arquivos *.test.ts(x) podem importar domain/ (testes de
// contrato como pack-contract.test.ts validam exatamente essa fronteira).

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ENGINE_ROOT = join(import.meta.dir);

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("fronteira Engine ≠ Domínio (invariante 1 do CLAUDE.md)", () => {
  test("nenhum arquivo de src/engine (fora de testes) importa @/domain", () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(ENGINE_ROOT)) {
      const content = readFileSync(file, "utf-8");
      if (/from\s+["']@\/domain|require\(["']@\/domain/.test(content)) {
        offenders.push(file.replace(ENGINE_ROOT, "src/engine"));
      }
    }
    // Se falhar: o import de domain/ pertence à camada de composição
    // (src/app/composition/), nunca ao engine — ver PackProvider como cânone.
    expect(offenders).toEqual([]);
  });
});
