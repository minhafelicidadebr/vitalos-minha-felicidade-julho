import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  JOURNEY,
  DASHBOARD_PREVIEW,
  EXECUTIVE_FORM,
  type LandingModalType,
} from "../data/landing-copy";
import { TONE_CLASS } from "./icons";

export function LandingModal({
  open,
  onClose,
}: {
  open: LandingModalType | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open !== null} onOpenChange={(o) => !o && onClose()}>
      {open === "journey" && <JourneyModal />}
      {open === "dashboard" && <DashboardModal />}
      {open === "executive" && <ExecutiveModal />}
    </Dialog>
  );
}

// ─── Modal · Jornada de 12 meses ──────────────────────────────────────────────

function JourneyModal() {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-serif text-xl">{JOURNEY.title}</DialogTitle>
        <DialogDescription>{JOURNEY.subtitle}</DialogDescription>
      </DialogHeader>
      <ol className="mt-2 space-y-3">
        {JOURNEY.quarters.map((q) => {
          const tone = TONE_CLASS[q.tone] ?? TONE_CLASS.sky!;
          return (
            <li key={q.q} className="flex gap-3 rounded-xl border border-border/60 bg-card p-3.5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold ${tone.bg} ${tone.text}`}
              >
                {q.q}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-card-foreground">
                  {q.instrument} · <span className="text-muted-foreground">{q.theme}</span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{q.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </DialogContent>
  );
}

// ─── Modal · Dashboard demo ───────────────────────────────────────────────────

function DashboardModal() {
  const d = DASHBOARD_PREVIEW;
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-serif text-xl">Dashboard — demonstração</DialogTitle>
        <DialogDescription>{d.note}</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-3 gap-3">
        {d.metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border/60 bg-background p-3">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-1 font-serif text-2xl text-foreground">{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.sub}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2.5">
        {d.lenses.map((l) => (
          <div key={l.name} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs font-medium text-card-foreground">{l.name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${l.score}%` }}
                aria-hidden
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {l.score}
            </span>
          </div>
        ))}
      </div>
      <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        Pré-visualização ilustrativa. No app, cada número é agregado (n≥5) e rastreável ao
        instrumento.
      </p>
    </DialogContent>
  );
}

// ─── Modal · Apresentação executiva (form visual, sem backend) ────────────────

function ExecutiveModal() {
  const f = EXECUTIVE_FORM;
  const [submitted, setSubmitted] = useState(false);
  const [interest, setInterest] = useState<string>(f.interests[0]!);

  // Reinicia o estado sempre que o modal monta.
  useEffect(() => {
    setSubmitted(false);
    setInterest(f.interests[0]!);
  }, [f.interests]);

  if (submitted) {
    return (
      <DialogContent className="max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{f.successTitle}</DialogTitle>
          <DialogDescription>{f.successText}</DialogDescription>
        </DialogHeader>
        <span
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          aria-hidden
        >
          ✓
        </span>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif text-xl">{f.title}</DialogTitle>
        <DialogDescription>{f.subtitle}</DialogDescription>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        {f.fields.map((field) => (
          <div key={field.id}>
            <Label htmlFor={`lp-${field.id}`} className="text-xs text-muted-foreground">
              {field.label}
            </Label>
            <Input
              id={`lp-${field.id}`}
              type={field.type}
              placeholder={field.placeholder}
              autoComplete="off"
              className="mt-1"
            />
          </div>
        ))}

        <div>
          <Label htmlFor="lp-interesse" className="text-xs text-muted-foreground">
            Principal interesse
          </Label>
          <div
            className="mt-1.5 flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Principal interesse"
          >
            {f.interests.map((opt) => (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={interest === opt}
                onClick={() => setInterest(opt)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  interest === opt
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/60 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" className="mt-2 w-full">
          {f.submitLabel}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Demonstração visual — nenhum dado é enviado ou armazenado.
        </p>
      </form>
    </DialogContent>
  );
}
