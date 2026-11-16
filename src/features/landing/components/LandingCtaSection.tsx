import { Button } from "@/components/ui/button";
import type { MouseEventHandler } from "react";
import { FINAL_CTA, type CtaAction } from "../data/landing-copy";
import { InstitutionalAccessLink } from "./InstitutionalAccessLink";

const VARIANT: Record<string, "default" | "outline" | "ghost"> = {
  primary: "default",
  outline: "outline",
  ghost: "ghost",
};

export function LandingCtaSection({
  onAction,
  onEnterApp,
}: {
  onAction: (action: CtaAction) => void;
  onEnterApp?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_120%,color-mix(in_oklab,var(--color-primary)_20%,transparent)_0%,transparent_70%)]"
      />
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">
          {FINAL_CTA.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          {FINAL_CTA.text}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {FINAL_CTA.buttons.map((cta) => (
            <Button
              key={cta.label}
              size="lg"
              variant={VARIANT[cta.variant ?? "primary"]}
              onClick={() => onAction(cta.action)}
            >
              {cta.label}
            </Button>
          ))}
          {onEnterApp && (
            <Button size="lg" variant="outline" className="min-h-11" onClick={onEnterApp}>
              Explorar demonstração
            </Button>
          )}
        </div>
        <div className="mt-8 flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card/60 p-5 text-left sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground">Já tem acesso à plataforma?</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Entre com seu e-mail corporativo para acessar o ambiente da sua organização.
            </p>
          </div>
          <InstitutionalAccessLink className="w-full shrink-0 sm:w-auto" />
        </div>
      </div>
    </section>
  );
}
