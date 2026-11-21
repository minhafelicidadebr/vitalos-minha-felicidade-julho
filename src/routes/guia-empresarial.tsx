import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import type { GuideContent, GuideLens, GuidePerspective } from "@/domain/guide/guide-types";
import { GuideJourney } from "@/features/guide/GuideJourney";
import { GuideOpening } from "@/features/guide/GuideOpening";
import { validateGuideSearch } from "@/features/guide/guide-search";

// Guia da Jornada Empresarial · entrada pública (home). O conteúdo editorial só chega
// depois da validação da senha NO SERVIDOR (/api/guia). Nenhum dado institucional aqui.
export const Route = createFileRoute("/guia-empresarial")({
  validateSearch: validateGuideSearch,
  head: () => ({ meta: [{ title: "Guia da jornada empresarial — VitalOS™" }, { name: "robots", content: "noindex" }] }),
  component: GuidePublicPage,
});

type State =
  | { kind: "checking" }
  | { kind: "locked"; error?: string }
  | { kind: "unavailable" }
  | { kind: "ready"; content: GuideContent; environment: string };

function GuidePublicPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/guia-empresarial" });
  const [state, setState] = useState<State>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const journeyRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/guia", { credentials: "same-origin" });
      if (res.status === 503) return setState({ kind: "unavailable" });
      if (!res.ok) return setState({ kind: "locked" });
      const body = (await res.json()) as { deck: { content: GuideContent; environment: string } };
      setState({ kind: "ready", content: body.deck.content, environment: body.deck.environment });
    } catch {
      setState({ kind: "unavailable" });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/guia", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setPassword("");
      if (res.status === 429) return setState({ kind: "locked", error: "Muitas tentativas. Aguarde um minuto." });
      if (res.status === 503) return setState({ kind: "unavailable" });
      if (!res.ok) return setState({ kind: "locked", error: "Senha não reconhecida. Confira e tente de novo." });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const change = (next: { stage?: GuideLens; perspective?: GuidePerspective }) =>
    navigate({ search: (prev) => ({ ...prev, ...(next.stage ? { etapa: next.stage } : {}), ...(next.perspective ? { perfil: next.perspective } : {}) }), replace: true });

  const start = () => {
    void navigate({ search: { etapa: "Q2", perfil: "rh" } }).then(() => journeyRef.current?.focus());
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" aria-label="VitalOS — página inicial" className="inline-flex min-h-11 items-center">
            <VitalOSBrand variant="horizontal" size="sm" />
          </Link>
          <Link to="/entrar" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-2 hover:underline">
            Entrar
          </Link>
        </div>
      </header>
      <main id="guide-main" className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {state.kind === "checking" ? (
          <p role="status" className="text-sm text-muted-foreground">Verificando o acesso ao guia…</p>
        ) : null}
        {state.kind === "unavailable" ? (
          <section role="alert" className="max-w-xl space-y-2 rounded-xl border border-border bg-card p-5">
            <h1 className="font-serif text-2xl">Guia indisponível neste ambiente</h1>
            <p className="text-sm text-muted-foreground">O acesso editorial não está configurado aqui. Nenhum conteúdo foi carregado.</p>
          </section>
        ) : null}
        {state.kind === "locked" ? (
          <section aria-labelledby="guide-lock" className="max-w-md space-y-4 rounded-xl border border-border bg-card p-5">
            <LockKeyhole aria-hidden className="h-6 w-6 text-primary" />
            <h1 id="guide-lock" className="font-serif text-2xl">Guia da jornada empresarial</h1>
            <p className="text-sm text-muted-foreground">
              Informe a senha recebida para ver o guia com um exemplo construído. Quem já participa pode entrar pela conta institucional e abrir “Guia da minha jornada”.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="guide-password">Senha do guia</label>
              <input
                id="guide-password"
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={state.error ? "guide-error" : undefined}
                className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {state.error ? <p id="guide-error" role="alert" className="text-sm text-destructive">{state.error}</p> : null}
              <button type="submit" disabled={busy || password.length === 0} className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {busy ? "Verificando…" : "Abrir o guia"}
              </button>
            </form>
          </section>
        ) : null}
        {state.kind === "ready" ? (
          <>
            {!search.etapa ? <GuideOpening content={state.content} environment={state.environment} onStart={start} /> : null}
            {search.etapa ? (
              <div ref={journeyRef} tabIndex={-1} className="focus-visible:outline-none">
                <p className="mb-3 text-sm">
                  <Link to="/guia-empresarial" search={{}} className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline">← Voltar à abertura</Link>
                </p>
                <GuideJourney
                  content={state.content}
                  context={null}
                  environment={state.environment}
                  stage={search.etapa}
                  perspective={search.perfil ?? "rh"}
                  onChange={change}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
