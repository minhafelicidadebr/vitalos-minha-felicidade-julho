import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import { Dialog, DialogDescription, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { IVO_METHOD_ANCHOR, IVO_METHOD_LINKS, IVO_METHOD_NOTES, IVO_METHOD_VERSION } from "@/domain/ivo/method-presentation";

type View = keyof typeof IVO_METHOD_NOTES;
const HELP = {
  coverage: {
    example: "Uma leitura de Q2 publicada pode aparecer na escala da própria lente. O vínculo com uma dimensão depende do mapeamento aprovado.",
    technical: "Confira período, versão, fonte e status por lente. Ausência, proteção, erro e mapeamento pendente têm significados diferentes. Comparações dependem de medidas e recortes compatíveis.",
  },
  demo: {
    example: "Num exemplo de escala de 1 a 5, a média 3 se normaliza para 500 em 1.000. O peso do pilar define sua contribuição para o total.",
    technical: "Normalização linear por pilar: (média − mínimo) ÷ (máximo − mínimo). O composto legado soma as contribuições ponderadas e converte para 0–1.000. Pilares ausentes ou suprimidos recebem o ponto neutro no cálculo legado sintético.",
  },
  trajectory: {
    example: "Se o exemplo começa em 500 pontos, a referência permanece em 500 em todas as temporadas. A alternativa muda conforme as alavancas escolhidas.",
    technical: "No simulador legado, multiplique o ganho base da alavanca pelo fator de cenário e por max(0, 1 − pontuação do pilar ÷ 900). Some contribuições de alavancas ativas. Em pilares visíveis sem ganho, aplique a deriva demonstrativa de −4, arredonde e limite a 0–1.000. A referência plana usa hipótese de evolução zero.",
  },
  pnl: {
    example: "R$ 6.000 de intervenção e R$ 300 evitáveis por dia dão equilíbrio em 20 dias. Com 25 dias evitados, o saldo do cenário é +R$ 1.500.",
    technical: "Referência menos cenário, em unidades do mesmo desfecho, vezes valor evitável por unidade. Deduzir o custo incremental da intervenção. Sem valor evitável positivo, a conta do equilíbrio por unidade fica indisponível.",
  },
} satisfies Record<View, { example: string; technical: string }>;

function HelpDialog({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d8b76f]/55 bg-[#13382e] px-3 text-left text-sm font-medium text-white hover:bg-[#214c3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d38e]">
          <Info aria-hidden="true" className="size-4 shrink-0 text-[#f2d08a]" /> {title}
        </button>
      </DialogTrigger>
      <DialogContent overlayClassName="z-[79] motion-reduce:animate-none" className="z-[80] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto overscroll-contain rounded-xl motion-reduce:animate-none [&>button]:grid [&>button]:size-11 [&>button]:place-items-center">
        <DialogTitle className="pr-12 font-serif text-xl">{title}</DialogTitle>
        <DialogDescription className="leading-relaxed">{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function IvoMethodHeader({ view, title, description, status, children }: {
  view: View; title: string; description: string; status: string; children?: ReactNode;
}) {
  const help = HELP[view];
  const source = IVO_METHOD_LINKS[view === "demo" ? "coverage" : view];

  return (
    <header className="space-y-3">
      <div className="relative isolate overflow-hidden rounded-3xl border border-[#315a49] bg-linear-to-br from-[#102e26] to-[#1b4436] px-5 py-6 text-white sm:px-9 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-1/2 -z-10 size-64 -translate-y-1/2 opacity-20 sm:right-3 sm:size-80 sm:opacity-55">
          {[22, 48, 73, 99].map((rotation, i) => (
            <span key={rotation} style={{ inset: `${i * 9}%`, transform: `rotate(${rotation}deg) scaleX(.68)` }} className="absolute rounded-[48%] border border-[#e6bf71]" />
          ))}
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <VitalOSBrand variant="mark" size="sm" decorative={false} />
          <span className="text-xs font-semibold tracking-[0.14em] text-[#f2d08a]">IVO · VITALIDADE ORGANIZACIONAL</span>
        </div>
        <h1 className="max-w-2xl text-balance font-serif text-3xl leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#e2eee7] sm:text-base">{description}</p>
        <p className="mt-4 text-sm font-semibold text-[#f2d08a]">{status}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <HelpDialog title="Como calculamos?" description={IVO_METHOD_NOTES[view]}>
            <div className="rounded-lg bg-muted/45 p-4 text-sm"><strong>Exemplo ilustrativo</strong><p className="mt-1">{help.example}</p></div>
            <p className="text-sm leading-relaxed text-muted-foreground">{help.technical}</p>
          </HelpDialog>
          <HelpDialog title="O que a pesquisa sustenta?" description="Fontes para entender o método. Cada referência tem um alcance definido.">
            <div className="rounded-lg border border-border p-4 text-sm leading-relaxed">
              <a className="font-semibold text-primary underline underline-offset-4" href={source.url}>{source.title}</a>
              <p className="mt-1 text-muted-foreground">{source.locator}</p>
              <p className="mt-2">{source.limit}</p>
            </div>
          </HelpDialog>
          <a href={`#${IVO_METHOD_ANCHOR}`} className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d38e]">Ficha técnica v{IVO_METHOD_VERSION}</a>
          {children}
        </div>
      </div>
    </header>
  );
}

export function IvoMethodSheet({ view, children }: { view: View; children?: ReactNode }) {
  return (
    <section id={IVO_METHOD_ANCHOR} aria-labelledby="ivo-method-title" className="scroll-mt-24 space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h2 id="ivo-method-title" className="font-serif text-xl">Ficha técnica · v{IVO_METHOD_VERSION}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{HELP[view].technical}</p>
      {children}
    </section>
  );
}
