import { useState, type FormEvent } from "react";
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
    <form className="space-y-3" onSubmit={handleSubmit} noValidate>
      <div>
        <Label htmlFor="demo-gate-pwd" className="text-xs text-muted-foreground">
          Senha de acesso
        </Label>
        <Input
          id="demo-gate-pwd"
          type="password"
          autoFocus
          autoComplete="off"
          placeholder="Digite a senha do demo"
          value={value}
          aria-invalid={error}
          aria-describedby={error ? "demo-gate-error" : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(false);
          }}
          className="mt-1"
        />
        {error && (
          <p id="demo-gate-error" role="alert" className="mt-1.5 text-xs text-destructive">
            Senha incorreta. Tente novamente.
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full">
        Entrar na demonstração
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Acesso restrito à demonstração. Os dados exibidos são fictícios e agregados (n ≥ 5).
      </p>
    </form>
  );
}

/**
 * Tela cheia do portão — renderizada pelo AppShell quando o demo está travado.
 * É a fronteira sagrada entre a landing pública (/) e o app navegável (/painel…).
 */
export function DemoGateScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_14%,transparent)_0%,transparent_70%)]"
      />
      <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card p-6 shadow-lg sm:p-8">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-md bg-primary font-serif text-lg text-primary-foreground shadow-sm"
          >
            4
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-base tracking-tight">4 Lentes VITA™</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Demonstração protegida
            </span>
          </span>
        </div>

        <h1 className="mt-6 font-serif text-2xl text-foreground">Acesso à demonstração</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Esta área é o app navegável do VitalOS. Informe a senha de acesso para explorar a
          demonstração com dados fictícios.
        </p>

        <div className="mt-6">
          <DemoGateForm />
        </div>

        <div className="mt-6 border-t border-border/50 pt-4 text-center">
          <a href="/" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            ← Voltar à página inicial
          </a>
        </div>
      </div>
    </div>
  );
}
