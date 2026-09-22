// Avanço da publicação protegida de coorte (macro-onda 10.2-B).
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ESTE MÓDULO EXISTE
// ═══════════════════════════════════════════════════════════════════════════
// Depois de 20260909222000, o único mecanismo que faz um snapshot de coorte
// AVANÇAR é a própria RPC `aggregate_cohort_responses`: ela publica quando há
// >= k_min contribuintes novos desde o snapshot anterior, com marca d'água por
// conjunto e gate por item. Nada mais no schema escreve em `cohort_capsules`.
//
// A RPC é `SECURITY DEFINER` e resolve o escopo de tenant por PERTENCIMENTO:
//
//   JOIN public.profiles p ON p.org_id = w.org_id WHERE p.id = auth.uid()
//
// `service_role` puro tem `auth.uid()` NULL e recebe `not_authorized`
// explícito — comportamento coberto por
// supabase/tests/06_cohort_temporal_release.sql. Ou seja: NÃO é possível
// publicar com a chave de serviço, por construção, e isso é correto.
//
// Consequência operacional, registrada e não contornada aqui: o avanço da
// publicação exige uma identidade ORGANIZACIONAL real. O painel tem essa
// identidade no modo `supabase_admin` (o access token da própria sessão do
// RH_ADMIN, já validado por `requireOrgAdmin`). O deployment HML autentica
// por Cloudflare Access e NÃO tem usuário Supabase — lá o painel permanece
// somente-leitura sobre o que já estiver publicado. Nenhuma permissão ampla
// foi recuperada para contornar isso.
//
// Este módulo é best-effort de propósito: falha de publicação nunca pode
// derrubar a leitura do painel. Quando falha, o painel simplesmente mostra o
// estado protegido (aguardando lote) — fail-closed, nunca um valor ao vivo.

export interface CohortPublicationAdvanceResult {
  attempted: number;
  advanced: number;
  failed: number;
}

export type AdvanceCohortPublication = (
  waveId: string,
  cohortIds: readonly string[],
  accessToken: string,
) => Promise<CohortPublicationAdvanceResult>;

/**
 * Cliente com a IDENTIDADE DO CHAMADOR, não com service role.
 *
 * A chave publicável entra como `apikey` (é o identificador do projeto, pública
 * por design); o `Authorization` carrega o access token do administrador
 * autenticado, que é o que dá `auth.uid()` dentro da RPC. Nenhum segredo de
 * servidor é usado aqui — de propósito: se este caminho usasse service role,
 * ele estaria pedindo à RPC exatamente o bypass que ela recusa.
 */
async function createCallerScopedClient(accessToken: string) {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, publishableKey, {
    global: {
      // `Authorization` explícito sobrescreve o padrão do supabase-js (que
      // usaria a própria chave como bearer). É essa sobrescrita que faz
      // `auth.uid()` existir dentro da RPC.
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

/**
 * Invoca a RPC canônica uma vez por coorte, com a identidade do chamador.
 *
 * O RETORNO DA RPC É DESCARTADO de propósito: quem decide o que é observável é
 * o leitor do snapshot publicado (`cohort_capsules`), num único lugar. Aqui a
 * RPC é usada apenas como PUBLICADOR — o mecanismo canônico —, evitando duas
 * interpretações concorrentes do mesmo estado.
 *
 * A própria RPC recusa publicar quando o recorte está abaixo do limiar, quando
 * a partição está em estado diferencial, ou quando não há k_min contribuintes
 * novos. Chamá-la para todas as coortes é seguro: ela é a autoridade.
 */
export const advanceCohortPublication: AdvanceCohortPublication = async (
  waveId,
  cohortIds,
  accessToken,
) => {
  const result: CohortPublicationAdvanceResult = {
    attempted: cohortIds.length,
    advanced: 0,
    failed: 0,
  };
  if (cohortIds.length === 0) return result;

  const client = await createCallerScopedClient(accessToken);
  if (!client) {
    return { attempted: cohortIds.length, advanced: 0, failed: cohortIds.length };
  }

  for (const cohortId of cohortIds) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (client as any).rpc("aggregate_cohort_responses", {
        p_wave_id: waveId,
        p_cohort_id: cohortId,
      });
      if (error) result.failed += 1;
      else result.advanced += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
};
