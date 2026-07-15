// Divergência entre o schema canônico (docs/ai/florencia-skills/, biblioteca de
// governança) e a cópia de runtime (src/domain/florencia/contracts/) QUEBRA o
// gate — nunca editar a cópia de runtime à mão; rodar
// `bun run scripts/sync-florencia-contracts.ts` e commitar o resultado.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");

describe("florencia contract parity — canônico × runtime", () => {
  test("context-envelope.schema.json: runtime é byte-idêntico ao canônico", () => {
    const canonical = readFileSync(
      resolve(ROOT, "docs/ai/florencia-skills/schemas/context-envelope.schema.json"),
      "utf-8",
    );
    const runtime = readFileSync(
      resolve(ROOT, "src/domain/florencia/contracts/context-envelope.schema.json"),
      "utf-8",
    );
    expect(runtime).toBe(canonical);
  });
});
