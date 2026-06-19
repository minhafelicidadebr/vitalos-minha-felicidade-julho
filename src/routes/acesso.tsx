import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  Building2,
  CheckCircle2,
  CloudCog,
  Crosshair,
  Database,
  FileCheck2,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Server,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePersona } from "@/app/identity/persona-store";
import {
  authorizeResources,
  type IdentityBoundaryStatus,
} from "@/engine/identity/authorization-engine";
import { usePack } from "@/engine/pack";
import { getIdentityBoundaryStatus } from "@/lib/api/identity.functions";
import { getIsolationAuditProof } from "@/lib/api/isolation.functions";
import { getCloudReadinessProof } from "@/lib/api/cloud-readiness.functions";
import { getSignedSessionContractProof } from "@/lib/api/session-contract.functions";
import { getGrantIssuanceContractProof } from "@/lib/api/grant-contract.functions";
import { getRlsParityProof } from "@/lib/api/rls-parity.functions";
import { getIdentityTrustChainProof } from "@/lib/api/trust-chain.functions";
import type { CloudReadinessProof } from "@/lib/cloud/cloud-readiness-proof.server";
import type { GrantIssuanceContractProof } from "@/lib/identity/grant-issuance-proof.server";
import type { IsolationAuditProof } from "@/lib/identity/isolation-audit-proof.server";
import type { SignedSessionContractProof } from "@/lib/identity/session-contract-proof.server";
import type { RlsParityProof } from "@/lib/security/rls-parity-proof.server";
import type { IdentityTrustChainProof } from "@/lib/security/trust-chain-attestation.server";
import { AUTHORIZATION_REASON_COPY, buildDemoAccessStory } from "@/mocks/access-control-mock";

export const Route = createFileRoute("/acesso")({
  head: () => ({
    meta: [{ title: "Identidade e escopos — Fronteira de acesso · VitalOS™" }],
  }),
  component: AccessBoundaryPage,
});

type BoundaryLoadState =
  | { state: "loading" }
  | { state: "ready"; value: IdentityBoundaryStatus }
  | { state: "error" };

type IsolationLoadState =
  | { state: "loading" }
  | { state: "ready"; value: IsolationAuditProof }
  | { state: "error" };

type CloudReadinessLoadState =
  | { state: "loading" }
  | { state: "ready"; value: CloudReadinessProof }
  | { state: "empty" }
  | { state: "error" };

type SessionContractLoadState =
  | { state: "loading" }
  | { state: "ready"; value: SignedSessionContractProof }
  | { state: "error" };

type GrantContractLoadState =
  | { state: "loading" }
  | { state: "ready"; value: GrantIssuanceContractProof }
  | { state: "error" };

type RlsParityLoadState =
  | { state: "loading" }
  | { state: "ready"; value: RlsParityProof }
  | { state: "error" };

type TrustChainLoadState =
  | { state: "loading" }
  | { state: "ready"; value: IdentityTrustChainProof }
  | { state: "error" };

