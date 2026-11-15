import type { IvoQ2Sector, IvoQ2SectorGroup, IvoQ2View } from "@/lib/ivo/ivo-views";
import { FIBT_MANAGER_PANEL_ROUTE } from "@/domain/ivo/lens-catalog";
import { Fingerprint, Shield, Info } from "lucide-react";

// Detalhe da lente Q2 (FIB-T) — spec docs/vitalos/specs/fibt-q2-integration.md.
// Mostra o resultado NATIVO da FIB-T (fatores 0–4, escore bruto 0–12) somente
// para setores com leitura publicada. Estados protegidos aparecem como estado
// e motivo, nunca como número. Não existe leitura de nível onda.

export const SECTOR_GROUP_LABEL: Record<IvoQ2SectorGroup, string> = {
  available: "Resultado publicado",
  suppressed: "Protegido",
  pending_publication: "Publicação pendente",
  collecting: "Em coleta",
  no_data: "Sem dados",
  unavailable: "Indisponível",
};

const GROUP_TONE: Record<IvoQ2SectorGroup, string> = {
  available: "border-emerald-600/50",
  suppressed: "border-amber-600/50",
  pending_publication: "border-sky-600/40",
  collecting: "border-border",
  no_data: "border-border",
  unavailable: "border-destructive/40",
};

const WAVE_STATUS_LABEL: Record<string, string> = {
  collecting: "em coleta",
  sealed: "encerrada",
  closed: "encerrada",
};

export function formatMean(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDateBR(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function SectorCard({ sector, waveId }: { sector: IvoQ2Sector; waveId: string }) {
  const headingId = `setor-${sector.key}`;
  return (
    <article aria-labelledby={headingId} className={`min-w-0 space-y-3 break-words rounded-xl border bg-background p-4 sm:p-5 ${GROUP_TONE[sector.group]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="font-medium text-foreground">
          {sector.label}
        </h3>
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground">
          <Shield aria-hidden="true" className="size-4 shrink-0" />
          {SECTOR_GROUP_LABEL[sector.group]}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Participação:{" "}
        {sector.group === "collecting" || sector.group === "no_data" ? "nenhuma registrada" : sector.countLabel}
      </p>

      {sector.group === "available" && sector.factors ? (
        <>
          <div role="region" aria-label={`Resultados publicados de ${sector.label}`} tabIndex={0} className="max-w-full overflow-x-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <table className="w-full min-w-[20rem] text-sm">
            <caption className="text-left text-xs text-muted-foreground">
              Médias publicadas em {formatDateBR(sector.publishedAt)} — escala do instrumento de 0 a 4
            </caption>
            <thead>
              <tr>
                <th scope="col" className="py-1 text-left font-medium">Fator</th>
                <th scope="col" className="py-1 text-right font-medium">Média</th>
                <th scope="col" className="py-1 text-right font-medium">
                  <span className="sr-only">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sector.factors.map((factor) => (
                <tr key={factor.id} className="border-t border-border/60">
                  <th scope="row" className="py-3 pr-3 text-left font-normal">{factor.name}</th>
                  <td className="px-2 py-3 text-right font-semibold tabular-nums">{formatMean(factor.mean)}</td>
                  <td className="py-1.5 text-right">
                    <a
                      href={`/ivo-integral/acoes?wave=${waveId}&setor=${sector.cohortId}&fator=${factor.id}`}
                      className="inline-flex min-h-11 items-center text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      Definir prioridade
                      <span className="sr-only"> para {factor.name} em {sector.label}</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {sector.rawScore !== null ? (
            <p className="rounded-lg border border-border bg-muted/20 p-3 text-sm leading-relaxed text-muted-foreground">
              Escore bruto publicado: <span className="tabular-nums text-foreground">{formatMean(sector.rawScore)}</span> (escala de 0 a 12)
            </p>
          ) : null}
        </>
      ) : (
        <p className="rounded-lg bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">{sector.message}</p>
      )}
    </article>
  );
}

export function IvoQ2Detail({ view }: { view: IvoQ2View }) {
  const m = view.methodology;
  return (
    <div className="min-w-0 space-y-6">
      <section aria-labelledby="q2-metodologia" className="min-w-0 space-y-4 rounded-xl border border-border bg-muted/20 p-4 text-sm sm:p-6">
        <h2 id="q2-metodologia" className="flex items-center gap-2 font-semibold text-foreground"><Fingerprint aria-hidden="true" className="size-5 shrink-0 text-primary" />Identidade metodológica</h2>
        <dl className="grid gap-3 sm:grid-cols-2 [&>div]:min-w-0 [&>div]:break-words [&>div]:rounded-lg [&>div]:border [&>div]:border-border [&>div]:bg-background/60 [&>div]:p-3 [&_dt]:mb-1 [&_dt]:block [&_dd]:block">
          <div><dt className="inline text-muted-foreground">Instrumento: </dt><dd className="inline">{m.instrumentName}</dd></div>
          <div><dt className="inline text-muted-foreground">Versão aplicada na onda: </dt><dd className="inline">{m.waveInstrumentVersion}</dd></div>
          <div><dt className="inline text-muted-foreground">Versão do manifesto: </dt><dd className="inline">{m.manifestVersion} ({m.manifestStatus})</dd></div>
          <div><dt className="inline text-muted-foreground">Cálculo: </dt><dd className="inline">{m.calculationVersion}</dd></div>
          <div><dt className="inline text-muted-foreground">Limiar de publicação: </dt><dd className="inline">mínimo de {m.kMin} participações por recorte</dd></div>
          <div><dt className="inline text-muted-foreground">Escalas: </dt><dd className="inline">fatores {m.factorScale.min}–{m.factorScale.max}; escore bruto 0–{m.rawScoreMax}</dd></div>
        </dl>
        <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3"><Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-relaxed">As médias dos fatores e o escore bruto têm escalas diferentes. Proteção e ausência de dados são estados; não representam uma nota zero.</p></div>
        <p className="mt-2 text-xs text-muted-foreground">{m.citation}</p>
      </section>

      <section aria-labelledby="q2-setores" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="q2-setores" className="font-serif text-xl text-foreground">Leitura por setor</h2>
          <a
            href={`${FIBT_MANAGER_PANEL_ROUTE}?wave=${view.wave.id}`}
            className="inline-flex min-h-11 items-center text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Abrir centro de controle FIB-T (coleta e publicação)
          </a>
        </div>
        <p className="text-sm text-muted-foreground">
          Onda “{view.wave.label}” · {WAVE_STATUS_LABEL[view.wave.status] ?? view.wave.status} · ciclo {view.cycleKey}.
          A publicação acontece por setor e em lote protegido; esta tela mostra apenas o que já foi publicado.
        </p>
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          {view.sectors.map((sector) => (
            <SectorCard key={sector.cohortId} sector={sector} waveId={view.wave.id} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Não existe leitura publicada no nível da onda: combinar setores numa média única exige decisão metodológica ainda não tomada.
        </p>
      </section>
    </div>
  );
}
