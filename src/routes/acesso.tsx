import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Ban,
  Building2,
  CheckCircle2,
  CloudCog,
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

function AccessBoundaryPage() {
  const { pack, packId, sectorLabel, status, reload } = usePack();
  const roleId = usePersona((state) => state.roleId);
  const [boundary, setBoundary] = useState<BoundaryLoadState>({ state: "loading" });

  function loadBoundary() {
    setBoundary({ state: "loading" });
    void getIdentityBoundaryStatus()
      .then((value) => setBoundary({ state: "ready", value }))
      .catch(() => setBoundary({ state: "error" }));
  }

  useEffect(loadBoundary, []);

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
