import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/app/shell/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useA11y } from "@/app/shell/A11yProvider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SEMANTIC_COLORS, SPACING_SCALE, RADII } from "@/design-system/tokens";
import { Inbox, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: [
      { title: "Design System · 4 Lentes VITA" },
      {
        name: "description",
        content:
          "Demonstração dos tokens, tipografia, componentes e estados do design system 4 Lentes VITA.",
      },
    ],
  }),
  component: DesignSystemPage,
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border/60 py-12 first:border-t-0 first:pt-0">
      <div className="mb-6">
        <h2 className="font-serif text-2xl tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function DesignSystemPage() {
  const a11y = useA11y();

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Fundação · Design System
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-foreground">
            4 Lentes VITA — Tokens & Componentes
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Premium corporativo humano. Verde profundo institucional, dourado de acento, superfície
            clara quente. Nada de neon, nada de infantilização.
          </p>
        </header>

        <Section
          title="Cores semânticas"
          description="Todas as cores são tokens em oklch. Componentes referenciam o token, nunca o hex."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SEMANTIC_COLORS.map((c) => (
              <div
                key={c.token}
                className="overflow-hidden rounded-lg border border-border/70 bg-card"
              >
                <div
                  className="h-16 w-full"
                  style={{ backgroundColor: `var(--color-${c.token})` }}
                  aria-hidden
                />
                <div className="p-3">
                  <p className="font-mono text-xs text-foreground">--color-{c.token}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Tipografia"
          description="Serif humanista para títulos, sans neutra para corpo. Base 16px, escalável via A11y."
        >
          <div className="space-y-4 rounded-lg border border-border/70 bg-card p-6">
            <p className="font-serif text-5xl tracking-tight text-foreground">
              Vitalidade que se mede.
            </p>
            <p className="font-serif text-3xl text-foreground">Cabeçalho secundário</p>
            <p className="font-serif text-xl text-foreground">Cabeçalho terciário</p>
            <p className="max-w-2xl text-base leading-relaxed text-foreground">
              Corpo de texto em sans-serif neutra, otimizado para leitura prolongada em painéis
              executivos. Use{" "}
              <span className="text-muted-foreground">cor secundária</span> para metadados.
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              const code = "estilo monoespaçado para identificadores técnicos";
            </p>
          </div>
        </Section>

        <Section title="Espaçamento" description="Escala consistente baseada em múltiplos de 4px.">
          <div className="flex flex-wrap items-end gap-4">
            {SPACING_SCALE.map((n) => (
              <div key={n} className="flex flex-col items-center gap-2">
                <div
                  className="rounded bg-primary"
                  style={{ width: `${n * 4}px`, height: `${n * 4}px` }}
                  aria-hidden
                />
                <span className="font-mono text-xs text-muted-foreground">{n * 4}px</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Raios" description="Curvatura consistente em todos os componentes.">
          <div className="flex flex-wrap gap-3">
            {RADII.map((r) => (
              <div
                key={r}
                className={`grid h-20 w-20 place-items-center border border-border/70 bg-card text-xs text-muted-foreground rounded-${r}`}
              >
                {r}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Botões" description="Variantes padrão do shadcn aplicadas ao tema VITA.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Desabilitado</Button>
          </div>
        </Section>

        <Section title="Cards e Badges">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Painel institucional</CardTitle>
                <CardDescription>
                  Card base com cabeçalho serif e corpo em sans neutra.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge>Ativo</Badge>
                <Badge variant="secondary">Em revisão</Badge>
                <Badge variant="outline">Rascunho</Badge>
                <Badge variant="destructive">Risco</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Indicador composto</CardTitle>
                <CardDescription>
                  Use a paleta cromática para hierarquia, nunca como único sinal de estado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-4xl text-primary">82</span>
                  <span className="text-sm text-muted-foreground">/ 100 · Vitalidade</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Estados">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vazio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border/80 p-8 text-center">
                  <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Carregando</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Erro</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                  <AlertTitle>Falha ao carregar</AlertTitle>
                  <AlertDescription>
                    Não foi possível buscar os dados. Tente novamente.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          title="Acessibilidade"
          description="Controles do A11yProvider — persistem em localStorage."
        >
          <div className="grid gap-4 rounded-lg border border-border/70 bg-card p-6 md:grid-cols-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="reduce-motion" className="text-sm">
                Reduzir movimento
              </Label>
              <Switch
                id="reduce-motion"
                checked={a11y.reduceMotion}
                onCheckedChange={a11y.setReduceMotion}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="high-contrast" className="text-sm">
                Alto contraste
              </Label>
              <Switch
                id="high-contrast"
                checked={a11y.highContrast}
                onCheckedChange={a11y.setHighContrast}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="font-scale" className="text-sm">
                Escala de fonte
              </Label>
              <select
                id="font-scale"
                value={a11y.fontScale}
                onChange={(e) => a11y.setFontScale(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value={0.875}>87,5%</option>
                <option value={1}>100%</option>
                <option value={1.125}>112,5%</option>
                <option value={1.25}>125%</option>
              </select>
            </div>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
