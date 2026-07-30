// Fronteira Engine ≠ Domínio como TESTE, não como doutrina em doc (P1-07).
// O engine faz conta; o significado (packs, labels, mapeamentos) é injetado
// pela camada de composição (src/app/composition/). Se alguém importar
// domain/ de dentro de src/engine/, este teste falha com o arquivo exato —
// a mesma filosofia do schema-parity: invariante que se auto-verifica.
//
// Exceção permitida: arquivos *.test.ts(x) podem importar domain/ (testes de
// contrato como pack-contract.test.ts validam exatamente essa fronteira).

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Glob } from "bun";

const ENGINE_ROOT = join(import.meta.dir);
const DOMAIN_IMPORT = /from\s+["']@\/domain|require\(["']@\/domain/;

// TEST-STAB-1: a versão anterior varria a árvore com readdirSync recursivo +
// um statSync síncrono por entrada (2 syscalls JS por arquivo/pasta, ~280+
// chamadas para os 142 arquivos de src/engine). Isolado isso é rápido, mas
// sob carga plena do gate (250+ arquivos de teste competindo pelo processo)
// a latência por syscall pode disparar, e como o scan inteiro é síncrono
// (bloqueia a thread única do JS), o timer de timeout do bun só consegue
// medir o estouro DEPOIS que o scan termina — foi assim que a suíte cheia
// já reportou esse teste como "timeout" mesmo isolado ele completando em
// bem menos de 1s. `Bun.Glob` (nativo, mesmo padrão já usado em
// src/lib/schema-parity/parity-io.ts) faz a travessia em código nativo, sem
// o round-trip JS↔syscall por entrada — reduz o trabalho real, não só
// disfarça o sintoma aumentando o timeout. Cobertura idêntica verificada
// (142/142 arquivos, mesmo conjunto, ver relatório TEST-STAB-1).
function collectSourceFiles(dir: string): string[] {
  const glob = new Glob("**/*.{ts,tsx}");
  const files: string[] = [];
  for (const rel of glob.scanSync({ cwd: dir })) {
    if (/\.test\.(ts|tsx)$/.test(rel)) continue;
    files.push(join(dir, rel));
  }
  // Bun.Glob.scanSync() não garante ordem estável entre sistemas de arquivo
  // (ordenado no Windows, não-ordenado no Linux/CI) — ordenar deixa a lista
  // de offenders determinística e reproduzível em qualquer ambiente.
  return files.sort();
}

function findDomainImportOffenders(dir: string): string[] {
  const offenders: string[] = [];
  for (const file of collectSourceFiles(dir)) {
    const content = readFileSync(file, "utf-8");
    if (DOMAIN_IMPORT.test(content)) {
      offenders.push(file);
    }
  }
  return offenders;
}

describe("fronteira Engine ≠ Domínio (invariante 1 do CLAUDE.md)", () => {
  test("nenhum arquivo de src/engine (fora de testes) importa @/domain", () => {
    const offenders = findDomainImportOffenders(ENGINE_ROOT).map((file) =>
      file.replace(ENGINE_ROOT, "src/engine"),
    );
    // Se falhar: o import de domain/ pertence à camada de composição
    // (src/app/composition/), nunca ao engine — ver PackProvider como cânone.
    expect(offenders).toEqual([]);
  });

  // Prova positiva do mecanismo (TEST-STAB-1): o teste acima só prova que
  // NADA foi encontrado — o que também seria verdade se o scanner estivesse
  // quebrado e varresse zero arquivos. Este teste prova que um import real
  // de @/domain É detectado, contra uma árvore isolada em tmpdir (nunca
  // toca src/engine de verdade).
  test("o mecanismo de varredura detecta um import de @/domain quando presente", () => {
    const scratch = mkdtempSync(join(tmpdir(), "engine-boundary-fixture-"));
    try {
      writeFileSync(join(scratch, "offender.ts"), 'import { x } from "@/domain/foo";\nexport const y = x;\n');
      writeFileSync(join(scratch, "clean.ts"), "export const ok = 1;\n");
      writeFileSync(join(scratch, "offender.test.ts"), 'import { x } from "@/domain/foo";\n');

      const offenders = findDomainImportOffenders(scratch);

      expect(offenders).toHaveLength(1);
      expect(offenders[0]).toContain("offender.ts");
      expect(offenders[0]).not.toContain("offender.test.ts");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
