// Prova estática do limite de service role (Q1.1, escopo item 5): nenhum
// arquivo fora de `*.server.ts` pode referenciar a service role key nem
// importar o client que a usa. Roda em todo `bun test src` (rápido, sem
// precisar de build) — a varredura do ARTEFATO de build fica em
// scripts/build-secret-scan.ts (roda depois de `bun run build`; precisa do
// dist/ existir, por isso não é um teste unitário).

import { describe, expect, test } from "bun:test";
import { collectTsSources } from "@/lib/schema-parity/parity-io";

const ADMIN_CLIENT_SPECIFIER = /integrations\/supabase\/client\.server/;
const SERVICE_ROLE_KEY_NAME = /SUPABASE_SERVICE_ROLE_KEY/;

// .functions.ts também é server-only: são handlers de createServerFn
// (TanStack Start) — o próprio framework extrai o corpo para um chunk que
// nunca é enviado ao cliente (ver wave-admin.functions.ts, org-invite.functions.ts
// etc., que já importam client.server hoje, de forma segura e estabelecida).
function isServerOnly(fileName: string): boolean {
  return (
    fileName.endsWith(".server.ts") ||
    fileName.endsWith(".server.tsx") ||
    fileName.endsWith(".functions.ts")
  );
}

describe("service role — nunca referenciado fora de *.server.ts", () => {
  const sources = collectTsSources();
  // Sanity: se este número cair para 0, o glob/filtro quebrou e o teste
  // estaria "passando" sem checar nada — melhor falhar alto a falhar surdo.
  test("varredura encontrou arquivos fonte para checar (sanity do próprio teste)", () => {
    expect(sources.length).toBeGreaterThan(50);
  });

  test("client.server.ts (a definição em si) é o único a citar a env var", () => {
    const offenders = sources.filter(
      (s) => SERVICE_ROLE_KEY_NAME.test(s.content) && !isServerOnly(s.name),
    );
    expect(offenders.map((s) => s.name)).toEqual([]);
  });

  test("nenhum arquivo client-reachable importa @/integrations/supabase/client.server", () => {
    const offenders = sources.filter(
      (s) => ADMIN_CLIENT_SPECIFIER.test(s.content) && !isServerOnly(s.name),
    );
    expect(offenders.map((s) => s.name)).toEqual([]);
  });
});

describe("client público (client.ts) nunca expõe a service role", () => {
  const sources = collectTsSources();
  const publicClient = sources.find((s) => s.name === "src/integrations/supabase/client.ts");

  test("src/integrations/supabase/client.ts existe e foi de fato lido", () => {
    expect(publicClient).toBeDefined();
  });

  test("client.ts só lê VITE_SUPABASE_PUBLISHABLE_KEY — nunca a service role", () => {
    expect(publicClient!.content).not.toMatch(SERVICE_ROLE_KEY_NAME);
    expect(publicClient!.content).toMatch(/VITE_SUPABASE_PUBLISHABLE_KEY/);
  });
});
