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
import { emitOpsEvent } from "@/lib/telemetry/ops-events.server";
import {
  assertHmlBackendBoundary,
  type HmlBackendBoundaryEnv,
} from "@/lib/fibt-hml/hml-backend-boundary.server";
import { assertInviteWithinAuthorizedHmlBatch } from "@/lib/fibt-hml/hml-contract";

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
  | { triggered: true; capsuleId: string; participantCount: number; withheldForPrivacy?: true }
  | { triggered: false; count: number; reason: string };

export async function triggerCapsuleAggregation(
  waveId: string,
  instrument: string,
  authorizedOrgId?: string,
): Promise<AggregationTriggerResult> {
  // FIBT-HML-2E (P0): esta função toca banco (lê wave_responses, grava
  // wave_capsules) e é uma das server functions permitidas pelo request
  // boundary da instância HML (checkAndAggregateByToken chama até aqui) —
  // o request boundary só confirma QUAL função está sendo chamada, nunca
  // se o backend é seguro. Sem esta checagem, uma instância HML declarada
  // mas não atestada (ex.: apontando sem querer para produção) executaria
  // esta agregação normalmente.
  const hmlBoundary = assertHmlBackendBoundary(process.env as HmlBackendBoundaryEnv);
  if (hmlBoundary.hmlDeclared && !hmlBoundary.attested) {
    return { triggered: false, count: 0, reason: "hml_backend_not_attested" };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  // 0. Dono da onda + pack da organização, numa consulta só. O packId NUNCA vem
  // do chamador (mesma disciplina P0-04 de nunca aceitar do payload o que o
  // banco resolve): uma org Escola agrega com o survey do pack Escola, sempre.
  const { data: waveOwner } = await admin
    .from("waves")
    .select("org_id, organizations(pack_id)")
    .eq("id", waveId)
    .maybeSingle();
  if (!waveOwner) {
    return { triggered: false, count: 0, reason: "wave_not_found" };
  }

  // Vínculo tenant (P0-04): quando o chamador é um admin autenticado
  // (checkAndAggregateCapsule), a onda TEM que pertencer à organização dele.
  // Verificado ANTES de qualquer leitura de resposta individual — nega cedo,
  // sem tocar dado sensível. checkAndAggregateByToken (fluxo anônimo pós-
  // submissão) não passa authorizedOrgId: o token já é a autorização.
  if (authorizedOrgId && waveOwner.org_id !== authorizedOrgId) {
    return { triggered: false, count: 0, reason: "cross_tenant_denied" };
  }

  const packId: string =
    (waveOwner.organizations as { pack_id?: string | null } | null)?.pack_id ?? "enterprise";

  // 1. Conta respostas via RPC SECURITY DEFINER (não SELECT direto)
  const { data: count } = await admin.rpc("count_wave_responses", { p_wave_id: waveId });
  const n = (count as number | null) ?? 0;

  // k-anonymity é o único limiar de PUBLICAÇÃO (P0-08) — nunca de fechamento.
  // Abaixo de 5, nenhum agregado é gerado; a onda continua coletando.
  if (n < K_ANONYMITY_MIN) {
    return { triggered: false, count: n, reason: "below_k_anonymity" };
  }

  // 1b. Supressão diferencial por snapshot (P1 / TASK 10.1 §C): esta função
  // roda de novo a CADA resposta nova (via checkAndAggregateByToken, chamado
  // pelo /responder logo após o submit) E no fechamento manual da onda
  // (closeWaveAsAdmin). Sem controle de lote, cada execução reescreve
  // wave_capsules com o total e as médias EXATAS até este instante — e
  // wave_capsules é lido por QUALQUER membro da organização
  // (loadLatestOrgCapsule). Duas leituras sucessivas do mesmo pilar
  // (n=9,mean=m0 → n=10,mean=m1) permitem calcular
  // valor_do_respondente_mais_novo = m1·10 − m0·9 — a mesma resposta exata de
  // uma única pessoa, mesmo que os dois "n" individualmente respeitem
  // k_min=5. Nenhuma checagem de tamanho ABSOLUTO evita isso: o problema é o
  // DELTA entre publicações sucessivas.
  //
  // Correção: só publica (upsert em wave_capsules, com médias/dimensões
  // novas) na primeira vez que a onda atinge k_min, ou quando o total
  // cresceu por PELO MENOS k_min desde a última publicação — nunca por um
  // incremento menor. Isso garante que a diferença aritmética entre duas
  // cápsulas publicadas sucessivas sempre envolve k_min pessoas ou mais,
  // nunca uma só.
  //
  // SEM EXCEÇÃO PARA O FECHAMENTO (TASK 10.1 §C, corrigindo uma falha real
  // encontrada por red-team adversarial nesta mesma tarefa): uma versão
  // anterior desta função aceitava um parâmetro forcePublish para que
  // closeWaveAsAdmin pudesse ignorar este lote e sempre publicar a
  // agregação final exata. Provado por simulação adversarial que isso
  // reabre exatamente o ataque que este bloco existe para impedir — ex.:
  // cápsula publicada em n=10 e onda fechada em n=11 (delta=1) revelaria a
  // resposta exata do respondente 11 por subtração, mesmo a cápsula final
  // "parecendo" definitiva. O fechamento de uma onda NUNCA é motivo
  // suficiente para violar k-anonimato — é uma decisão humana sobre
  // QUANDO parar de coletar, não uma isenção de privacidade. Se o total
  // no fechamento não cresceu o suficiente desde a última publicação, a
  // cápsula existente (já seguramente publicada) permanece observável sem
  // alteração — o fechamento sela a onda mesmo assim, mas o relatório
  // fica honestamente marcado como retido por proteção de privacidade
  // (withheldForPrivacy), nunca republicado com um snapshot mais fino.
  const { data: existingCapsule } = await admin
    .from("wave_capsules")
    .select("id, participant_count")
    .eq("wave_id", waveId)
    .maybeSingle();

  if (existingCapsule) {
    const lastPublishedCount = (existingCapsule as { participant_count: number }).participant_count;
    const delta = n - lastPublishedCount;
    if (delta < K_ANONYMITY_MIN) {
      return {
        triggered: true,
        capsuleId: (existingCapsule as { id: string }).id,
        participantCount: n,
        withheldForPrivacy: true,
      };
    }
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

  emitOpsEvent("capsule_published", {
    orgId: waveOwner.org_id as string,
    waveId,
    context: { participantCount: result.participantCount },
  });

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
  // FIBT-HML-2E (P0): mesma checagem de triggerCapsuleAggregation, mas
  // ANTES da própria query de wave_invites desta função — o backend
  // precisa estar atestado antes de qualquer I/O, não só antes do repasse
  // para triggerCapsuleAggregation.
  const hmlBoundary = assertHmlBackendBoundary(process.env as HmlBackendBoundaryEnv);
  if (hmlBoundary.hmlDeclared && !hmlBoundary.attested) {
    return { triggered: false, count: 0, reason: "hml_backend_not_attested" };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  // Em modo HML atestado, a query já traz a cadeia
  // invite→cohort→wave→organization para o vínculo de lote — mesmo padrão
  // de invite-resolve.server.ts/response-capture.server.ts. Fora do modo
  // HML, a query permanece exatamente a de sempre.
  const selectColumns = hmlBoundary.hmlDeclared
    ? "wave_id, expires_at, waves(instrument, org_id, label, organizations(slug)), wave_cohorts(key)"
    : "wave_id, waves(instrument, org_id)";

  const { data: invite } = await admin
    .from("wave_invites")
    .select(selectColumns)
    .eq("token", token)
    .maybeSingle();

  if (!invite?.wave_id) {
    return { triggered: false, count: 0, reason: "invalid_token" };
  }

  if (hmlBoundary.hmlDeclared) {
    const waveJoin = invite.waves as { organizations?: { slug?: string } | null; label?: string } | null;
    const cohortJoin = invite.wave_cohorts as { key?: string } | null;
    const binding = assertInviteWithinAuthorizedHmlBatch({
      organizationSlug: waveJoin?.organizations?.slug,
      waveLabel: waveJoin?.label,
      cohortKey: cohortJoin?.key,
      expiresAt: invite.expires_at as string | null,
    });
    if (!binding.ok) {
      return { triggered: false, count: 0, reason: "invalid_token" };
    }
  }

  const instrument: string = (invite.waves as { instrument?: string } | null)?.instrument ?? "COPSOQ";
  return triggerCapsuleAggregation(invite.wave_id as string, instrument);
}
