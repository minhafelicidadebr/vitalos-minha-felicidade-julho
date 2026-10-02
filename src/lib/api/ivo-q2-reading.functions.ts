// Server function da leitura Q2 (FIB-T) na experiência IVO — R5.
//
// POST (não GET) para o access token não viajar na query string. O schema é
// `.strict()`: um `orgId` enviado pelo cliente é RECUSADO, não ignorado — a
// organização vem só da sessão (ver ivo-q2-reading.server.ts).
//
// Fora da allowlist HML de propósito: no deployment HML esta função responde
// 404 na borda (hml-deployment-boundary.server.ts) e, se alcançada, recusa.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const ivoQ2ReadingSchema = z
  .object({
    accessToken: z.string().min(10).optional(),
    waveId: z.string().uuid().optional(),
  })
  .strict();

export const loadIvoQ2Reading = createServerFn({ method: "POST" })
  .inputValidator(ivoQ2ReadingSchema)
  .handler(async ({ data }) => {
    const { loadIvoQ2ReadingForSession } = await import("@/lib/ivo/ivo-q2-reading.server");
    return loadIvoQ2ReadingForSession(data);
  });
