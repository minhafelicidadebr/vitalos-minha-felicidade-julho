// Leitura do agregado de coorte a partir da persistencia REAL.
//
// Sem fallback para mock, por decisao explicita: se o backend nao responder,
// a tela mostra erro. Um painel que troca silenciosamente dado real por dado
// ficticio e pior do que um painel quebrado -- ele mente com aparencia de
// normalidade, e quem le nao tem como saber.
//
// A RPC aggregate_cohort_responses ja faz escopo de tenant por auth.uid() e
// aplica k-anon no proprio banco, entao a sessao do usuario basta: nao ha
// service role no cliente.

import { supabase } from "@/integrations/supabase/client";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import { buildFibtCohortReport, type CohortAggregate, type FibtCohortReport } from "@/lib/fibt/fibt-cohort-report";

// wave_cohorts e aggregate_cohort_responses chegam na Migration A; os tipos
// gerados so passam a conhece-los depois que o Lovable regenera o schema.
// Mesmo padrao ja usado em learning-adapter.ts.
const db = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface CohortRef {
  id: string;
  key: string;
  label: string;
}

export type CohortLoad =
  | { estado: "indisponivel"; motivo: string }
  | { estado: "erro"; motivo: string }
  | { estado: "ok"; coortes: CohortRef[] };

export async function loadWaveCohorts(waveId: string): Promise<CohortLoad> {
  if (!isCloudReady()) {
    return { estado: "indisponivel", motivo: "Backend nao configurado neste ambiente." };
  }
  const { data, error } = await db
    .from("wave_cohorts")
    .select("id, key, label")
    .eq("wave_id", waveId)
    .order("key");

  if (error) return { estado: "erro", motivo: error.message };
  return {
    estado: "ok",
    coortes: (data ?? []) as CohortRef[],
  };
}

export type CohortReportLoad =
  | { estado: "indisponivel"; motivo: string }
  | { estado: "erro"; motivo: string }
  | { estado: "ok"; relatorio: FibtCohortReport };

export async function loadFibtCohortReport(
  waveId: string,
  cohortId: string,
): Promise<CohortReportLoad> {
  if (!isCloudReady()) {
    return { estado: "indisponivel", motivo: "Backend nao configurado neste ambiente." };
  }

  const { data, error } = await db.rpc("aggregate_cohort_responses", {
    p_wave_id: waveId,
    p_cohort_id: cohortId,
  });

  if (error) return { estado: "erro", motivo: error.message };

  const row = (data as unknown as
    { n: number; k_min: number; visible: boolean; item_means: Record<string, number> | null }[]
  )?.[0];

  if (!row) {
    // Sem linha nao significa "zero respostas" — significa que nao sabemos.
    return { estado: "erro", motivo: "A agregacao nao retornou resultado." };
  }

  const agg: CohortAggregate = {
    n: row.n,
    kMin: row.k_min,
    visible: row.visible,
    itemMeans: row.item_means,
  };

  return { estado: "ok", relatorio: buildFibtCohortReport(agg) };
}
