import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { manageQ1Delegation } from "@/lib/api/q1-delegation.functions";

type Target = { org: string; user: string };
type Ready = Extract<Awaited<ReturnType<typeof manageQ1Delegation>>, { status: "ready" }>;
const uuidPattern = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const field = "min-h-11 w-full rounded-md border bg-background px-3";

export function Q1DelegationPanel({ accessToken }: { accessToken: string }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [view, setView] = useState<Ready | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const pending = useRef(false);

  async function run(next: Target, change?: { enabled: boolean; base: number }) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setFeedback("");
    try {
      const result = await manageQ1Delegation({ data: { ...next, accessToken, change } });
      if (result.status === "ready") {
        setTarget(next);
        setView(result);
        if (change) setFeedback(change.enabled ? "Delegação concedida." : "Delegação revogada.");
      } else {
        setView(null);
        setFeedback(
          result.status === "conflict"
            ? "A delegação mudou. Consulte o vínculo novamente."
            : "Não foi possível consultar ou alterar esse vínculo. Confira os identificadores e a habilitação do Q1.",
        );
      }
    } catch {
      setView(null);
      setFeedback("Não foi possível confirmar a operação. Consulte o vínculo novamente.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <details className="rounded-xl border p-4">
      <summary className="min-h-11 cursor-pointer font-semibold">
        Delegação de preparação Q1
      </summary>
      <p className="mb-3 text-sm text-muted-foreground">
        Conceda a uma pessoa vinculada à empresa acesso à preparação do ciclo. A revisão técnica tem
        autorização própria.
      </p>
      <form
        className="space-y-3"
        onChange={() => {
          setView(null);
          setFeedback("");
        }}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void run({ org: String(data.get("org")).trim(), user: String(data.get("user")).trim() });
        }}
      >
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            ID da empresa
            <input name="org" className={field} required pattern={uuidPattern} />
          </label>
          <label className="grid gap-1 text-sm">
            ID da pessoa vinculada
            <input name="user" className={field} required pattern={uuidPattern} />
          </label>
          <Button type="submit" variant="outline" className="min-h-11">
            Consultar vínculo
          </Button>
        </fieldset>
      </form>
      {target && view && (
        <div className="mt-4 space-y-2 rounded-lg border p-3 [overflow-wrap:anywhere]">
          <p className="font-semibold">{view.company}</p>
          <p className="text-sm">Pessoa: {target.user}</p>
          <p className="text-sm">
            {view.delegated ? "Delegação ativa" : "Sem delegação"} ·{" "}
            {view.moduleEnabled ? "Q1 habilitado" : "Q1 desabilitado"}
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={busy || (!view.moduleEnabled && !view.delegated)}
            onClick={() => void run(target, { enabled: !view.delegated, base: view.revision })}
          >
            {view.delegated ? "Revogar delegação" : "Conceder preparação"}
          </Button>
        </div>
      )}
      <p role="status" className="mt-2 text-sm">
        {busy ? "Conferindo delegação…" : feedback}
      </p>
    </details>
  );
}
