// Card introdutório de vídeo (Onda LDX-1, doc §7.3) — sem fonte aprovada,
// NUNCA renderiza player falso. Mostra poster/badge "Vídeo em preparação" e
// oferece só o caminho para o modal "Como funciona". Vídeo nunca bloqueia a
// continuidade da trilha (é só um card a mais, não um gate).

import { PlayCircle, Video } from "lucide-react";

export interface IntroVideoSource {
  title: string;
  durationLabel?: string;
  posterSrc?: string;
  videoSrc?: string;
  transcript?: string;
  captionsSrc?: string;
  sourceType: "OWNED" | "CURATED_EXTERNAL" | "NOT_AVAILABLE";
  contentStatus: "CURATED" | "DEMO" | "DRAFT";
}

export function IntroVideoCard({
  source,
  onOpenMethod,
}: {
  source: IntroVideoSource;
  onOpenMethod?: () => void;
}) {
  const hasRealVideo = source.sourceType !== "NOT_AVAILABLE" && Boolean(source.videoSrc);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      {hasRealVideo ? (
        <video
          className="aspect-video w-full bg-black"
          controls
          preload="metadata"
          poster={source.posterSrc}
        >
          <source src={source.videoSrc} />
          {source.captionsSrc && (
            <track kind="captions" src={source.captionsSrc} srcLang="pt-BR" label="Português" default />
          )}
        </video>
      ) : (
        <div
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-muted/40 text-muted-foreground"
          role="img"
          aria-label={`${source.title} — vídeo em preparação, ainda sem fonte aprovada`}
        >
          <Video className="h-8 w-8 opacity-50" aria-hidden />
          <span className="rounded-full border border-dashed border-border/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
            Vídeo em preparação
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">{source.title}</p>
          {source.durationLabel && (
            <p className="mt-0.5 text-xs text-muted-foreground">{source.durationLabel}</p>
          )}
        </div>
        {onOpenMethod && (
          <button
            type="button"
            onClick={onOpenMethod}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <PlayCircle className="h-4 w-4" aria-hidden />
            Como funciona
          </button>
        )}
      </div>

      {hasRealVideo && source.transcript && (
        <details className="border-t border-border/60 px-4 py-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Transcrição</summary>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{source.transcript}</p>
        </details>
      )}
    </div>
  );
}
