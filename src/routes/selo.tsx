import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { useIvo, useOrg } from "@/mocks/hooks";
import { certify, type CriterionResult } from "@/engine/certification/certification-engine";
import { evaluateEvidence } from "@/engine/lab/evidence-engine";
import { EXPERIMENT_CASES } from "@/mocks/experiment-mock";
import { CONSENT_CHANNELS } from "@/mocks/consent-mock";
import { DOMAIN_B_READY, TIER_STYLE, STATUS_STYLE, SEAL_INTRO } from "@/mocks/certification-mock";
import { formatReportDate } from "@/mocks/esg-report-mock";
import { getEarnedSeal } from "@/lib/api/earned-seal.functions";
import type { EarnedSeal } from "@/lib/proof/earned-seal.server";

export const Route = createFileRoute("/selo")({
  head: () => ({ meta: [{ title: "Selo Empresa Viva — 4 Lentes VitalOS™" }] }),
  component: SeloPage,
});

function SeloPage() {
  const { packId } = usePack();
  const { current, previous } = useIvo();
  const org = useOrg();

  // Selo GANHO: o Domínio B flui da Prova de Ciclo real (server). Sobrepõe o
  // resultado local assim que carrega — sem flash de loading (o local renderiza já).
  const [earned, setEarned] = useState<EarnedSeal | null>(null);
  useEffect(() => {
    let active = true;
    void getEarnedSeal({ data: { packId } })
      .then((e) => active && setEarned(e))
      .catch(() => active && setEarned(null));
    return () => {
      active = false;
    };
  }, [packId]);

  // Fallback local (render imediato, funciona offline): usa o DOMAIN_B_READY legado.
  const localResult = useMemo(() => {
    if (!current) return null;

    const experimentsConfirmed = EXPERIMENT_CASES.filter(
      (c) => c.status === "concluido" && c.observed,
    )
      .map((c) => evaluateEvidence(c.observed!))
      .filter((v) => v.verdict === "confirmado" || v.verdict === "superou").length;

    // Cobertura de consentimento ≈ canal de percepção (pulses), o Trust Ledger ativo.
    const consentCoveragePct = CONSENT_CHANNELS.find((c) => c.id === "pulses")?.orgConsentPct ?? 0;

    return certify({
      ivoScore: current.ivoScore,
      previousIvoScore: previous?.ivoScore ?? 0,
      participationPct: org.participationPct,
      experimentsConfirmed,
      domainBReady: DOMAIN_B_READY,
      consentCoveragePct,
      kAnonRespected: true, // invariante de arquitetura
    });
  }, [current, previous, org.participationPct]);

  // A verdade preferida é o selo GANHO do servidor; o local é só o fallback inicial.
  const result = earned?.seal ?? localResult;

  if (!result) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p role="status" className="text-muted-foreground">Preparando a prévia demonstrativa…</p>
        </div>
      </AppShell>
    );
  }

  const style = TIER_STYLE[result.tier];
  const essentialCriteria = result.criteria.filter((criterion) => criterion.essential);
  const complementaryCriteria = result.criteria.filter((criterion) => !criterion.essential);
  const complementaryMet = complementaryCriteria.filter((criterion) => criterion.status === "cumprido").length;
  const essentialProgress = essentialCriteria.length
    ? Math.round((result.essentialMet / essentialCriteria.length) * 100)
    : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 print:py-0">
        {/* Timbre institucional — só na impressão */}
        <div className="print-only mb-4 border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded bg-primary font-serif text-sm text-primary-foreground">
                4
              </span>
              <span className="text-sm font-medium text-foreground">4 Lentes VitalOS™</span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Prévia demonstrativa · sem validade de certificação
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Exemplo institucional · Selo Empresa Viva · Gerado em {formatReportDate()}
          </p>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Prévia demonstrativa · {SEAL_INTRO.eyebrow}
            </p>
            <h1 className="mt-1 font-serif text-3xl text-foreground">Selo Empresa Viva</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Explore como os critérios organizam uma avaliação. Os dados atuais são demonstrativos e não representam uma certificação emitida para uma organização.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            title="Imprime esta prévia demonstrativa; não é um certificado."
            aria-label="Imprimir prévia demonstrativa"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring print:hidden"
          >
            <span aria-hidden>⤓</span> Imprimir prévia
          </button>
        </motion.div>

        <aside aria-label="Aviso sobre os dados" className="flex items-start gap-3 rounded-xl border border-sky-300/50 bg-sky-50/60 p-4 text-sm leading-relaxed text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/20 dark:text-sky-100">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p><strong>Ambiente demonstrativo.</strong> Os cálculos abaixo usam dados simulados. Não comprovam resultados, não concedem selo e não podem ser apresentados como certificação.</p>
        </aside>

        <section aria-label="Resumo da elegibilidade demonstrativa" className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Critérios essenciais</p>
            <p className="mt-1 font-serif text-2xl tabular-nums text-foreground">{result.essentialMet} <span className="text-base text-muted-foreground">de {essentialCriteria.length}</span></p>
            <div role="progressbar" aria-label="Critérios essenciais cumpridos no exemplo" aria-valuemin={0} aria-valuemax={essentialCriteria.length} aria-valuenow={result.essentialMet} className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${essentialProgress}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Critérios complementares</p>
            <p className="mt-1 font-serif text-2xl tabular-nums text-foreground">{complementaryMet} <span className="text-base text-muted-foreground">de {complementaryCriteria.length}</span></p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Diferenciam o nível de referência dentro desta simulação.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Nível calculado no exemplo</p>
            <p className={`mt-1 font-serif text-xl ${style.color}`}>{result.tierLabel}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Regra demonstrativa, sem validade de certificação.</p>
          </div>
        </section>

        {/* O selo — emblema visual da simulação, sem emissão certificativa. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm print:shadow-none print:print-certificate print-certificate"
        >
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 top-0 h-40 ${style.bg} opacity-60 blur-2xl print:hidden`}
          />
          <p className="print-only mb-4 font-serif text-[11px] uppercase tracking-[0.3em] text-primary">
            Prévia · sem validade de certificação
          </p>
          <div className="relative">
            {/* halo externo */}
            <div
              aria-hidden
              className={`absolute inset-0 -m-3 rounded-full ${style.bg} opacity-50 blur-xl print:hidden`}
            />
            {/* anel duplo */}
            <div
              className={`relative grid h-32 w-32 place-items-center rounded-full ring-2 ring-offset-4 ring-offset-card ${style.ring} ${style.bg}`}
            >
              <div
                className={`grid h-24 w-24 place-items-center rounded-full bg-card text-5xl ring-1 ring-inset ${style.ring} ${
                  result.granted ? "shadow-inner" : "opacity-80 grayscale-[0.3]"
                }`}
              >
                <span aria-hidden>{style.emoji}</span>
              </div>
            </div>
          </div>
          <p className={`relative mt-5 font-serif text-2xl tracking-tight ${style.color}`}>
            {result.tierLabel}
          </p>
          <p className="relative mt-1 text-xs text-muted-foreground">
            Exemplo institucional · {result.essentialMet}/{result.essentialTotal} critérios essenciais no exemplo
          </p>
          <span
            className={`relative mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style.bg} ${style.color}`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                result.granted ? "bg-emerald-500" : "bg-muted-foreground/60"
              }`}
            />
            {result.granted ? "Elegibilidade atingida no exemplo" : "Elegibilidade não atingida no exemplo"}
          </span>
          <p className="relative mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
            O nível exibido ilustra a regra de cálculo. Uma emissão real exigiria dados verificados, governança aprovada e processo formal de certificação.
          </p>

          {/* Linha de assinatura/validade — só impressão */}
          <div className="print-only mt-10 grid w-full max-w-md grid-cols-2 gap-8 text-left">
            <div>
              <div className="h-px w-full bg-foreground/60" />
              <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Sem assinatura · exemplo demonstrativo
              </p>
            </div>
            <div>
              <div className="h-px w-full bg-foreground/60" />
              <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Gerado em {formatReportDate()} · sem validade certificativa
              </p>
            </div>
          </div>
        </motion.div>

        {/* Critérios auditáveis */}
        <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
          <header className="border-b border-border/50 px-5 py-4">
            <h2 className="font-serif text-lg text-foreground">Como o exemplo é avaliado</h2>
            <p className="text-xs text-muted-foreground">
              Os critérios mostram a regra e o estado na simulação. As fontes desta versão são dados de demonstração, não evidências auditáveis de uma organização.
            </p>
          </header>
          <div className="divide-y divide-border/40">
            <CriterionGroup title="Essenciais para o nível Empresa Viva (no exemplo)" criteria={essentialCriteria} />
            <CriterionGroup title="Complementares para o nível Referência (no exemplo)" criteria={complementaryCriteria} />
          </div>
        </section>

        {/* Proveniência sintética: não representa prova real de ciclo. */}
        {earned && <ProvenanceCard earned={earned} />}

        {/* O que falta */}
        {result.gaps.length > 0 && (
          <section className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-5 dark:border-amber-800/40 dark:bg-amber-950/20">
            <h2 className="mb-2 font-serif text-base text-amber-900 dark:text-amber-200">
              Próximas etapas ilustrativas
            </h2>
            <ul className="space-y-1.5">
              {result.gaps.map((g, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-[12px] leading-relaxed text-amber-900/90 dark:text-amber-300"
                >
                  <span className="text-amber-500/70" aria-hidden>
                    →
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Nota pública + honestidade */}
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
          <p className="text-xs leading-relaxed text-muted-foreground">Esta demonstração não é certificação, não tem validade pública ou comercial e não deve ser usada para declarar conformidade ou impacto.</p>
        </div>

        {/* Rodapé institucional — só na impressão */}
        <div className="print-only mt-4 border-t border-border pt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Exemplo demonstrativo · não representa dados de cliente.</span>
            <span>Prévia do Selo Empresa Viva · VitalOS</span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground print:hidden">
          O selo compõe a maturidade do{" "}
          <Link to="/ivo" className="underline underline-offset-2 hover:text-foreground">
            IVO
          </Link>
          , a prova dos{" "}
          <Link to="/experimentos" className="underline underline-offset-2 hover:text-foreground">
            Experimentos
          </Link>{" "}
          e a confiança do{" "}
          <Link to="/privacidade" className="underline underline-offset-2 hover:text-foreground">
            Trust Ledger
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

const VERDICT_LABEL: Record<string, string> = {
  comprovado: "Comprovado",
  parcial: "Parcial",
  sem_evidencia: "Sem evidência",
  sem_dados: "Sem dados",
};

/** Proveniência do Domínio B: o selo reconhece evidência, não declaração. */
function ProvenanceCard({ earned }: { earned: EarnedSeal }) {
  const ready = earned.domainBReady;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl border p-5 shadow-sm ${
        ready
          ? "border-emerald-300/60 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20"
          : "border-border/60 bg-muted/30"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-lg text-foreground">Prova de ciclo no exemplo</h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            ready
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-emerald-500" : "bg-muted-foreground/60"}`}
          />
          Resultado simulado: {VERDICT_LABEL[earned.cycleVerdict] ?? "indisponível"}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Este resultado foi calculado com dados demonstrativos disponíveis no aplicativo. Não comprova a execução de intervenções nem efeitos em uma organização real.</p>

      {ready && (
        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Metric label="Intervenções no exemplo" value={String(earned.interventionsWithEffect)} />
          <Metric label="Redução calculada no exemplo" value={`${earned.attributableReductionPts}`} suffix="pts" />
          <Metric
            label="Estimativa ilustrativa de custo anual"
            value={
              earned.avoidedCostYear != null
                ? earned.avoidedCostYear.toLocaleString("pt-BR")
                : "—"
            }
            prefix={earned.avoidedCostYear != null ? "R$" : undefined}
            suffix={earned.avoidedCostYear != null ? "/ano" : undefined}
            highlight
          />
        </dl>
      )}

      <p className="mt-4 border-t border-border/40 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Os indicadores acima ilustram a apresentação visual e não representam evidência, eficácia ou economia comprovadas.
      </p>
    </motion.section>
  );
}

