import { Database, FlaskConical, GitMerge, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fronteira Demo/Real como componente, não como confiança implícita
 * (PLANO_ELEVACAO_180_VITALOS_2026-07-13.md, Onda 1). Toda tela deve deixar
 * claro de onde vem o dado que está mostrando — a diferenciação NUNCA depende
 * só de cor (WCAG 1.4.1): ícone + rótulo + estilo de borda mudam juntos.
 */
export type DataSourceKind = "real" | "auditavel" | "demo" | "proxy" | "mock";

const DATA_SOURCE_META: Record<
  DataSourceKind,
  { label: string; description: string; icon: typeof Database; className: string }
> = {
  real: {
    label: "Dado real",
    description: "Vem do banco de produção deste tenant, com RLS aplicada.",
    icon: Database,
    className: "border-primary/35 text-primary",
  },
  auditavel: {
    label: "Rastreável",
    description:
      "Dado real com trilha de auditoria completa — origem, linhagem e responsável verificáveis.",
    icon: ShieldCheck,
    className: "border-primary/35 text-primary",
  },
  demo: {
    label: "Demonstração",
    description: "Dados fictícios e agregados, preparados para navegar o produto sem um tenant real.",
    icon: Sparkles,
    className: "border-muted-foreground/30 text-muted-foreground",
  },
  proxy: {
    label: "Fonte combinada",
    description: "Parte desta tela usa dado real e parte ainda usa exemplo — em transição.",
    icon: GitMerge,
    className: "border-institutional-gold/45 text-foreground border-dashed",
  },
  mock: {
    label: "Dado de exemplo",
    description:
      "Conteúdo fixo no código (mock), não vem de nenhum banco. Ainda não substituído por dado real.",
    icon: FlaskConical,
    className: "border-institutional-gold/45 text-foreground border-dashed",
  },
};

export function DataSourceBadge({
  source,
  className,
}: {
  source: DataSourceKind;
  className?: string;
}) {
  const meta = DATA_SOURCE_META[source];
  const Icon = meta.icon;
  return (
    <span
      role="status"
      title={meta.description}
      aria-label={`Origem dos dados: ${meta.label}. ${meta.description}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-[11px] font-medium leading-none",
        meta.className,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}
