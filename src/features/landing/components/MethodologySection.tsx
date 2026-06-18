import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { METHODOLOGY, type CtaAction } from "../data/landing-copy";
import methodologyHumanInnovation from "@/assets/methodology-human-innovation-cycle.jpg";

export function MethodologySection({ onAction }: { onAction: (action: CtaAction) => void }) {
  return (
    <section
      id="metodologia"
      className="landing-light-grid relative isolate scroll-mt-24 overflow-hidden border-y border-border/40 bg-background py-16 sm:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-0 w-full overflow-hidden lg:w-[68%]"
      >
        <img
          src={methodologyHumanInnovation}
          alt=""
          loading="lazy"
          width={1672}
          height={941}
          className="h-full w-full object-cover object-center opacity-[0.46] mix-blend-multiply [filter:saturate(1.08)_contrast(1.05)_brightness(1.08)] [mask-image:linear-gradient(90deg,transparent_0%,black_30%,black_100%)]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,247,244,0.98)_0%,rgba(248,247,244,0.82)_18%,rgba(255,252,237,0.24)_54%,rgba(255,252,237,0.1)_100%)]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 z-0 h-full w-[58%] bg-[radial-gradient(circle_at_76%_24%,rgba(201,162,39,0.22)_0%,transparent_35%),radial-gradient(circle_at_42%_72%,rgba(11,61,46,0.14)_0%,transparent_42%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_34%,transparent)_1px,transparent_1px)] bg-[size:64px_64px] opacity-35"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {METHODOLOGY.eyebrow}
            </p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              {METHODOLOGY.title}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Um ciclo anual em quatro estações, fundamentado em psicometria, andragogia, behavioral
              design e gestão baseada em evidência. O que normalmente morre num relatório, aqui vira
              aprendizado vivo da organização.
            </p>
            <div className="mt-6">
              <Button
                size="lg"
                onClick={() => onAction(METHODOLOGY.cta.action)}
                className="group relative gap-2 overflow-hidden bg-gradient-to-r from-accent via-accent to-primary text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:shadow-xl hover:shadow-accent/30"
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                {METHODOLOGY.cta.label}
                <span
                  aria-hidden
                  className="absolute inset-y-0 -left-10 w-10 -skew-x-12 bg-white/20 blur-md transition-transform duration-700 group-hover:translate-x-[28rem]"
                />
              </Button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0.88, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative isolate min-h-[340px] overflow-visible sm:min-h-[400px] lg:min-h-[470px]"
          >
            <div
              aria-hidden
              className="absolute right-[-10%] top-[8%] h-[78%] w-[112%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(11,61,46,0.2)_0%,rgba(201,162,39,0.12)_42%,transparent_70%)] blur-3xl"
            />
            <div
              aria-hidden
              className="absolute inset-x-2 top-[16%] h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
            />
            <div
              aria-hidden
              className="absolute left-[8%] top-[18%] h-[64%] w-[82%] rounded-full border border-dashed border-primary/18"
            />
            <div
              aria-hidden
              className="absolute left-[17%] top-[29%] h-[42%] w-[62%] rounded-full border border-accent/18"
            />
            <motion.span
              aria-hidden
              initial={{ x: "-18%" }}
              whileInView={{ x: "18%" }}
              viewport={{ once: false }}
              transition={{
                duration: 5.5,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
              className="absolute left-[8%] top-[34%] z-20 h-px w-[78%] bg-gradient-to-r from-transparent via-accent/70 to-transparent"
            />
            <div
              aria-hidden
              className="absolute bottom-[18%] right-[12%] h-2 w-2 rounded-full bg-accent shadow-[0_0_28px_rgba(201,162,39,0.75)]"
            />
            <div
              aria-hidden
              className="absolute left-[15%] top-[26%] h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_28px_rgba(11,61,46,0.42)]"
            />
          </motion.div>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METHODOLOGY.steps.map((step, i) => (
            <li key={step.key} className="relative">
              {i < METHODOLOGY.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute right-[-12px] top-10 hidden text-3xl text-muted-foreground/30 lg:block"
                >
                  →
                </span>
              )}
              <div className="landing-light-card flex h-full flex-col rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl">
                <span className="landing-light-icon flex h-12 w-12 items-center justify-center rounded-2xl font-mono text-base font-semibold text-primary ring-1 ring-inset ring-primary/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-4 font-serif text-xl text-card-foreground">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
