import { Button } from "@/components/ui/button";
import { FINAL_CTA, type CtaAction } from "../data/landing-copy";

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
  onEnterApp?: () => void;
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
            <Button size="lg" variant="outline" onClick={onEnterApp}>
              Explorar app (demo)
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
