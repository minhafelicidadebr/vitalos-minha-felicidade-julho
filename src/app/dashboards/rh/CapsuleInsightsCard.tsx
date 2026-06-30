// Painel de insights reais — exibe dados da wave_capsule quando n≥5.
// Sem dados: estado de espera elegante. Nunca exibe resposta individual.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Users, TrendingDown, TrendingUp, AlertTriangle, Minus } from "lucide-react";
import { loadLatestOrgCapsule, type LatestCapsuleResult } from "@/lib/api/capsule-report.functions";

// UUID fixo de demo — em produção vem do perfil autenticado
const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

const SCALE_MAX = 5;

// Rótulos COPSOQ em português
const PILLAR_LABELS: Record<string, string> = {
  demands_quant: "Exigências Quantitativas",
  work_pace: "Ritmo de Trabalho",
  demands_emotional: "Exigências Emocionais",
  influence: "Influência no Trabalho",
  meaning: "Sentido do Trabalho",
  predictability: "Previsibilidade",
  role_clarity: "Clareza de Papel",
  leadership_quality: "Qualidade da Liderança",
  social_support: "Apoio Social",
  recognition: "Reconhecimento",
  community: "Comunidade Social",
  insecurity: "Insegurança no Emprego",
  burnout: "Burnout",
  offensive_behaviors: "Comportamentos Ofensivos",
};

function riskColor(highRiskPct: number): {
  bar: string; text: string; badge: string; icon: React.ElementType;
} {
  if (highRiskPct < 20)
    return {
      bar: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      icon: TrendingUp,
    };
  if (highRiskPct < 40)
    return {
      bar: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      icon: Minus,
    };
  if (highRiskPct < 60)
    return {
      bar: "bg-orange-500",
      text: "text-orange-700 dark:text-orange-300",
      badge: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
      icon: AlertTriangle,
    };
  return {
    bar: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
    badge: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    icon: TrendingDown,
  };
}

export function CapsuleInsightsCard() {
  const [capsule, setCapsule] = useState<LatestCapsuleResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadLatestOrgCapsule({ data: { orgId: DEMO_ORG_ID } })
      .then((r) => active && setCapsule(r))
      .catch(() => active && setCapsule({ found: false, reason: "error" }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <p className="animate-pulse text-sm text-muted-foreground">
          Verificando dados reais…
        </p>
      </div>
    );
  }

  if (!capsule || !capsule.found) {
    return <NoCapsuleState />;
  }

  const dimEntries = Object.entries(capsule.dimensions);
  const outcomeEntries = capsule.outcomes ? Object.entries(capsule.outcomes) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-primary/25 bg-card p-6 shadow-sm"
    >
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-card-foreground">
            Resultados Reais · {capsule.instrument}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {capsule.participantCount} respondentes
            </span>
            <span className="text-xs text-muted-foreground">
              · Encerrado em {new Date(capsule.closedOn).toLocaleDateString("pt-BR")}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
              K-anon n≥5 ✓
            </span>
          </div>
        </div>
      </div>

      {/* Dimensões de exposição */}
      {dimEntries.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Dimensões psicossociais (COPSOQ II)
          </p>
          <div className="space-y-3">
            {dimEntries
              .sort((a, b) => b[1].high_risk_pct - a[1].high_risk_pct)
              .map(([pillarId, dim]) => (
                <DimensionBar key={pillarId} pillarId={pillarId} dim={dim} />
              ))}
          </div>
        </div>
      )}

      {/* Desfechos Domínio B */}
      {outcomeEntries.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Desfechos · Domínio B (NR-1)
          </p>
          <div className="space-y-3">
            {outcomeEntries.map(([pillarId, dim]) => (
              <DimensionBar key={pillarId} pillarId={pillarId} dim={dim} isOutcome />
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-[10px] leading-relaxed text-muted-foreground">
        Resultados educativos — não substituem avaliação por profissional habilitado (NR-1).
        Médias calculadas após reversão COPSOQ: valores mais altos = menor exposição.
      </p>
    </motion.div>
  );
}

// ─── Barra de dimensão ───────────────────────────────────────────────────────

interface DimData {
  mean: number;
  high_risk_pct: number;
  n: number;
}

function DimensionBar({
  pillarId,
  dim,
  isOutcome = false,
}: {
  pillarId: string;
  dim: DimData;
  isOutcome?: boolean;
}) {
  const label = PILLAR_LABELS[pillarId] ?? pillarId;
  const pctBar = Math.min(100, Math.round((dim.mean / SCALE_MAX) * 100));
  const colors = riskColor(dim.high_risk_pct);
  const Icon = colors.icon;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className={`h-3 w-3 shrink-0 ${colors.text}`} aria-hidden />
          <span className="truncate text-xs text-foreground">{label}</span>
          {isOutcome && (
            <span className="shrink-0 rounded-full border border-border/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">
              desfecho
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs tabular-nums text-foreground">
            {dim.mean.toFixed(1)}
            <span className="text-muted-foreground">/{SCALE_MAX}</span>
          </span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${colors.badge}`}>
            {dim.high_risk_pct}% risco
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
          style={{ width: `${pctBar}%` }}
        />
      </div>
    </div>
  );
}

// ─── Estado sem capsule ───────────────────────────────────────────────────────

function NoCapsuleState() {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Aguardando respostas reais</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Os resultados aparecem aqui automaticamente quando 5+ colaboradores responderem.
          </p>
        </div>
      </div>
    </div>
  );
}
