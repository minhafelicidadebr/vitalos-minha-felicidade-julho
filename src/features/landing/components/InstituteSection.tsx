import { motion } from "framer-motion";
import { INSTITUTE } from "../data/landing-copy";
import instituteLogoTransparent from "@/assets/instituto-felicidade-para-todos-logo-transparent.png";

export function InstituteSection() {
  const inst = INSTITUTE;
  return (
    <section className="border-t border-border/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-background to-muted/30 p-6 shadow-sm sm:p-10"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_34%,transparent)_1px,transparent_1px)] bg-[size:56px_56px] opacity-25"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent"
          />
          <div className="relative">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                {inst.eyebrow}
              </p>

              <div className="mt-5 inline-flex max-w-full items-center">
                <img
                  src={instituteLogoTransparent}
                  alt={inst.name}
                  width={600}
                  height={219}
                  loading="lazy"
                  className="h-auto max-h-28 w-auto max-w-full object-contain drop-shadow-[0_12px_28px_rgba(11,61,46,0.14)] sm:max-h-32"
                />
              </div>

              <p className="mt-4 font-serif text-lg text-foreground">{inst.tagline}</p>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
                {inst.text}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
