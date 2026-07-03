// Server-only: lê wave_responses via service role (bypassa RLS "no SELECT"),
// agrega com os engines TypeScript existentes e grava wave_capsules.
// Invariantes: n≥5 nunca violado; desfechos sempre separados das dimensões;
// respostas individuais nunca saem deste módulo.

import {
  aggregateValidatedResponses,
  type AggregationItemDefinition,
  type AggregationSubmission,
} from "@/engine/aggregation/response-aggregation-engine";
import { getWaveSurvey } from "@/mocks/survey-mock";
import { dbInstrumentToSurveyKey } from "@/lib/survey/instrument-mapping";

const K_ANONYMITY_MIN = 5;
// Desfechos Domínio B: não são dimensões de exposição; ficam em coluna separada.
const OUTCOME_PILLARS = new Set(["burnout", "offensive_behaviors"]);

interface RawResponse {
  id: string;
  answers: Record<string, number>;
}

interface CapsuleDim {
  mean: number;
  high_risk_pct: number;
  n: number;
}

export type AggregationTriggerResult =
  | { triggered: true; capsuleId: string; participantCount: number }
  | { triggered: false; count: number; reason: string };

export async function triggerCapsuleAggregation(
  waveId: string,
  instrument: string,
  packId = "enterprise",
  authorizedOrgId?: string,
): Promise<AggregationTriggerResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  // 0. Vínculo tenant (P0-04): quando o chamador é um admin autenticado
  // (checkAndAggregateCapsule), a onda TEM que pertencer à organização dele.
  // Verificado ANTES de qualquer leitura de resposta individual — nega cedo,
  // sem tocar dado sensível. checkAndAggregateByToken (fluxo anônimo pós-
  // submissão) não passa authorizedOrgId: o token já é a autorização.
  if (authorizedOrgId) {
    const { data: waveOwner } = await admin.from("waves").select("org_id").eq("id", waveId).maybeSingle();
    if (!waveOwner || waveOwner.org_id !== authorizedOrgId) {
      return { triggered: false, count: 0, reason: "cross_tenant_denied" };
    }
  }

  // 1. Conta respostas via RPC SECURITY DEFINER (não SELECT direto)
  const { data: count } = await admin.rpc("count_wave_responses", { p_wave_id: waveId });
  const n = (count as number | null) ?? 0;

  // k-anonymity é o único limiar de PUBLICAÇÃO (P0-08) — nunca de fechamento.
  // Abaixo de 5, nenhum agregado é gerado; a onda continua coletando.
  if (n < K_ANONYMITY_MIN) {
    return { triggered: false, count: n, reason: "below_k_anonymity" };
  }

  // 2. Lê respostas brutas via service role (único lugar no app que faz SELECT em wave_responses)
  const { data: rawRows, error: readErr } = await admin
    .from("wave_responses")
    .select("id, answers")
    .eq("wave_id", waveId);

  if (readErr || !rawRows || (rawRows as RawResponse[]).length < K_ANONYMITY_MIN) {
    return { triggered: false, count: n, reason: "read_error" };
  }

  // 3. Obtém definição do instrumento (items + escala)
  // instrument chega como código de banco ("COPSOQ"|"PERMA"|"VIA_T") — mapeia
  // para a chave de registro do survey-mock antes de buscar.
  const survey = getWaveSurvey(packId, dbInstrumentToSurveyKey(instrument));
  if (!survey) {
    return { triggered: false, count: n, reason: "unknown_instrument" };
  }

  const scaleValues = survey.scale.options.map((opt) => opt.value);
  const scale = { min: Math.min(...scaleValues), max: Math.max(...scaleValues) };
  const midpoint = (scale.min + scale.max) / 2;

  const items: AggregationItemDefinition[] = survey.items.map((item) => ({
    itemId: item.id,
    pillarId: item.pillarId,
    reverse: item.reverse,
  }));

  // 4. Mapeia rows → AggregationSubmission[]
  const submissions: AggregationSubmission[] = (rawRows as RawResponse[]).map((row) => ({
    submissionId: row.id,
    answers: Object.entries(row.answers).map(([itemId, value]) => ({
      itemId,
      value: typeof value === "number" ? value : Number(value),
    })),
  }));

  // 5. Agrega com engine puro (inclui reversão de itens marcados reverse:true)
  const result = aggregateValidatedResponses(submissions, items, scale);
  if (!result.valid) {
    return { triggered: false, count: n, reason: `aggregation_invalid:${result.reason}` };
  }

  // 6. high_risk_pct por pilar — scores por respondente (após reversão)
  const pillarItemMap = new Map<string, AggregationItemDefinition[]>();
  for (const item of items) {
    const group = pillarItemMap.get(item.pillarId) ?? [];
    group.push(item);
    pillarItemMap.set(item.pillarId, group);
  }

  const respondentMeansByPillar = new Map<string, number[]>();
  for (const submission of submissions) {
    const answerMap = new Map(submission.answers.map((a) => [a.itemId, a.value]));
    for (const [pillarId, pillarItems] of pillarItemMap) {
      const values = pillarItems
        .map((item) => {
          const v = answerMap.get(item.itemId);
          if (v == null) return null;
          // Aplica reversão: após reversão, LOW = mais exposição/risco para todos os pilares
          return item.reverse ? scale.min + scale.max - v : v;
        })
        .filter((v): v is number => v !== null);
      if (values.length > 0) {
        const respondentMean = values.reduce((s, v) => s + v, 0) / values.length;
        const arr = respondentMeansByPillar.get(pillarId) ?? [];
        arr.push(respondentMean);
        respondentMeansByPillar.set(pillarId, arr);
      }
    }
  }

  // 7. Separa dimensões de exposição vs. desfechos Domínio B
  const dimensions: Record<string, CapsuleDim> = {};
  const outcomes: Record<string, CapsuleDim> = {};

  for (const privatePillar of result.privatePillars) {
    const respondentMeans = respondentMeansByPillar.get(privatePillar.pillarId) ?? [];
    // high_risk_pct: % de respondentes com score médio abaixo do ponto médio da escala
    // (após reversão: baixo = mais exposição)
    const highRiskCount = respondentMeans.filter((m) => m < midpoint).length;
    const highRiskPct =
      respondentMeans.length > 0
        ? Math.round((highRiskCount / respondentMeans.length) * 100)
        : 0;

    const dim: CapsuleDim = {
      mean: privatePillar.mean,
      high_risk_pct: highRiskPct,
      n: privatePillar.n,
    };

    if (OUTCOME_PILLARS.has(privatePillar.pillarId)) {
      outcomes[privatePillar.pillarId] = dim;
    } else {
      dimensions[privatePillar.pillarId] = dim;
    }
  }

  // 8. Obtém org_id da onda
  const { data: wave } = await admin
    .from("waves")
    .select("org_id, instrument")
    .eq("id", waveId)
    .single();

  if (!wave) return { triggered: false, count: n, reason: "wave_not_found" };

  // 9. UPSERT wave_capsules — uma cápsula por onda, ATUALIZADA a cada vez que
  // a agregação roda (P0-08: nunca mais "insere uma vez e recusa depois").
  // Reflete sempre o total de respostas até este momento; é uma LEITURA
  // PARCIAL PROTEGIDA enquanto a onda segue em coleta, e vira definitiva só
  // quando closeWaveAsAdmin roda a agregação final antes de selar.
  const { data: capsule, error: capsuleErr } = await admin
    .from("wave_capsules")
    .upsert(
      {
        wave_id: waveId,
        org_id: wave.org_id,
        instrument: wave.instrument ?? instrument,
        participant_count: result.participantCount,
        dimensions,
        outcomes: Object.keys(outcomes).length > 0 ? outcomes : null,
        cohort_id: `${waveId.slice(0, 8)}-n${result.participantCount}`,
        closed_on: new Date().toISOString().split("T")[0],
        aggregated_at: new Date().toISOString(),
      },
      { onConflict: "wave_id" },
    )
    .select("id")
    .single();

  if (capsuleErr || !capsule) {
    return { triggered: false, count: n, reason: "capsule_insert_error" };
  }

  // A onda NUNCA é tocada aqui — fechar é decisão humana separada (ver
  // closeWaveAsAdmin em wave-admin.server.ts), nunca um efeito colateral
  // automático de atingir o limiar de k-anonimato.
  return {
    triggered: true,
    capsuleId: (capsule as { id: string }).id,
    participantCount: result.participantCount,
  };
}

// ─── Variante por token (usada pelo /responder após submit) ───────────────────
// Resolve o invite token → wave_id e chama triggerCapsuleAggregation.
// Nunca expõe respostas individuais — só dispara o engine server-side.

export async function triggerCapsuleAggregationByToken(
  token: string,
): Promise<AggregationTriggerResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: invite } = await admin
    .from("wave_invites")
    .select("wave_id, waves(instrument, org_id)")
    .eq("token", token)
    .maybeSingle();

  if (!invite?.wave_id) {
    return { triggered: false, count: 0, reason: "invalid_token" };
  }

  const instrument: string = (invite.waves as { instrument?: string } | null)?.instrument ?? "COPSOQ";
  return triggerCapsuleAggregation(invite.wave_id as string, instrument, "enterprise");
}
