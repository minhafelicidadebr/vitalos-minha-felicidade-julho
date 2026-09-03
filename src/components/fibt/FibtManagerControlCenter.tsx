import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  Clipboard,
  Clock3,
  EyeOff,
  Link2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Unlink,
  Users,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  issueFibtManagerSectorLink,
  revokeFibtManagerSectorLink,
} from "@/lib/api/fibt-manager-control-center.functions";
import type {
  FibtManagerSectorSummary,
  FibtManagerSnapshot,
} from "@/lib/fibt/fibt-manager-control-center.server";
import type { ManagerAnalytics } from "@/lib/fibt/fibt-manager-control-center";

interface Props {
  snapshot: FibtManagerSnapshot;
  accessToken?: string;
  onReload: () => void | Promise<void>;
  reloading?: boolean;
}

const STATUS_COPY: Record<string, string> = {
  collecting: "Em coleta",
  sealed: "Encerrada",
  closed: "Encerrada",
};

const EVENT_COPY: Record<string, string> = {
  response_submit_attempted: "Submissao iniciada",
  response_submit_accepted: "Submissao aceita",
  response_submit_rejected: "Submissao recusada",
  sector_response_accepted: "Resposta setorial aceita",
  sector_response_rejected: "Resposta setorial recusada",
  sector_link_created: "Link emitido",
  sector_link_revoked: "Link revogado",
  wave_cohort_created: "Setor cadastrado",
  authorization_denied: "Autorização negada",
};

function formatDate(value: string | null): string {
  if (!value) return "Sem data definida";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Data indisponível" : parsed.toLocaleDateString("pt-BR");
}