function AccessBoundaryPage() {
  const { pack, packId, sectorLabel, status, reload } = usePack();
  const roleId = usePersona((state) => state.roleId);
  const [boundary, setBoundary] = useState<BoundaryLoadState>({ state: "loading" });
  const [isolation, setIsolation] = useState<IsolationLoadState>({ state: "loading" });
  const [cloudReadiness, setCloudReadiness] = useState<CloudReadinessLoadState>({
    state: "loading",
  });
  const [sessionContract, setSessionContract] = useState<SessionContractLoadState>({
    state: "loading",
  });
  const [grantContract, setGrantContract] = useState<GrantContractLoadState>({
    state: "loading",
  });
  const [rlsParity, setRlsParity] = useState<RlsParityLoadState>({ state: "loading" });
  const [trustChain, setTrustChain] = useState<TrustChainLoadState>({ state: "loading" });

  function loadBoundary() {
    setBoundary({ state: "loading" });
    setIsolation({ state: "loading" });
    setCloudReadiness({ state: "loading" });
    setSessionContract({ state: "loading" });
    setGrantContract({ state: "loading" });
    setRlsParity({ state: "loading" });
    setTrustChain({ state: "loading" });
    void Promise.all([
      getIdentityBoundaryStatus(),
      getIsolationAuditProof(),
      getCloudReadinessProof({ data: { packId } }),
      getSignedSessionContractProof(),
      getGrantIssuanceContractProof(),
      getRlsParityProof(),
      getIdentityTrustChainProof(),
    ])
      .then(
        ([
          boundaryValue,
          isolationValue,
          cloudValue,
          sessionValue,
          grantValue,
          rlsValue,
          trustChainValue,
        ]) => {
          setBoundary({ state: "ready", value: boundaryValue });
          setIsolation({ state: "ready", value: isolationValue });
          setCloudReadiness(
            cloudValue ? { state: "ready", value: cloudValue } : { state: "empty" },
          );
          setSessionContract({ state: "ready", value: sessionValue });
          setGrantContract({ state: "ready", value: grantValue });
          setRlsParity({ state: "ready", value: rlsValue });
          setTrustChain({ state: "ready", value: trustChainValue });
        },
      )
      .catch(() => {
        setBoundary({ state: "error" });
        setIsolation({ state: "error" });
        setCloudReadiness({ state: "error" });
        setSessionContract({ state: "error" });
        setGrantContract({ state: "error" });
        setRlsParity({ state: "error" });
        setTrustChain({ state: "error" });
      });
  }

  useEffect(loadBoundary, [packId]);

  const story = useMemo(
    () => (pack ? buildDemoAccessStory(pack, packId, roleId) : null),
    [pack, packId, roleId],
  );
  const decisions = useMemo(
    () => (story ? authorizeResources(story.identity, story.resources) : []),
    [story],
  );

  if (status.state === "idle" || status.state === "loading") {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6" aria-busy="true">
          <div className="h-48 animate-pulse rounded-[2rem] bg-muted/60" />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="h-52 animate-pulse rounded-3xl bg-muted/50" />
            <div className="h-52 animate-pulse rounded-3xl bg-muted/50" />
            <div className="h-52 animate-pulse rounded-3xl bg-muted/50" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (status.state === "error" || !pack || !story) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <section className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center">
            <Ban className="mx-auto h-7 w-7 text-destructive" aria-hidden />
            <h1 className="mt-4 font-serif text-2xl text-foreground">
              A política de acesso não pôde ser montada.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma permissão foi presumida.</p>
            <button
              type="button"
              onClick={reload}
              className="mt-6 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Recarregar pack
            </button>
          </section>
        </div>
      </AppShell>
    );
  }

  const roleLabel = story.role?.label ?? roleId;
  const allowedCount = decisions.filter((decision) => decision.allowed).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[2rem] border border-primary/18 bg-gradient-to-br from-primary/14 via-card to-amber-500/5 p-6 shadow-sm sm:p-8"
        >
          <div className="relative grid gap-6 lg:grid-cols-[1fr_0.38fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Confiança · Identidade e RBAC
              </p>
              <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                Acesso não é um menu escondido. É uma decisão verificável.
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
                Esta fronteira mostra o contrato que o servidor deverá aplicar a cada recurso:
                identidade, tenant, permissão, domínio e escopo — sempre com negação por padrão.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/75 p-4 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Matriz desta persona
              </p>
              <p className="mt-2 font-serif text-3xl font-semibold text-foreground">
                {allowedCount}/{decisions.length}
              </p>
              <p className="text-xs text-muted-foreground">recursos deliberadamente autorizados</p>
            </div>
          </div>
        </motion.header>

        <section className="grid gap-4 lg:grid-cols-3">
          <StatusCard
            icon={Server}
            eyebrow="Runtime consultado no servidor"
            title={
              boundary.state === "loading"
                ? "Verificando modo ativo…"
                : boundary.state === "error"
                  ? "Verificação indisponível"
                  : boundary.value.state === "demo"
                    ? "Demo isolado"
                    : boundary.value.state === "blocked"
                      ? "Cloud bloqueado"
                      : "Cloud ativo"
            }
            text={
              boundary.state === "loading"
                ? "Aguardando a fronteira server-side."
                : boundary.state === "error"
                  ? "A interface não presume que existe autenticação."
                  : boundary.value.state === "demo"
                    ? "A troca de persona é local e não constitui autenticação real."
                    : boundary.value.state === "blocked"
                      ? "A flag cloud foi solicitada, mas o adaptador não existe; o sistema falhou fechado."
                      : "Identidade e autorização estão sob enforcement do provedor."
            }
            action={
              boundary.state === "error" ? (
                <button
                  type="button"
                  onClick={loadBoundary}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-foreground underline decoration-border underline-offset-4"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Tentar novamente
                </button>
              ) : undefined
            }
          />
          <StatusCard
            icon={UserRound}
            eyebrow="Papel demonstrativo"
            title={roleLabel}
            text={`Escopo declarado: ${story.role?.scope ?? "self"}. O papel vem do Domain Pack ativo.`}
          />
          <StatusCard
            icon={Building2}
            eyebrow="Tenant ativo"
            title={sectorLabel}
            text={`${story.fixture.tenantId}. Recursos de qualquer outro tenant são negados antes das demais regras.`}
          />
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Simulador de política
              </p>
              <h2 className="mt-1 font-serif text-2xl text-foreground">
                O mesmo papel, recursos diferentes
              </h2>
            </div>
            <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
              fail-closed
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {story.resources.map((resource, index) => {
              const access = decisions[index]!;
              return (
                <article
                  key={resource.id}
                  className={`rounded-2xl border p-4 ${
                    access.allowed
                      ? "border-emerald-300/45 bg-emerald-500/[0.045]"
                      : "border-amber-300/35 bg-amber-500/[0.035]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        access.allowed
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      }`}
                      aria-hidden
                    >
                      {access.allowed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <LockKeyhole className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{resource.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {resource.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-border/50 pt-3">
                    <p
                      className={`text-xs font-medium ${
                        access.allowed
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {access.allowed ? "Permitido" : "Negado"}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {AUTHORIZATION_REASON_COPY[access.reason]}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <IsolationAuditCard load={isolation} onRetry={loadBoundary} />

        <SignedSessionContractCard load={sessionContract} onRetry={loadBoundary} />

        <GrantIssuanceContractCard load={grantContract} onRetry={loadBoundary} />

        <RlsParityCard load={rlsParity} onRetry={loadBoundary} />

        <TrustChainAttestationCard load={trustChain} onRetry={loadBoundary} />

        <CloudReadinessCard load={cloudReadiness} onRetry={loadBoundary} />

        <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Contrato pronto para o adaptador
            </p>
            <h2 className="mt-2 font-serif text-2xl text-foreground">
              Da identidade ao recurso, sem confiar no cliente
            </h2>
            <ol className="mt-5 space-y-3">
              {[
                ["1", "Identidade", "Sessão válida resolve sujeito e tenant ativo."],
                ["2", "Concessões", "Papel vira permissões e vínculos de escopo."],
                [
                  "3",
                  "Recurso",
                  "Cada leitura ou escrita declara tenant, domínio e classe do dado.",
                ],
                ["4", "Decisão", "O servidor permite ou nega antes de devolver qualquer conteúdo."],
              ].map(([step, title, text]) => (
                <li key={step} className="flex gap-3 rounded-2xl border border-border/55 p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="rounded-3xl border border-amber-300/35 bg-amber-500/[0.035] p-5 sm:p-6">
            <CloudCog className="h-6 w-6 text-amber-700 dark:text-amber-300" aria-hidden />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
              Limite honesto desta entrega
            </p>
            <h2 className="mt-2 font-serif text-2xl text-foreground">
              Ainda não é autenticação real.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              O engine, os testes de isolamento e o handshake server-side estão prontos. Faltam o
              adaptador Lovable Cloud, sessão assinada, persistência de memberships e RLS. Até lá,
              nenhuma persona demo deve ser tratada como identidade confiável.
            </p>
            <div className="mt-5 rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <KeyRound className="h-4 w-4 text-primary" aria-hidden />
                Próximo corte vertical
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Ativar Lovable Cloud, resolver uma membership no servidor e proteger uma rota
                canário com teste de negação entre dois tenants.
              </p>
            </div>
            <Link
              to="/confianca"
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
            >
              Ver o Trust Ledger
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </aside>
        </section>

        <section className="rounded-3xl border border-primary/20 bg-primary/[0.055] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-serif text-xl text-foreground">
                Invariante que já não depende da interface
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Leitura de resposta individual é proibida pelo engine antes de papel, domínio ou
                escopo. O cliente poderá enviar uma resposta própria, mas nunca recebê-la de volta
                como conteúdo bruto.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function TrustChainAttestationCard({
  load,
  onRetry,
}: {
  load: TrustChainLoadState;
  onRetry: () => void;
}) {
  if (load.state === "loading") {
    return <section className="h-64 animate-pulse rounded-3xl bg-muted/55" aria-busy="true" />;
  }

  if (load.state === "error") {
    return (
      <section className="rounded-3xl border border-amber-300/35 bg-card p-7 text-center">
        <FileCheck2 className="mx-auto h-6 w-6 text-amber-600" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl text-foreground">
          A cadeia de confiança não pôde ser atestada.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Promoção continua bloqueada por padrão.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Recalcular atestação
        </button>
      </section>
    );
  }

  const proof = load.value;
  return (
    <section className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.1] via-card to-amber-500/[0.045] p-6 shadow-sm sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <FileCheck2 className="h-7 w-7 text-primary" aria-hidden />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Atestação da cadeia de confiança
          </p>
          <h2 className="mt-2 font-serif text-3xl text-foreground">
            Blueprint selado. Runtime ainda fechado.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Sessão, grants, autorização, RLS e isolamento compõem uma única prova reproduzível sem
            incluir claims, memberships ou dados individuais.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[0.65fr_0.65fr_1.7fr]">
          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/[0.045] p-4">
            <p className="font-mono text-3xl font-semibold text-foreground">
              {proof.passedCheckCount}/{proof.checkCount}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
              blueprint
            </p>
          </div>
          <div className="rounded-2xl border border-amber-300/30 bg-amber-500/[0.045] p-4">
            <p className="font-mono text-3xl font-semibold text-foreground">
              {proof.runtime.passed}/{proof.runtime.total}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
              runtime
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-border/60 bg-background/35 p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              SHA-256 · {proof.digestScope}
            </p>
            <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-foreground">
              {proof.digest}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {proof.runtime.blockers.map((item, index) => (
          <article
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-amber-300/25 bg-card/55 p-3"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/10 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              {index + 1}
            </span>
            <p className="text-xs font-medium text-foreground">{item.label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const RLS_CLASS_COPY: Record<string, string> = {
  allowed: "Permitido",
  identity: "Identidade",
  tenant: "Tenant",
  privacy: "Privacidade",
  policy: "Policy",
  expiry: "Expiração",
  domain: "Domínio",
  scope: "Escopo",
  write: "Escrita",
};

function RlsParityCard({ load, onRetry }: { load: RlsParityLoadState; onRetry: () => void }) {
  if (load.state === "loading") {
    return <section className="h-72 animate-pulse rounded-3xl bg-muted/55" aria-busy="true" />;
  }

  if (load.state === "error") {
    return (
      <section className="rounded-3xl border border-amber-300/35 bg-card p-7 text-center">
        <Database className="mx-auto h-6 w-6 text-amber-600" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl text-foreground">
          A paridade com a política de banco não pôde ser verificada.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">RLS continua reprovada por padrão.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Executar novamente
        </button>
      </section>
    );
  }

  const proof = load.value;
  const classes = [...new Set(proof.cases.map((item) => item.expectedClass))];

  return (
    <section className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-sm">
      <div className="grid lg:grid-cols-[0.62fr_1.38fr]">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.12] via-card to-amber-500/[0.05] p-6 lg:border-r lg:border-b-0 sm:p-7">
          <Database className="h-7 w-7 text-primary" aria-hidden />
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Manifesto RLS · paridade semântica
          </p>
          <p className="mt-3 font-mono text-5xl font-semibold text-foreground">
            {proof.passedCaseCount}/{proof.caseCount}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground">
            decisões iguais nas duas camadas
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            O engine da aplicação e a especificação independente do banco concordam nos caminhos
            permitidos e negados.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/55 bg-background/35 p-3">
              <dt className="font-mono text-xl font-semibold text-foreground">
                {proof.manifest.ruleCount}
              </dt>
              <dd className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                regras
              </dd>
            </div>
            <div className="rounded-xl border border-border/55 bg-background/35 p-3">
              <dt className="font-mono text-xl font-semibold text-foreground">
                {proof.manifest.tableCount}
              </dt>
              <dd className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                tabelas
              </dd>
            </div>
          </dl>
          <div className="mt-4 rounded-2xl border border-amber-300/35 bg-amber-500/[0.045] p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">
              Limite de enforcement
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-foreground">
              rlsDeployed: false
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Manifesto executável não é policy Postgres aplicada.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Application oracle × database oracle
              </p>
              <h2 className="mt-2 font-serif text-2xl text-foreground">
                Drift deixa de ser invisível
              </h2>
            </div>
            <span className="rounded-full border border-emerald-300/50 bg-emerald-500/[0.08] px-3 py-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {proof.status}
            </span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {classes.map((decisionClass) => {
              const cases = proof.cases.filter((item) => item.expectedClass === decisionClass);
              return (
                <article
                  key={decisionClass}
                  className="rounded-xl border border-border/60 bg-background/35 p-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                  <p className="mt-2 text-[11px] font-medium text-foreground">
                    {RLS_CLASS_COPY[decisionClass] ?? decisionClass}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {cases.filter((item) => item.passed).length}/{cases.length}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {proof.cases.map((item) => (
              <article
                key={item.id}
                className="flex items-start gap-2 rounded-xl border border-border/55 bg-muted/20 p-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                <div>
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted-foreground">
                    app={item.applicationClass} · banco={item.databaseClass}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const GRANT_CATEGORY_COPY: Record<string, string> = {
  identity: "Identidade",
  membership: "Membership",
  permission: "Permissão",
  scope: "Escopo",
  domain: "Domínio A/B",
  lifetime: "Validade",
};

function GrantIssuanceContractCard({
  load,
  onRetry,
}: {
  load: GrantContractLoadState;
  onRetry: () => void;
}) {
  if (load.state === "loading") {
    return <section className="h-72 animate-pulse rounded-3xl bg-muted/55" aria-busy="true" />;
  }

  if (load.state === "error") {
    return (
      <section className="rounded-3xl border border-amber-300/35 bg-card p-7 text-center">
        <BadgeCheck className="mx-auto h-6 w-6 text-amber-600" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl text-foreground">
          A emissão de grants não pôde ser auditada.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma permissão foi inferida do papel demonstrativo.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Executar novamente
        </button>
      </section>
    );
  }

  const proof = load.value;
  const categories = [...new Set(proof.cases.map((item) => item.category))];

  return (
    <section className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-sm">
      <div className="grid lg:grid-cols-[0.62fr_1.38fr]">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.12] via-card to-amber-500/[0.05] p-6 lg:border-r lg:border-b-0 sm:p-7">
          <BadgeCheck className="h-7 w-7 text-primary" aria-hidden />
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Least privilege · grants server-side
          </p>
          <p className="mt-3 font-mono text-5xl font-semibold text-foreground">
            {proof.passedCaseCount}/{proof.caseCount}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground">
            cenários de privilégio coerentes
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Sessão identifica. Membership autoriza. Navegação e papel escolhidos no cliente nunca
            emitem acesso.
          </p>
          <div className="mt-6 rounded-2xl border border-amber-300/35 bg-amber-500/[0.045] p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">
              Limite operacional
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-foreground">
              grantsServerIssued: false
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              O store de memberships e o adapter Cloud ainda não existem.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Política atômica e fail-closed
              </p>
              <h2 className="mt-2 font-serif text-2xl text-foreground">
                Um entitlement inválido rejeita o lote
              </h2>
            </div>
            <span className="rounded-full border border-emerald-300/50 bg-emerald-500/[0.08] px-3 py-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {proof.status}
            </span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => {
              const cases = proof.cases.filter((item) => item.category === category);
              return (
                <article
                  key={category}
                  className="rounded-xl border border-border/60 bg-background/35 p-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                  <p className="mt-2 text-[11px] font-medium text-foreground">
                    {GRANT_CATEGORY_COPY[category] ?? category}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {cases.filter((item) => item.passed).length}/{cases.length}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {proof.cases.map((item) => (
              <article
                key={item.id}
                className="flex items-start gap-2 rounded-xl border border-border/55 bg-muted/20 p-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                <div>
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted-foreground">
                    esperado={item.expectedReason} · observado={item.actualReason}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const SESSION_CATEGORY_COPY: Record<string, string> = {
  adapter: "Adapter confiável",
  claims: "Issuer e audience",
  time: "Validade temporal",
  membership: "Membership",
  tenant: "Seleção de tenant",
};

function SignedSessionContractCard({
  load,
  onRetry,
}: {
  load: SessionContractLoadState;
  onRetry: () => void;
}) {
  if (load.state === "loading") {
    return <section className="h-72 animate-pulse rounded-3xl bg-muted/55" aria-busy="true" />;
  }

  if (load.state === "error") {
    return (
      <section className="rounded-3xl border border-amber-300/35 bg-card p-7 text-center">
        <Fingerprint className="mx-auto h-6 w-6 text-amber-600" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl text-foreground">
          O contrato de sessão não pôde ser verificado.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma identidade foi promovida por inferência.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Executar novamente
        </button>
      </section>
    );
  }

  const proof = load.value;
  const categories = [...new Set(proof.cases.map((item) => item.category))];

  return (
    <section className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-sm">
      <div className="grid lg:grid-cols-[0.62fr_1.38fr]">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.13] via-card to-amber-500/[0.05] p-6 lg:border-r lg:border-b-0 sm:p-7">
          <Fingerprint className="h-7 w-7 text-primary" aria-hidden />
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Próximo blocker · sessão assinada
          </p>
          <p className="mt-3 font-mono text-5xl font-semibold text-foreground">
            {proof.passedCaseCount}/{proof.caseCount}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground">
            cenários de contrato aprovados
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            O servidor só poderá confiar em claims verificados e em uma membership ativa. Tenant
            escolhido no navegador nunca cria vínculo.
          </p>
          <div className="mt-6 rounded-2xl border border-amber-300/35 bg-amber-500/[0.045] p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">
              Estado de execução
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-foreground">
              signedSessionActive: false
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Contrato verificado não substitui assinatura criptográfica nem membership persistida.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Aceitação adversarial do adapter
              </p>
              <h2 className="mt-2 font-serif text-2xl text-foreground">
                Confiança nasce no servidor, não no cookie
              </h2>
            </div>
            <span className="rounded-full border border-emerald-300/50 bg-emerald-500/[0.08] px-3 py-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {proof.status}
            </span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map((category) => {
              const cases = proof.cases.filter((item) => item.category === category);
              return (
                <article
                  key={category}
                  className="rounded-xl border border-border/60 bg-background/35 p-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                  <p className="mt-2 text-[11px] font-medium text-foreground">
                    {SESSION_CATEGORY_COPY[category] ?? category}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {cases.filter((item) => item.passed).length}/{cases.length}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {proof.cases.map((item) => (
              <article
                key={item.id}
                className="flex items-start gap-2 rounded-xl border border-border/55 bg-muted/20 p-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                <div>
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted-foreground">
                    esperado={item.expectedReason} · observado={item.actualReason}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CloudReadinessCard({
  load,
  onRetry,
}: {
  load: CloudReadinessLoadState;
  onRetry: () => void;
}) {
  if (load.state === "loading") {
    return <section className="h-72 animate-pulse rounded-3xl bg-muted/55" aria-busy="true" />;
  }

  if (load.state === "error" || load.state === "empty") {
    return (
      <section className="rounded-3xl border border-amber-300/35 bg-card p-7 text-center">
        <CloudCog className="mx-auto h-6 w-6 text-amber-600" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl text-foreground">
          O gate de transição não pôde ser calculado.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Produção permanece bloqueada por padrão.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Recalcular gate
        </button>
      </section>
    );
  }

  const proof = load.value;
  return (
    <section className="overflow-hidden rounded-3xl border border-amber-300/40 bg-card shadow-sm">
      <div className="grid lg:grid-cols-[0.62fr_1.38fr]">
        <div className="border-b border-border/60 bg-gradient-to-br from-amber-500/[0.1] via-card to-primary/[0.06] p-6 lg:border-r lg:border-b-0 sm:p-7">
          <CloudCog className="h-7 w-7 text-amber-600 dark:text-amber-400" aria-hidden />
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
            Gate de transição Cloud
          </p>
          <h2 className="mt-2 font-serif text-3xl text-foreground">
            Fundação pronta. Cutover não.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Controles críticos não viram percentual. Um único blocker mantém a promoção fechada.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/55 bg-background/35 p-3">
              <dt className="font-mono text-2xl font-semibold text-foreground">
                {proof.foundation.passed}/{proof.foundation.total}
              </dt>
              <dd className="mt-1 text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
                fundação
              </dd>
            </div>
            <div className="rounded-xl border border-border/55 bg-background/35 p-3">
              <dt className="font-mono text-2xl font-semibold text-foreground">
                {proof.runtime.passed}/{proof.runtime.total}
              </dt>
              <dd className="mt-1 text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
                runtime
              </dd>
            </div>
          </dl>
          <div className="mt-4 rounded-2xl border border-amber-300/35 bg-amber-500/[0.045] p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">
              Promoção
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-foreground">
              productionClaimsAllowed: false
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Ordem segura de ativação
              </p>
              <h2 className="mt-2 font-serif text-2xl text-foreground">
                Cada blocker vira critério de aceite
              </h2>
            </div>
            <span className="rounded-full border border-amber-300/50 bg-amber-500/[0.08] px-3 py-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              {proof.status}
            </span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {proof.controls
              .filter((item) => item.layer === "foundation")
              .map((item) => (
                <article
                  key={item.id}
                  className="flex items-start gap-2 rounded-xl border border-emerald-300/25 bg-emerald-500/[0.035] p-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                      {item.evidence}
                    </p>
                  </div>
                </article>
              ))}
          </div>

          <ol className="mt-5 space-y-2">
            {proof.blockers.map((item, index) => (
              <li
                key={item.id}
                className="flex gap-3 rounded-xl border border-amber-300/25 bg-amber-500/[0.025] p-3"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/10 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    {item.evidence}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

const ISOLATION_CATEGORY_COPY: Record<string, string> = {
  tenant: "Tenant",
  scope: "Escopo",
  domain: "Domínio A/B",
  data_class: "Classe do dado",
  grant_lifecycle: "Ciclo da concessão",
  blind_write: "Escrita cega",
  idempotency: "Idempotência",
};

function IsolationAuditCard({ load, onRetry }: { load: IsolationLoadState; onRetry: () => void }) {
  if (load.state === "loading") {
    return <section className="h-80 animate-pulse rounded-3xl bg-muted/55" aria-busy="true" />;
  }

  if (load.state === "error") {
    return (
      <section className="rounded-3xl border border-amber-300/35 bg-card p-7 text-center">
        <Crosshair className="mx-auto h-6 w-6 text-amber-600" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl text-foreground">
          O oracle adversarial não respondeu.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum isolamento foi presumido como aprovado.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Executar novamente
        </button>
      </section>
    );
  }

  const proof = load.value;
  return (
    <section className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-sm">
      <div className="grid lg:grid-cols-[0.62fr_1.38fr]">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.13] via-card to-amber-500/[0.06] p-6 lg:border-r lg:border-b-0 sm:p-7">
          <Crosshair className="h-7 w-7 text-primary" aria-hidden />
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Ataque sintético de isolamento
          </p>
          <p className="mt-3 font-mono text-5xl font-semibold text-foreground">
            {proof.passedCaseCount}/{proof.caseCount}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground">cenários coerentes</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            O oracle combina autorização e persistência para atacar fronteiras antes que o banco
            exista.
          </p>
          <div className="mt-6 rounded-2xl border border-amber-300/35 bg-amber-500/[0.045] p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">
              Limite de garantia
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-foreground">
              rlsDeployed: false
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              É a suíte de aceitação das futuras policies, não enforcement Postgres.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Policy oracle · fail-closed
              </p>
              <h2 className="mt-2 font-serif text-2xl text-foreground">
                Tentar atravessar é parte do teste
              </h2>
            </div>
            <span className="rounded-full border border-emerald-300/50 bg-emerald-500/[0.08] px-3 py-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {proof.status}
            </span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {proof.categories.map((category) => (
              <article
                key={category.category}
                className="rounded-2xl border border-border/60 bg-background/35 p-4"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                <p className="mt-3 text-xs font-medium text-foreground">
                  {ISOLATION_CATEGORY_COPY[category.category] ?? category.category}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {category.passedCaseCount}/{category.caseCount} cenários
                </p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {proof.cases.map((item) => (
              <article
                key={item.id}
                className="flex items-start gap-2 rounded-xl border border-border/55 bg-muted/20 p-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                <div>
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted-foreground">
                    esperado={item.expectedReason} · observado={item.actualReason}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusCard({
  icon: Icon,
  eyebrow,
  title,
  text,
  action,
}: {
  icon: typeof Server;
  eyebrow: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
      <Icon className="h-5 w-5 text-primary" aria-hidden />
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-serif text-xl text-foreground">{title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
      {action}
    </section>
  );
}