function Metric({
  label,
  value,
  prefix,
  suffix,
  highlight = false,
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-4 py-4 transition-colors ${
        highlight
          ? "border-accent/50 bg-gradient-to-br from-accent/10 via-accent/[0.04] to-transparent shadow-[0_1px_0_0_color-mix(in_oklab,var(--accent)_25%,transparent)]"
          : "border-border/60 bg-card/70"
      }`}
    >
      {highlight && (
        <span
          aria-hidden
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-accent/70"
        />
      )}
      <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd
        className={`mt-1.5 flex items-baseline gap-1 font-serif leading-none tabular-nums ${
          highlight ? "text-accent" : "text-foreground"
        }`}
      >
        {prefix && (
          <span className="text-base font-medium opacity-80">{prefix}</span>
        )}
        <span className="text-3xl sm:text-4xl">{value}</span>
        {suffix && (
          <span className="text-sm font-medium opacity-70">{suffix}</span>
        )}
      </dd>
    </div>
  );
}

function CriterionRow({ criterion }: { criterion: CriterionResult }) {
  const s = STATUS_STYLE[criterion.status]!;
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <span className={`mt-0.5 shrink-0 text-base ${s.color}`} aria-hidden>
        {s.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-card-foreground">{criterion.label}</span>
          {criterion.essential && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              essencial
            </span>
          )}
          <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{criterion.note}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="tabular-nums">{criterion.value}</span> · alvo: {criterion.target}
        </p>
      </div>
    </div>
  );
}

function CriterionGroup({ title, criteria }: { title: string; criteria: CriterionResult[] }) {
  return (
    <section aria-label={title}>
      <h3 className="bg-muted/30 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {criteria.map((criterion) => <CriterionRow key={criterion.id} criterion={criterion} />)}
    </section>
  );
}