function StateBadge({ state }: { state: ManagerAnalytics["state"] }) {
  const styles = {
    available: "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    suppressed: "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    no_data: "border-border bg-muted/50 text-muted-foreground",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
  } as const;
  const labels = {
    available: "Publicável",
    suppressed: "Protegido",
    no_data: "Sem dados",
    error: "Erro",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[state]}`}
    >
      {labels[state]}
    </span>
  );
}

export function AnalyticsState({ analytics }: { analytics: ManagerAnalytics }) {
  if (analytics.state === "available") {
    return (
      <div data-testid="analytics-available">
        <div className="grid gap-3 sm:grid-cols-3">
          {analytics.result.factors.map((factor) => (
            <div key={factor.id} className="border-l-2 border-primary/50 pl-3">
              <p className="text-xs text-muted-foreground">{factor.name}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {factor.mean.toFixed(1)}{" "}
                <span className="text-xs font-normal text-muted-foreground">/ 4</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${factor.mean * 25}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Escore bruto:{" "}
          <strong className="font-semibold text-foreground">
            {analytics.result.escoreBruto} / 12
          </strong>
          . Leitura descritiva, sem faixas interpretativas.
        </p>
      </div>
    );
  }

  if (analytics.state === "suppressed") {
    return (
      <div className="flex items-start gap-3" data-testid="analytics-suppressed">
        <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div>
          <p className="text-sm font-medium text-foreground">Dado ainda não publicável</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {analytics.message}
          </p>
        </div>
      </div>
    );
  }

  if (analytics.state === "no_data") {
    return (
      <div className="flex items-start gap-3" data-testid="analytics-no-data">
        <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">Sem dados agregados</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{analytics.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3" role="alert" data-testid="analytics-error">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <p className="text-sm font-medium text-destructive">Leitura indisponível</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{analytics.message}</p>
      </div>
    </div>
  );
}

function SectorCard({
  sector,
  collecting,
  busy,
  confirmRevoke,
  onIssue,
  onRevoke,
}: {
  sector: FibtManagerSectorSummary;
  collecting: boolean;
  busy: string | null;
  confirmRevoke: string | null;
  onIssue: (sector: FibtManagerSectorSummary, days: number) => void;
  onRevoke: (sector: FibtManagerSectorSummary, linkId: string) => void;
}) {
  const [expiresInDays, setExpiresInDays] = useState(14);
  const activeLink = sector.links.find((link) => link.state === "active");
  const expiredLink = sector.links.find((link) => link.state === "expired");
  const revocableLink = activeLink ?? expiredLink;
  const operationalCopy = {
    collecting: "Coleta operacional",
    no_active_link: "Sem link ativo",
    closed: "Coleta encerrada",
    error: "Invariante de link violada",
  }[sector.operationalState];

  return (
    <article
      className="rounded-lg border border-border bg-card p-4"
      data-testid={`sector-${sector.key}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-card-foreground">{sector.label}</h3>
            <StateBadge state={sector.analytics.state} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {operationalCopy} <span aria-hidden="true">|</span> Participação{" "}
            {sector.participationLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeLink ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Link2 className="h-3.5 w-3.5" /> Link ativo
            </span>
          ) : expiredLink ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Clock3 className="h-3.5 w-3.5" /> Link expirado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Unlink className="h-3.5 w-3.5" /> Sem link
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-border/70 pt-4">
        <AnalyticsState analytics={sector.analytics} />
      </div>

      {collecting && sector.operationalState !== "error" && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
          {!revocableLink && (
            <>
              <label className="text-xs text-muted-foreground" htmlFor={`validade-${sector.id}`}>
                Validade
              </label>
              <select
                id={`validade-${sector.id}`}
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(Number(event.target.value))}
                className="min-h-11 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                <option value={7}>7 dias</option>
                <option value={14}>14 dias</option>
                <option value={30}>30 dias</option>
              </select>
              <button
                type="button"
                onClick={() => onIssue(sector, expiresInDays)}
                disabled={busy !== null}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <Link2 className="h-4 w-4" /> Emitir link
              </button>
            </>
          )}
          {revocableLink && (
            <button
              type="button"
              onClick={() => onRevoke(sector, revocableLink.id)}
              disabled={busy !== null}
              className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                confirmRevoke === revocableLink.id
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Unlink className="h-4 w-4" />
              {confirmRevoke === revocableLink.id
                ? "Confirmar revogação"
                : expiredLink
                  ? "Revogar para renovar"
                  : "Revogar link"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function FibtManagerControlCenter({
  snapshot,
  accessToken,
  onReload,
  reloading = false,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [oneTimeLink, setOneTimeLink] = useState<{ sector: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const collecting = snapshot.campaign.status === "collecting";

  const comparisonRows = useMemo(() => {
    const factorIds = snapshot.factorComparison[0]?.factors.map((factor) => factor.id) ?? [];
    return factorIds.map((factorId) => {
      const name = snapshot.factorComparison[0]!.factors.find(
        (factor) => factor.id === factorId,
      )!.name;
      return Object.fromEntries([
        ["factor", name],
        ...snapshot.factorComparison.map((cohort) => [
          cohort.cohortLabel,
          cohort.factors.find((factor) => factor.id === factorId)?.mean ?? null,
        ]),
      ]);
    });
  }, [snapshot.factorComparison]);

  async function issue(sector: FibtManagerSectorSummary, expiresInDays: number) {
    setBusy(`issue:${sector.id}`);
    setError(null);
    setOneTimeLink(null);
    try {
      const result = await issueFibtManagerSectorLink({
        data: {
          accessToken,
          waveId: snapshot.campaign.waveId,
          cohortKey: sector.key,
          expiresInDays,
        },
      });
      if (!result.created) {
        setError(result.error);
        return;
      }
      setOneTimeLink({
        sector: sector.label,
        url: `${window.location.origin}/respond/s/${result.token}`,
      });
      await onReload();
    } catch {
      setError("Não foi possível emitir o link. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(sector: FibtManagerSectorSummary, linkId: string) {
    if (confirmRevoke !== linkId) {
      setConfirmRevoke(linkId);
      return;
    }
    setBusy(`revoke:${sector.id}`);
    setError(null);
    try {
      const result = await revokeFibtManagerSectorLink({
        data: { accessToken, waveId: snapshot.campaign.waveId, linkId },
      });
      if (!result.revoked) {
        setError(result.error);
        return;
      }
      setConfirmRevoke(null);
      setOneTimeLink(null);
      await onReload();
    } catch {
      setError("Não foi possível revogar o link. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (!oneTimeLink) return;
    await navigator.clipboard.writeText(oneTimeLink.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      data-testid="manager-control-center"
    >
      {snapshot.campaign.environment === "application" && (
        <a
          href="/admin"
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" /> Campanhas
        </a>
      )}
      <header className="border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{snapshot.campaign.organizationName}</span>
              <span aria-hidden="true">/</span>
              <span>FIB-T {snapshot.campaign.instrumentVersion}</span>
              {snapshot.campaign.environment === "hml_staging" && (
                <span className="rounded-full border border-sky-600/30 bg-sky-500/10 px-2 py-0.5 font-medium text-sky-700 dark:text-sky-300">
                  HML atestado - dados sintéticos
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
              {snapshot.campaign.label}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />{" "}
                {STATUS_COPY[snapshot.campaign.status] ?? snapshot.campaign.status}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Inicio{" "}
                {formatDate(snapshot.campaign.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" /> Encerramento{" "}
                {formatDate(snapshot.campaign.closesAt)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onReload()}
            disabled={reloading}
            title="Atualizar centro de controle"
            aria-label="Atualizar centro de controle"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <section
        className="grid border-b border-border sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Resumo da campanha"
      >
        <div className="border-b border-border py-4 sm:border-r lg:border-b-0">
          <p className="text-xs text-muted-foreground">Participação protegida</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {snapshot.participation.countLabel}
          </p>
        </div>
        <div className="border-b border-border py-4 sm:pl-4 lg:border-b-0 lg:border-r">
          <p className="text-xs text-muted-foreground">Setores</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {snapshot.participation.totalCohorts}
          </p>
        </div>
        <div className="border-b border-border py-4 sm:border-b-0 sm:border-r lg:pl-4">
          <p className="text-xs text-muted-foreground">Resultados publicaveis</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {snapshot.participation.publishableCohorts}
          </p>
        </div>
        <div className="py-4 sm:pl-4">
          <p className="text-xs text-muted-foreground">Prontidão operacional</p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            {snapshot.readiness.state === "ready" ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            {snapshot.readiness.state === "ready"
              ? "Pronta"
              : snapshot.readiness.state === "blocked"
                ? "Bloqueada"
                : "Atencao"}
          </p>
        </div>
      </section>

      <section className="grid gap-6 border-b border-border py-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Leitura agregada da onda</h2>
            <StateBadge state={snapshot.waveAnalytics.state} />
          </div>
          <AnalyticsState analytics={snapshot.waveAnalytics} />
        </div>
        <aside
          className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
          aria-label="Próxima ação"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Próxima ação segura</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {snapshot.readiness.nextAction}
          </p>
          {snapshot.readiness.blockers.length > 0 && (
            <ul className="mt-3 space-y-2" aria-label="Bloqueios operacionais">
              {snapshot.readiness.blockers.map((blocker) => (
                <li key={blocker} className="flex items-start gap-2 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {blocker}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      {snapshot.factorComparison.length > 1 && (
        <section className="border-b border-border py-6" aria-labelledby="comparison-title">
          <h2 id="comparison-title" className="text-sm font-semibold text-foreground">
            Comparação entre setores publicáveis
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Medias dos fatores na escala documentada de 0 a 4.
          </p>
          <div className="mt-4 h-72 w-full" data-testid="factor-comparison-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonRows} margin={{ top: 8, right: 8, left: -18, bottom: 42 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="factor"
                  angle={-18}
                  textAnchor="end"
                  interval={0}
                  height={64}
                  fontSize={11}
                />
                <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} fontSize={11} />
                <Tooltip />
                <Legend />
                {snapshot.factorComparison.map((cohort, index) => (
                  <Bar
                    key={cohort.cohortId}
                    dataKey={cohort.cohortLabel}
                    fill={index % 2 === 0 ? "var(--primary)" : "var(--chart-2)"}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="py-6" aria-labelledby="sectors-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="sectors-title" className="text-sm font-semibold text-foreground">
              Setores, participação e links
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Operação e elegibilidade analítica no mesmo recorte.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5" /> Publicação mínima n={snapshot.privacy.kMin}
          </span>
        </div>

        {error && (
          <div
            className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3"
            role="alert"
          >
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {oneTimeLink && (
          <div
            className="mt-4 rounded-md border border-emerald-600/30 bg-emerald-500/5 p-4"
            role="status"
          >
            <div className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  Link de {oneTimeLink.sector} emitido
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Disponível somente nesta confirmação.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    readOnly
                    aria-label={`Link emitido para ${oneTimeLink.sector}`}
                    value={oneTimeLink.url}
                    className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 font-mono text-xs text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    title="Copiar link"
                    aria-label="Copiar link emitido"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {snapshot.sectors.map((sector) => (
            <SectorCard
              key={sector.id}
              sector={sector}
              collecting={collecting}
              busy={busy}
              confirmRevoke={confirmRevoke}
              onIssue={(item, days) => void issue(item, days)}
              onRevoke={(item, linkId) => void revoke(item, linkId)}
            />
          ))}
        </div>
      </section>

      <section className="border-t border-border py-6" aria-labelledby="telemetry-title">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 id="telemetry-title" className="text-sm font-semibold text-foreground">
            Diagnostico operacional
          </h2>
        </div>
        {snapshot.telemetry.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Nenhum evento operacional registrado para esta campanha.
          </p>
        ) : (
          <ol className="mt-3 divide-y divide-border/70">
            {snapshot.telemetry.map((event, index) => (
              <li
                key={`${event.occurredAt}-${index}`}
                className="grid gap-1 py-2 text-xs sm:grid-cols-[170px_minmax(0,1fr)]"
              >
                <time className="tabular-nums text-muted-foreground">
                  {new Date(event.occurredAt).toLocaleString("pt-BR")}
                </time>
                <span className="text-foreground">
                  {EVENT_COPY[event.event] ?? event.event}
                  {event.reason ? (
                    <span className="text-muted-foreground"> - {event.reason}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border py-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Sem respostas individuais
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LockKeyhole className="h-3.5 w-3.5" /> Tokens persistidos somente como hash
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Coortes abaixo de n=5 protegidas
        </span>
      </footer>
    </div>
  );
}
