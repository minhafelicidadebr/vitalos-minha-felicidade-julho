import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/shell/AppShell";
import { usePersona } from "@/app/identity/persona-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Q3_DEMO_ACTIONS,
  Q3_DEMO_COPY as C,
  Q3_DEMO_CRITERIA,
  Q3_DEMO_DEVOLUTIVA_STEPS,
  Q3_DEMO_HYPOTHESES,
  Q3_DEMO_ITEMS,
  Q3_DEMO_LEADER_USER_ID,
  Q3_DEMO_ORG,
  Q3_DEMO_TEAMS,
  Q3_DEMO_VITALITY,
  Q3_FACTORS,
  type PermaFactorId,
} from "@/domain/demo/q3-demo-synthetic";
import { buildConvergence, buildOrgSummary, buildTeamRows, ownActions, personaAccess } from "@/lib/ivo/q3-demo-view";
import { getApprovedVitalityUnit, Q3_VITALITY_UNIT_COPY as U } from "@/domain/ivo/q3-vitality-units";

export const Route = createFileRoute("/q3-demo")({
  head: () => ({ meta: [{ title: "Q3 PERMA+V · demonstração — 4 Lentes VitalOS™" }] }),
  component: Q3DemoPage,
});

const factorLabel = (id: PermaFactorId) => Q3_FACTORS.find((f) => f.id === id)!.label;

function FactorBars({ factors }: { factors: Record<PermaFactorId, number> }) {
  return (
    <ul className="space-y-2">
      {Q3_FACTORS.map((f) => (
        <li key={f.id}>
          <div className="flex justify-between text-sm">
            <span>{f.label}</span>
            <span className="tabular-nums text-muted-foreground">{factors[f.id].toFixed(1)}</span>
          </div>
          <Progress value={factors[f.id] * 10} aria-label={`${f.label}: ${factors[f.id].toFixed(1)} de 10`} />
        </li>
      ))}
    </ul>
  );
}

function useDemoModel() {
  return useMemo(() => {
    try {
      return {
        ok: true as const,
        rows: buildTeamRows(Q3_DEMO_TEAMS),
        org: buildOrgSummary(Q3_DEMO_TEAMS),
        convergence: buildConvergence(Q3_DEMO_TEAMS, Q3_DEMO_HYPOTHESES, Q3_DEMO_CRITERIA),
      };
    } catch {
      return { ok: false as const };
    }
  }, []);
}

