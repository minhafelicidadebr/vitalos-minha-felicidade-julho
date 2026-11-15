import { AlertTriangle, LoaderCircle, LogIn, ShieldAlert } from "lucide-react";

import type { IvoFailureCategory } from "@/lib/ivo/ivo-views";

export type { IvoFailureCategory };

/** Carregamento: `role="status"` para leitores de tela anunciarem a espera. */
export function IvoLoading({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

/**
 * Estado não pronto da leitura organizacional. Recusa de autorização NÃO é
 * erro técnico: tom neutro, sem "tentar novamente". Falha técnica sim:
 * `role="alert"` e ação de repetir. Nenhum estado mostra dado substituto.
 */
export function IvoAccessNotice({
  category,
  message,
  redirectTo,
  onRetry,
}: {
  category: IvoFailureCategory;
  message: string;
  redirectTo: string;
  onRetry?: () => void;
}) {
  if (category === "backend") {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium text-destructive">Não foi possível carregar a leitura</p>
            <p className="mt-1 text-muted-foreground">{message}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 min-h-11 rounded-md border border-border px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Tentar novamente
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (category === "unauthenticated") {
    return (
      <div role="note" className="rounded-md border border-border bg-muted/30 p-4 text-sm">
        <div className="flex items-start gap-3">
          <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-medium text-foreground">Leitura da organização disponível após entrar</p>
            <p className="mt-1 text-muted-foreground">{message}</p>
            <a
              href={`/entrar?redirect=${encodeURIComponent(redirectTo)}`}
              className="mt-3 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Entrar
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="note" className="rounded-md border border-border bg-muted/30 p-4 text-sm">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-medium text-foreground">
            {category === "module_disabled" ? "Módulo indisponível para esta empresa" : category === "forbidden" ? "Acesso não autorizado" : "Leitura indisponível neste ambiente"}
          </p>
          <p className="mt-1 text-muted-foreground">{message}</p>
          <p className="mt-2 text-xs text-muted-foreground">Nenhum dado de demonstração substitui a leitura real.</p>
        </div>
      </div>
    </div>
  );
}
