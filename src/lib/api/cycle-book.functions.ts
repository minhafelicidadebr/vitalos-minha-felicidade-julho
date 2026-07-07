// Server function do Livro do Ciclo real (I-E3). Leitura — qualquer membro da
// organização. O cliente nunca manda orgId; o servidor resolve via access_token
// (mesma disciplina P0-04 de toda a lane real).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildRealCycleBook } from "../evolucao/cycle-book-real.server";
import { isCloudReady } from "../cloud/supabase-client";
import { describeAuthFailure, resolveOrgMembership } from "@/lib/auth/authorize.server";
import type { CycleBookDocument } from "@/engine/evolucao/cycle-book-engine";

const accessTokenSchema = z.object({ accessToken: z.string().min(10) });

export type LoadCycleBookResult =
  | { cloudReady: false }
  | { cloudReady: true; error: string }
  | { cloudReady: true; book: CycleBookDocument | null };

export const loadCycleBook = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema)
  .handler(async ({ data }): Promise<LoadCycleBookResult> => {
    if (!isCloudReady()) return { cloudReady: false };

    const auth = await resolveOrgMembership(data.accessToken);
    if (!auth.ok) return { cloudReady: true, error: describeAuthFailure(auth.reason) };

    const book = await buildRealCycleBook(auth.membership.orgId);
    return { cloudReady: true, book };
  });