function CollectiveCard({ org }: { org: ReturnType<typeof buildOrgSummary> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{C.collectiveTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {org.factors ? (
          <>
            <FactorBars factors={org.factors} />
            <p className="text-sm">
              <span className="font-medium">{C.labels.priorities}: </span>
              {org.priorities.slice(0, 2).map(factorLabel).join(" · ")}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{C.labels.empty}</p>
        )}
        <p className="text-xs text-muted-foreground">{C.experimental}</p>
      </CardContent>
    </Card>
  );
}

function VitalityCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{C.vitalityTitle}</CardTitle>
        <p className="text-xs text-muted-foreground">{C.vitalityDraft}</p>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {Q3_DEMO_VITALITY.map((v) => (
            <li key={v.id} className="rounded-md border p-3">
              <p className="font-medium">{v.title}</p>
              <p className="text-sm text-muted-foreground">{v.practice}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function VitalityCheck({ check }: { check: NonNullable<ReturnType<typeof getApprovedVitalityUnit>>["checks"][number] }) {
  const [picked, setPicked] = useState<string | null>(null);
  const ok = picked === check.correctOptionId;
  return (
    <fieldset className="space-y-2 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">{check.question}</legend>
      <div className="grid gap-2">
        {check.options.map((o) => (
          <Button
            key={o.id}
            type="button"
            variant={picked === o.id ? "default" : "outline"}
            className="h-auto min-h-11 justify-start whitespace-normal text-left"
            aria-pressed={picked === o.id}
            onClick={() => setPicked(o.id)}
          >
            {o.label}
          </Button>
        ))}
      </div>
      <p role="status" aria-live="polite" className="text-sm">
        {picked && (ok ? `${U.correct} ${check.explanation}` : U.incorrect)}
      </p>
    </fieldset>
  );
}

function VitalityUnitCard({ manager }: { manager: boolean }) {
  const unit = getApprovedVitalityUnit();
  const [recalled, setRecalled] = useState(false);
  if (!unit) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">{U.title}</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{U.empty}</p></CardContent>
      </Card>
    );
  }
  const approval = unit.curation.approval!;
  const date = approval.approvedOn.split("-").reverse().join("/");
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">{U.title}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="whitespace-normal">{U.approved(date, unit.contentVersion)}</Badge>
          <Badge variant="outline">{U.weeks(unit.activity.durationWeeks)}</Badge>
        </div>
        <p className="text-sm">{manager ? unit.audienceSummary.manager : unit.audienceSummary.member}</p>
        <p className="text-xs text-muted-foreground">{U.noClaim}</p>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <p className="font-medium">{unit.learningObjective}</p>
        {unit.content.map((p) => <p key={p}>{p}</p>)}
        <section aria-labelledby="v-steps">
          <h3 id="v-steps" className="mb-1 font-semibold">{U.stepsTitle}</h3>
          <ol className="list-decimal space-y-1 pl-5">{unit.activity.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </section>
        <section aria-labelledby="v-records">
          <h3 id="v-records" className="mb-1 font-semibold">{U.recordsTitle}</h3>
          <dl className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(U.records) as (keyof typeof U.records)[]).map((k) => (
              <div key={k} className="rounded-md border p-3">
                <dt className="font-medium">{U.records[k]}</dt>
                <dd className="text-muted-foreground">{unit.activity.records[k]}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="v-decision">
          <h3 id="v-decision" className="mb-1 font-semibold">{U.decisionTitle}</h3>
          <dl className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(U.decision) as (keyof typeof U.decision)[]).map((k) => (
              <div key={k} className="rounded-md border p-3">
                <dt className="font-medium">{U.decision[k]}</dt>
                <dd className="text-muted-foreground">{unit.activity.decisionGuide[k]}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="v-limits">
          <h3 id="v-limits" className="mb-1 font-semibold">{U.limitsTitle}</h3>
          <ul className="list-disc space-y-1 pl-5">{unit.activity.limits.map((l) => <li key={l}>{l}</li>)}</ul>
        </section>
        <section aria-labelledby="v-check" className="space-y-3">
          <h3 id="v-check" className="font-semibold">{U.checkTitle}</h3>
          <p>{unit.recallPrompt}</p>
          {!recalled ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setRecalled(true)}>{U.showOptions}</Button>
          ) : (
            unit.checks.map((c) => <VitalityCheck key={c.id} check={c} />)
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function Questionnaire() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [sent, setSent] = useState(false);
  const count = Object.keys(answers).length;
  if (sent)
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p role="status">{C.submitted}</p>
          <Button variant="outline" onClick={() => { setAnswers({}); setSent(false); }}>{C.labels.reset}</Button>
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{C.labels.questionnaire}</CardTitle>
        <p className="text-xs text-muted-foreground">{C.scaleHint}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {Q3_FACTORS.map((f) => (
          <fieldset key={f.id} className="space-y-4">
            <legend className="text-sm font-semibold">{f.label}</legend>
            {Q3_DEMO_ITEMS.filter((i) => i.factorId === f.id).map((item) => (
              <div key={item.id} className="space-y-2">
                <label id={`q-${item.id}`} className="text-sm">{item.text}</label>
                <div className="flex items-center gap-3">
                  <Slider
                    aria-labelledby={`q-${item.id}`}
                    min={0}
                    max={10}
                    step={1}
                    value={[answers[item.id] ?? 5]}
                    onValueChange={([v]) => setAnswers((a) => ({ ...a, [item.id]: v! }))}
                  />
                  <span className="w-6 text-right tabular-nums text-sm">{answers[item.id] ?? "–"}</span>
                </div>
              </div>
            ))}
          </fieldset>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={count < Q3_DEMO_ITEMS.length} onClick={() => setSent(true)}>{C.labels.submit}</Button>
          <span className="text-sm text-muted-foreground">{count}/{Q3_DEMO_ITEMS.length} {C.labels.answered}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RhDashboard({ model }: { model: Extract<ReturnType<typeof useDemoModel>, { ok: true }> }) {
  const { org, rows, convergence } = model;
  const verdictLabel = { supports: C.labels.supports, does_not_support: C.labels.doesNotSupport, insufficient: C.labels.insufficient } as const;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{C.labels.adherence}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={org.adherence * 100} aria-label={`${C.labels.adherence}: ${Math.round(org.adherence * 100)}%`} />
          <p className="text-sm text-muted-foreground">
            {org.responded} {C.labels.responded} · {org.invited} {C.labels.invited} · {Math.round(org.adherence * 100)}%
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{C.labels.org}</CardTitle>
          </CardHeader>
          <CardContent>{org.factors ? <FactorBars factors={org.factors} /> : <p className="text-sm text-muted-foreground">{C.labels.empty}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{C.labels.devolutiva}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {Q3_DEMO_DEVOLUTIVA_STEPS.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{C.labels.teams}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-md border p-3">
              <p className="font-medium">{r.label}</p>
              <p className="mb-2 text-xs text-muted-foreground">{r.responded}/{r.invited} {C.labels.responded}</p>
              {r.visible ? <FactorBars factors={r.factors} /> : <p className="text-sm text-muted-foreground">{C.suppressed}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{C.actionsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {Q3_DEMO_ACTIONS.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <span>{a.title}</span>
                <span className="flex gap-2">
                  <Badge variant="secondary">{factorLabel(a.factorId)}</Badge>
                  <Badge variant="outline">{a.ownerLabel}</Badge>
                  <Badge variant="outline">{a.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{C.convergenceTitle}</CardTitle>
          <p className="text-xs text-muted-foreground">{C.convergenceNote}</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {convergence.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <span>
                  <span className="font-medium">{h.id}</span> · {h.label}{" "}
                  <span className="text-muted-foreground">({h.kind === "convergent" ? C.labels.convergent : C.labels.discriminant})</span>
                </span>
                <span className="flex items-center gap-2">
                  {"r" in h.result && <span className="tabular-nums text-muted-foreground">r = {h.result.r.toFixed(2)}</span>}
                  <span className="text-muted-foreground">{h.result.teams} {C.labels.teamsUsed}</span>
                  <Badge variant={h.result.verdict === "supports" ? "default" : "outline"}>{verdictLabel[h.result.verdict]}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Q3DemoPage() {
  const roleId = usePersona((s) => s.roleId);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const model = useDemoModel();
  const actor = { userId: roleId === "LIDER_EQUIPE" ? Q3_DEMO_LEADER_USER_ID : "demo-user", orgId: Q3_DEMO_ORG.id, role: roleId };
  const access = personaAccess(actor);
  const mine = ownActions(actor, Q3_DEMO_ACTIONS);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <header className="space-y-2">
          <Badge>{C.badge}</Badge>
          <h1 className="text-2xl font-semibold sm:text-3xl">{C.title}</h1>
          <p className="text-sm text-muted-foreground">{Q3_DEMO_ORG.label} · {Q3_DEMO_ORG.cycle}</p>
          <Alert>
            <AlertDescription>{C.disclaimer}</AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground">{C.personaHint}</p>
        </header>

        {!mounted ? (
          <div className="space-y-3" aria-busy="true" aria-label={C.labels.loading}>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !model.ok ? (
          <Alert variant="destructive"><AlertDescription>{C.labels.error}</AlertDescription></Alert>
        ) : !access.rhDashboard && !access.collective ? (
          <Alert><AlertDescription>{C.denied}</AlertDescription></Alert>
        ) : (
          <div className="space-y-6">
            {access.rhDashboard && <RhDashboard model={model} />}
            {access.respond && <Questionnaire />}
            {access.ownActions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{C.ownActionsTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  {mine.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{C.labels.noActions}</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {mine.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                          <span>{a.title}</span>
                          <span className="flex gap-2">
                            <Badge variant="secondary">{factorLabel(a.factorId)}</Badge>
                            <Badge variant="outline">{a.status}</Badge>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
            {!access.rhDashboard && access.collective && <CollectiveCard org={model.org} />}
            {access.collective && <VitalityUnitCard manager={access.rhDashboard || access.ownActions} />}
            {access.collective && <VitalityCard />}
          </div>
        )}
      </div>
    </AppShell>
  );
}
