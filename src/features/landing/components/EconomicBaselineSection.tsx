// Bloco não computacional que substitui a Calculadora de Impacto na landing
// pública (H2.1A — contenção emergencial de claims públicos). Sem sliders,
// sem cálculo, sem ROI: só o convite a estruturar indicadores reais do ciclo.
// A Calculadora (ImpactCalculatorSection/impact-calc.ts) segue no repositório,
// só sem ponto de montagem público nesta fatia.

import { motion } from "framer-motion";
import { ECONOMIC_BASELINE } from "../data/landing-copy";

export function EconomicBaselineSection() {
  const c = ECONOMIC_BASELINE;

  return (
    <section className="border-t border-border/40 bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
        >
          <h2 className="font-serif text-2xl leading-tight text-foreground sm:text-3xl">
            {c.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{c.text}</p>
        </motion.div>
      </div>
    </section>
  );
}
