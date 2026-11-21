import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildSectorPgrDocument } from "../nr1/pgr-document.server";
import { buildRealOrgPgrDocument, type RealPgrDocumentResult } from "../nr1/pgr-document-real.server";
import { isCloudReady } from "../cloud/supabase-client";
import { describeAuthFailure, resolveOrgMembership } from "@/lib/auth/authorize.server";

const packIdSchema = z.string().min(2).max(40);
const sectorLabelSchema = z.string().min(1).max(120);

/**
 * Monta o dossiê GRO/PGR de um setor (documento + Markdown). Chamado pela tela de
 * relatórios/SST para visualizar ou exportar. Retorna só agregados (k-anon).
 */
export const getSectorPgrDocument = createServerFn({ method: "GET" })
  .inputValidator(z.object({ packId: packIdSchema, sectorLabel: sectorLabelSchema }))
  .handler(({ data }) => buildSectorPgrDocument(data.packId, data.sectorLabel));

// ─── Dossiê GRO/PGR REAL desta organização (leitura — qualquer membro) ──────
// Mesma disciplina de resolveOrgMembership de todo o resto da lane NR-1 real:
// o cliente nunca manda orgId, o servidor resolve via access_token.

const accessTokenSchema = z.object({ accessToken: z.string().min(10) });
const instrumentSchema = z.string().min(2).max(20).default("COPSOQ");

export type LoadRealPgrDocumentResult =
  | { cloudReady: false }
  | { cloudReady: true; error: string }
  | { cloudReady: true; document: RealPgrDocumentResult | null };

export const loadRealPgrDocument = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema.extend({ instrument: instrumentSchema }))
  .handler(async ({ data }): Promise<LoadRealPgrDocumentResult> => {
    if (!isCloudReady()) return { cloudReady: false };

    const auth = await resolveOrgMembership(data.accessToken);
    if (!auth.ok) return { cloudReady: true, error: describeAuthFailure(auth.reason) };

    try {
      const document = await buildRealOrgPgrDocument(auth.membership.orgId, data.instrument);
      return { cloudReady: true, document };
    } catch {
      const { CYCLE_HISTORY_UNAVAILABLE } = await import("../evolucao/cycle-history.server");
      return { cloudReady: true, error: CYCLE_HISTORY_UNAVAILABLE };
    }
  });
