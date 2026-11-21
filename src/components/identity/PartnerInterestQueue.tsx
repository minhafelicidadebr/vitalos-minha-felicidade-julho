import { useState } from "react";
import { Button } from "@/components/ui/button";
import { listPartnerInterest } from "@/lib/api/partner-interest.functions";

type Result = Awaited<ReturnType<typeof listPartnerInterest>>;

export function PartnerInterestQueue({ accessToken }: { accessToken: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setResult(null);
    try {
      setResult(await listPartnerInterest({ data: { accessToken } }));
    } catch {
      setResult({ status: "unavailable" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Fila local da Rede VitalOS" className="space-y-3 rounded-xl border p-4">
      <h2 className="font-serif text-xl">Candidaturas da Rede VitalOS · Ensaio</h2>
      <Button variant="outline" disabled={busy} onClick={() => void load()}>
        Consultar fila local
      </Button>
      {busy && <p role="status">Consultando candidaturas…</p>}
      {result?.status === "ready" ? (
        result.entries.length ? (
          <ul className="space-y-2">
            {result.entries.map((entry) => (
              <li key={entry.id} className="rounded-lg border p-3 [overflow-wrap:anywhere]">
                <p className="font-semibold">{entry.name}</p>
                <p>
                  {entry.track === "sst"
                    ? "SST e riscos psicossociais"
                    : "Bem-estar e desenvolvimento"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {entry.region} · {entry.email}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status">Nenhuma candidatura registrada.</p>
        )
      ) : result ? (
        <p role="alert">A fila local está indisponível para esta sessão.</p>
      ) : null}
    </section>
  );
}
