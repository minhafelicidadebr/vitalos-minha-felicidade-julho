import { useId, useState, type FormEvent } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDemoGate } from "./demo-gate";

/**
 * Formulário do portão de demonstração — núcleo reutilizável (tela cheia no AppShell
 * e dentro do modal da landing). Acessível: label, aria-invalid, mensagem de erro
 * com role="alert", foco automático no campo.
 */
export function DemoGateForm({ onUnlocked }: { onUnlocked?: () => void }) {
  const unlock = useDemoGate((s) => s.unlock);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = unlock(value);
    if (ok) {
      setError(false);
      onUnlocked?.();
    } else {
      setError(true);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div>
        <Label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
          Senha de acesso
        </Label>
        <div className="relative mt-1.5">
          <Input
            id={inputId}
            type={showPassword ? "text" : "password"}
            autoFocus
            autoComplete="current-password"
            placeholder="Digite a senha do demo"
            value={value}
            aria-invalid={error}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(false);
            }}
            className="h-11 rounded-xl bg-background/70 pr-11 shadow-inner"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs text-destructive">
            Senha incorreta. Tente novamente.
          </p>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full rounded-xl shadow-lg shadow-primary/15"
      >
        Entrar na demonstração
      </Button>
      <p className="flex items-start justify-center gap-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span>
          Acesso restrito à demonstração. Os dados exibidos são fictícios e agregados (n ≥ 5).
        </span>
      </p>
    </form>
  );
}

function DemoBrandMark() {
  return (
    <span
      aria-hidden
      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-inset ring-white/10"
    >
      <svg viewBox="0 0 40 40" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
        <g fill="currentColor" opacity="0.92">
          <ellipse cx="20" cy="9" rx="4" ry="7" />
          <ellipse cx="20" cy="31" rx="4" ry="7" />
          <ellipse cx="9" cy="20" rx="7" ry="4" />
          <ellipse cx="31" cy="20" rx="7" ry="4" />
        </g>
        <circle cx="20" cy="20" r="4" fill="var(--color-accent)" />
      </svg>
    </span>
  );
}

/**
 * Tela cheia do portão — renderizada pelo AppShell quando o demo está travado.
 * É a fronteira sagrada entre a landing pública (/) e o app navegável (/painel…).
 */
export function DemoGateScreen() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-institutional-deep px-4 py-10 text-foreground sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,color-mix(in_oklab,var(--color-institutional-gold)_18%,transparent)_0%,transparent_34%),radial-gradient(circle_at_90%_86%,color-mix(in_oklab,var(--color-primary)_35%,transparent)_0%,transparent_38%),linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:auto,auto,72px_72px,72px_72px]"
      />
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/12 bg-card shadow-2xl shadow-black/35 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_82%_88%,color-mix(in_oklab,var(--color-institutional-gold)_22%,transparent),transparent_40%),linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,52px_52px,52px_52px]"
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <DemoBrandMark />
              <span className="flex flex-col leading-tight">
                <span className="font-serif text-lg tracking-tight">Programa VitalOS™</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/65">
                  Demonstração navegável
                </span>
              </span>
            </div>
            <p className="mt-16 text-[10px] font-semibold uppercase tracking-[0.22em] text-institutional-gold">
              Do diagnóstico à evidência
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-[1.06] tracking-tight">
              Veja o sistema operando, não apenas o dashboard.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-primary-foreground/72">
              Explore o ciclo integrado de mensuração, aprendizagem, transformação e comprovação com
              dados demonstrativos.
            </p>
          </div>

          <ul className="relative mt-10 grid gap-2 text-xs text-primary-foreground/75">
            {["Dados agregados", "k-anonimato ≥ 5", "Jornada da Matriz IFT completa"].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-institutional-gold" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <main className="p-6 sm:p-10 lg:p-12">
          <div className="flex items-center gap-3 lg:hidden">
            <DemoBrandMark />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-serif text-base tracking-tight">
                Programa VitalOS™
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Demonstração protegida
              </span>
            </span>
          </div>

          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary lg:mt-0">
            Ambiente de demonstração
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-foreground">
            Acesse o VitalOS™
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Informe a senha para explorar o produto com dados fictícios, agregados e preparados para
            demonstrar o ciclo completo.
          </p>

          <div className="mt-8">
            <DemoGateForm />
          </div>

          <div className="mt-8 border-t border-border/60 pt-5 text-center">
            <a
              href="/"
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Voltar à página inicial
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
