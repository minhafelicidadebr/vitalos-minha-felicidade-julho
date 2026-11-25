// Porta de acesso das propostas. Uma senha, uma sessão (cookie HttpOnly em /api/proposta): quem
// entrou numa versão já está autorizado na outra. A senha e a saída sempre passam por
// /api/proposta (mesmo limite de tentativas); cada versão lê o próprio conteúdo no seu endpoint.
import { useCallback, useEffect, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { InstitutoMark } from "./ProposalV3";
import "./proposal.css";

type Screen = "checking" | "locked" | "unavailable" | "limited" | "error";

export const PROPOSAL_SESSION_ENDPOINT = "/api/proposta";

export function ProposalGate<T>({
  endpoint = PROPOSAL_SESSION_ENDPOINT,
  title = "Proposta de implantação acompanhada",
  render,
}: {
  endpoint?: string;
  title?: string;
  render: (content: T, logout: () => void) => React.ReactNode;
}) {
  const [screen, setScreen] = useState<Screen>("checking");
  const [content, setContent] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback((message?: string) => {
    if (expiry.current) clearTimeout(expiry.current);
    setContent(null);
    setScreen("locked");
    setError(message ?? null);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { credentials: "same-origin", cache: "no-store" });
      if (res.status === 503) return setScreen("unavailable");
      if (!res.ok) return lock();
      const body = (await res.json()) as { state: string; deck: T; ttlMs: number };
      if (body.state !== "ready") return lock();
      setContent(body.deck);
      if (expiry.current) clearTimeout(expiry.current);
      expiry.current = setTimeout(
        () => lock("A sessão expirou. Informe a senha de novo."),
        body.ttlMs,
      );
    } catch {
      setScreen("error");
    }
  }, [endpoint, lock]);

  useEffect(() => {
    void load();
    return () => {
      if (expiry.current) clearTimeout(expiry.current);
    };
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const password = input.current?.value ?? "";
    if (input.current) input.current.value = "";
    setBusy(true);
    try {
      const res = await fetch(PROPOSAL_SESSION_ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 429) return setScreen("limited");
      if (res.status === 503) return setScreen("unavailable");
      if (!res.ok) {
        lock("Senha não reconhecida. Confira e tente de novo.");
        input.current?.focus();
        return;
      }
      await load();
    } catch {
      setScreen("error");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(PROPOSAL_SESSION_ENDPOINT, { method: "DELETE", credentials: "same-origin" });
    } finally {
      lock("Você saiu da proposta.");
    }
  };

  if (content) return <>{render(content, logout)}</>;

  return (
    <div className="proposal min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
          <InstitutoMark className="h-9 w-auto sm:h-12" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        {screen === "checking" ? (
          <div role="status" aria-live="polite" className="max-w-md space-y-3">
            <span className="sr-only">Verificando o acesso à proposta…</span>
            <div className="h-8 w-3/4 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          </div>
        ) : null}
        {screen === "locked" ? (
          <section
            aria-labelledby="titulo-acesso"
            className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-6"
          >
            <LockKeyhole aria-hidden className="h-6 w-6 text-primary" />
            <h1 id="titulo-acesso" className="font-serif text-2xl text-foreground">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Esta proposta tem circulação restrita. Informe a senha que você recebeu junto com o
              link.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <label
                htmlFor="proposal-password"
                className="block text-sm font-medium text-foreground"
              >
                Senha da proposta
              </label>
              <input
                ref={input}
                id="proposal-password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
                aria-describedby={error ? "proposal-error" : undefined}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {error ? (
                <p id="proposal-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {busy ? "Verificando…" : "Abrir proposta"}
              </button>
            </form>
          </section>
        ) : null}
        {screen === "unavailable" || screen === "limited" || screen === "error" ? (
          <section
            role="alert"
            className="max-w-md space-y-3 rounded-2xl border border-border bg-card p-6"
          >
            <h1 className="font-serif text-2xl text-foreground">
              {screen === "unavailable"
                ? "Proposta indisponível neste ambiente"
                : screen === "limited"
                  ? "Muitas tentativas"
                  : "Não foi possível confirmar o acesso"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {screen === "unavailable"
                ? "O acesso a esta proposta não está configurado aqui. Nenhum conteúdo foi carregado."
                : screen === "limited"
                  ? "Aguarde um minuto antes de tentar de novo."
                  : "Confira sua conexão e tente de novo."}
            </p>
            {screen !== "unavailable" ? (
              <button
                type="button"
                onClick={() => {
                  setScreen("checking");
                  void load();
                }}
                className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Tentar de novo
              </button>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
