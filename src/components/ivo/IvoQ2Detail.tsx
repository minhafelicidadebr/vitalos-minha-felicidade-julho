import type { IvoQ2Sector, IvoQ2SectorGroup, IvoQ2View } from "@/lib/ivo/ivo-views";
import { FIBT_MANAGER_PANEL_ROUTE } from "@/domain/ivo/lens-catalog";

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
    <article aria-labelledby={headingId} className={`rounded-md border bg-background p-4 ${GROUP_TONE[sector.group]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="font-medium text-foreground">
          {sector.label}
        </h3>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {SECTOR_GROUP_LABEL[sector.group]}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Participação: {sector.countLabel}</p>

      {sector.group === "available" && sector.factors ? (
        <>
          <table className="mt-3 w-full text-sm">
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
                  <th scope="row" className="py-1.5 text-left font-normal">{factor.name}</th>
                  <td className="py-1.5 text-right tabular-nums">{formatMean(factor.mean)}</td>
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
          {sector.rawScore !== null ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Escore bruto publicado: <span className="tabular-nums text-foreground">{formatMean(sector.rawScore)}</span> (escala de 0 a 12)
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{sector.message}</p>
      )}
    </article>
  );
}

export function IvoQ2Detail({ view }: { view: IvoQ2View }) {
  const m = view.methodology;
  return (
    <div className="space-y-6">
      <section aria-labelledby="q2-metodologia" className="rounded-md border border-border bg-muted/20 p-4 text-sm">
        <h2 id="q2-metodologia" className="font-medium text-foreground">Identidade metodológica</h2>
        <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <div><dt className="inline text-muted-foreground">Instrumento: </dt><dd className="inline">{m.instrumentName}</dd></div>
          <div><dt className="inline text-muted-foreground">Versão aplicada na onda: </dt><dd className="inline">{m.waveInstrumentVersion}</dd></div>
          <div><dt className="inline text-muted-foreground">Versão do manifesto: </dt><dd className="inline">{m.manifestVersion} ({m.manifestStatus})</dd></div>
          <div><dt className="inline text-muted-foreground">Cálculo: </dt><dd className="inline">{m.calculationVersion}</dd></div>
          <div><dt className="inline text-muted-foreground">Limiar de publicação: </dt><dd className="inline">mínimo de {m.kMin} participações por recorte</dd></div>
          <div><dt className="inline text-muted-foreground">Escalas: </dt><dd className="inline">fatores {m.factorScale.min}–{m.factorScale.max}; escore bruto 0–{m.rawScoreMax}</dd></div>
        </dl>
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
        <div className="grid gap-3 md:grid-cols-2">
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
