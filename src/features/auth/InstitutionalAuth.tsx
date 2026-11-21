import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import { Button } from "@/components/ui/button";
import { withAuthDeadline, type AuthDestination } from "@/lib/auth/auth-recovery";

export function InstitutionalAuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8 text-foreground sm:py-14">
      <div className="w-full min-w-0 max-w-lg space-y-6">
        <a
          href="/"
          aria-label="VitalOS — página inicial"
          className="inline-flex min-h-11 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <VitalOSBrand size="md" />
        </a>
        <section className="min-w-0 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
          {children}
        </section>
        <a
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Voltar ao início
        </a>
      </div>
    </main>
  );
}

export function MagicLinkForm({ sendLink }: { sendLink: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const submitting = useRef(false);
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const error = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (status === "sent") heading.current?.focus();
    if (status === "error") error.current?.focus();
  }, [status]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || !email.trim()) return;
    submitting.current = true;
    setStatus("sending");
    try {
      await withAuthDeadline(sendLink(email.trim()));
      if (mounted.current) setStatus("sent");
    } catch {
      if (mounted.current) setStatus("error");
    } finally {
      submitting.current = false;
    }
  }
  return (
    <>
      <div className="mb-6 space-y-3">
        <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
          <Building2 className="size-4" aria-hidden="true" /> Acesso institucional
        </span>
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Entrar com link mágico</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Use seu e-mail corporativo para continuar no ambiente da sua organização. Sem senha.
        </p>
      </div>
      {status === "sent" ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <CheckCircle2 className="mb-3 size-6 text-primary" aria-hidden="true" />
            <h2
              ref={heading}
              tabIndex={-1}
              className="rounded font-serif text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Verifique seu e-mail
            </h2>
            <p role="status" className="mt-2 break-words text-sm leading-relaxed">
              Se o acesso estiver disponível para <strong>{email.trim()}</strong>, você receberá um
              link para continuar.
            </p>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Abra a mensagem neste navegador e dispositivo.</li>
            <li>Confira também spam e lixo eletrônico.</li>
            <li>Se o link expirou ou já foi usado, solicite outro abaixo.</li>
          </ol>
          <Button
            type="button"
            className="h-auto min-h-11 w-full whitespace-normal"
            onClick={() => {
              setStatus("idle");
              requestAnimationFrame(() => input.current?.focus());
            }}
          >
            Usar outro e-mail ou solicitar novo link
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="institutional-email" className="text-sm font-medium">
              E-mail corporativo
            </label>
            <div className="relative mt-2">
              <Mail
                className="pointer-events-none absolute left-3 top-4 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                ref={input}
                id="institutional-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={status === "sending"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                aria-describedby="access-help"
                className="h-12 w-full min-w-0 rounded-xl border border-input bg-background pl-10 pr-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
            </div>
            <p id="access-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
              O vínculo e as permissões da sua conta determinam o acesso. A demonstração é um
              ambiente separado.
            </p>
          </div>
          {status === "error" && (
            <p
              ref={error}
              role="alert"
              tabIndex={-1}
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Não conseguimos confirmar o envio. Verifique sua caixa de entrada antes de tentar
              novamente. Se necessário, confira o e-mail e sua conexão.
            </p>
          )}
          <Button
            type="submit"
            disabled={status === "sending"}
            aria-busy={status === "sending"}
            className="h-auto min-h-12 w-full gap-2 whitespace-normal py-3"
          >
            {status === "sending" ? "Enviando…" : "Entrar com link mágico"}
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Button>
        </form>
      )}
      <div className="mt-6 flex items-start gap-2 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Não compartilhe o link de acesso. Consulte os{" "}
          <a
            href="/privacidade"
            className="rounded underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            termos de privacidade
          </a>
          .
        </p>
      </div>
    </>
  );
}

export function AuthCallbackStatus({
  result,
  retry,
  returnHref,
}: {
  result: AuthDestination | null;
  retry: () => void;
  returnHref: string;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (result && result.kind !== "ready") title.current?.focus();
  }, [result]);
  const invalid = result?.kind === "invalid_link";
  const failed = result !== null && result.kind !== "ready";
  return (
    <div className="space-y-5">
      <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
        <ShieldCheck className="size-4" aria-hidden="true" /> Acesso institucional
      </span>
      <h1
        ref={title}
        tabIndex={-1}
        className="rounded font-serif text-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {failed
          ? invalid
            ? "Solicite um novo link"
            : "Vamos recuperar seu acesso"
          : "Validando seu acesso…"}
      </h1>
      <p
        role={failed ? "alert" : "status"}
        className="text-sm leading-relaxed text-muted-foreground"
      >
        {failed
          ? invalid
            ? "O link pode ter expirado, já ter sido usado ou estar incompleto. Solicite outro e abra a mensagem mais recente neste navegador."
            : "Não conseguimos confirmar sua sessão ou carregar seu perfil. Isso não altera seu vínculo com a organização. Tente novamente."
          : "Aguarde enquanto verificamos sua sessão. Suas permissões serão conferidas no ambiente de destino."}
      </p>
      {failed &&
        (invalid ? (
          <Button asChild className="h-auto min-h-11 w-full whitespace-normal">
            <a href={returnHref}>Solicitar novo link</a>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={retry}
            className="h-auto min-h-11 w-full whitespace-normal"
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Tentar novamente
          </Button>
        ))}
    </div>
  );
}
