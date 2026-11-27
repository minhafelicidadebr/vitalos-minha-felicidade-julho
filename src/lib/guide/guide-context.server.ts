// Guia da Jornada · contexto de "Meu percurso" montado NO SERVIDOR.
//
// Reutiliza os contratos existentes: sessão e papel (authorizeIvoSession), módulos da
// organização (readModules), ações da liderança (loadFibtActionLoop, escopo da própria
// ação) e devolutiva coletiva (loadMemberPlanFeedback, qualquer membro). Nenhuma regra de
// autorização nova: uma capacidade só é concedida quando o fluxo existente a autorizou.
import type { GuideContent, GuideLens, GuidePerspective } from "@/domain/guide/guide-types";
import { perspectiveForRole } from "@/domain/guide/guide-role";
import type { GuideServerContext, GuideTask } from "./guide-entry";

export { perspectiveForRole };

export interface GuideContextDeps {
  authorize?: (token: string | undefined) => Promise<{ ok: true; userId: string; orgId: string; role: string } | { ok: false; category: string; error: string }>;
  readModules?: (orgId: string) => Promise<{ module: string; enabled: boolean }[] | null>;
  loadLoop?: (token: string) => Promise<
    | { ok: true; plans: { status: string; actions: { id: string; title: string; status: string; dueOn: string | null; owner: { isCurrentUser: boolean } | null }[] }[]; viewerScope?: string }
    | { ok: false; category?: string }
  >;
  loadFeedback?: (token: string) => Promise<{ ok: boolean; category?: string }>;
  environment?: () => string;
  content?: () => Promise<GuideContent>;
}

export type GuideJourneyOutcome =
  | { ok: true; context: GuideServerContext; content: GuideContent }
  | { ok: false; category: string; error: string };

const ROLE_LABEL: Record<GuidePerspective, string> = {
  lideranca: "Liderança",
  rh: "RH",
  sst: "SST",
  direcao: "Direção",
  plataforma: "Plataforma",
  colaborador: "Colaborador",
};


export async function loadGuideJourney(input: { accessToken?: string }, deps: GuideContextDeps = {}): Promise<GuideJourneyOutcome> {
  const authorize =
    deps.authorize ??
    (async (t) => (await import("@/lib/ivo/ivo-q2-reading.server")).authorizeIvoSession(t, {}, { allowMember: true }));
  const auth = await authorize(input.accessToken);
  if (!auth.ok) return { ok: false, category: auth.category, error: auth.error };
  const token = input.accessToken!;
  const perspective = perspectiveForRole(auth.role);

  const modules = await (deps.readModules ?? (async (org) => (await import("@/lib/identity/module-access.server")).readModules(org)))(auth.orgId).catch(() => null);
  const enabled = (m: string) => Boolean(modules?.find((r) => r.module === m)?.enabled);
  const q1 = enabled("Q1");
  const q2 = enabled("Q2");

  const availableLenses: GuideLens[] = [...(q1 ? (["Q1"] as const) : []), ...(q2 ? (["Q2"] as const) : [])];
  const granted: string[] = [];
  const tasks: GuideTask[] = [];
  let q2ActivePlan = false;
  let q2ReadFailed = false;

  if (q2 && (perspective === "lideranca" || perspective === "rh")) {
    const loop = await (deps.loadLoop ?? (async (t) => (await import("@/lib/ivo/fibt-action-loop.server")).loadFibtActionLoop({ accessToken: t })))(token).catch(() => ({ ok: false as const, category: "backend" }));
    if (!loop.ok && loop.category === "backend") q2ReadFailed = true;
    if (loop.ok) {
      q2ActivePlan = loop.plans.some((p) => p.status === "active");
      if (perspective === "lideranca" && loop.viewerScope === "own_actions") {
        granted.push("q2.execucao_lideranca");
        for (const plan of loop.plans.filter((p) => p.status === "active"))
          for (const a of plan.actions)
            if (a.owner?.isCurrentUser)
              tasks.push({ lens: "Q2", id: a.id, title: a.title, status: a.status, dueOn: a.dueOn, capability: "q2.execucao_lideranca", recipient: "RH" });
      }
      if (perspective === "rh" && loop.viewerScope !== "own_actions") granted.push("q2.leitura_plano");
    }
  }
  if (q2) {
    const feedback = await (deps.loadFeedback ?? (async (t) => (await import("@/lib/ivo/member-plan-feedback.server")).loadMemberPlanFeedback({ accessToken: t })))(token).catch(() => ({ ok: false, category: "backend" }));
    if (feedback.ok) granted.push("q2.devolutiva_coletiva");
    if (!feedback.ok && feedback.category === "backend") q2ReadFailed = true;
  }
  if (q1 && perspective === "rh") granted.push("q1.preparacao");

  const activeStage: GuideLens | null = q2 && (q2ActivePlan || granted.includes("q2.devolutiva_coletiva")) ? "Q2" : q1 && perspective === "rh" ? "Q1" : q2 ? "Q2" : null;

  const context: GuideServerContext = {
    perspective,
    roleLabel: ROLE_LABEL[perspective],
    availableLenses,
    activeStage,
    tasks,
    grantedCapabilities: granted,
    environment: (deps.environment ?? (() => process.env.VITALOS_RUNTIME_ENV ?? "unknown"))(),
    ...(modules === null ? { unavailable: "modules" } : q2ReadFailed ? { unavailable: "q2" } : {}),
  };
  const content = await (deps.content ?? (async () => (await import("@/domain/guide/enterprise-guide")).ENTERPRISE_GUIDE))();
  return { ok: true, context, content };
}
