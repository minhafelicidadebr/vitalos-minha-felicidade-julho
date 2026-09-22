import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BarChart3, LoaderCircle, ShieldAlert } from "lucide-react";
import { FibtManagerControlCenter } from "@/components/fibt/FibtManagerControlCenter";
import { loadFibtManagerControlCenter } from "@/lib/api/fibt-manager-control-center.functions";
import type { FibtManagerSnapshot } from "@/lib/fibt/fibt-manager-control-center.server";
import { requiresFibtCampaignSelection } from "@/lib/fibt/fibt-manager-route";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import { supabase } from "@/integrations/supabase/client";
import { FIBT_PILOT_DISABLED_REASON, isFibtPilotEnabled } from "@/lib/fibt/fibt-pilot-flag";

export const Route = createFileRoute("/fibt-piloto")({
  head: () => ({ meta: [{ title: "FIB-T - Centro de controle do piloto" }] }),
  component: FibtPilotoPage,
});

type PageState =
  | { state: "loading" }
  | { state: "missing_campaign" }
  | { state: "denied"; message: string }
  | { state: "unavailable"; message: string }
  | { state: "error"; message: string }
  | { state: "ready"; snapshot: FibtManagerSnapshot };

/**
 * Categoria devolvida pelo servidor → estado de tela. Acesso negado e
 * indisponibilidade de configuração NÃO são falha técnica: tratá-los como
 * "erro" fazia o operador procurar um problema de infraestrutura que não
 * existia (macro-onda 10.2-B, etapa 5).
 */
function stateForCategory(category: string | undefined, message: string): PageState {
  switch (category) {
    case "authorization":
    case "hml_boundary":
      return { state: "denied", message };
    case "feature_gate":
      return { state: "unavailable", message };
    default:
      return { state: "error", message };
  }
}

async function currentAccessToken(): Promise<string | undefined> {
  if (!isCloudReady()) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export function EstadoDesabilitado() {
  return (
    <div
      role="note"
      data-testid="piloto-desabilitado"
      className="mx-auto max-w-2xl px-4 py-12 sm:px-6"
    >
      <div className="rounded-lg border border-border bg-muted/40 p-5">
        <p className="text-sm font-semibold text-foreground">Piloto indisponível neste ambiente</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {FIBT_PILOT_DISABLED_REASON}
        </p>
      </div>
    </div>
  );
}

export function EstadoCarregando() {
  return (
    <div
      className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center px-4"
      role="status"
    >
      <div className="text-center">
        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">
          Carregando campanha, setores e leitura protegida...
        </p>
      </div>
    </div>
  );
}

export function EstadoVazio() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
      <BarChart3 className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium text-foreground">
        Selecione uma onda FIB-T no painel administrativo
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        O identificador da campanha não foi informado.
      </p>
      <a
        href="/admin"
        className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
      >
        Voltar para campanhas
      </a>
    </div>
  );
}

export function EstadoErro({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              Não foi possível abrir o centro de controle
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Nenhum dado de demonstração substituiu a leitura real.
            </p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 min-h-11 rounded-md border border-border px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Acesso negado NÃO é falha técnica. Sem `role="alert"` e sem cor destrutiva:
 * a tela informa uma decisão de autorização, não um defeito. Também não
 * oferece "tentar novamente" — repetir a mesma requisição não muda a decisão.
 */
export function EstadoAcessoNegado({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6" data-testid="piloto-acesso-negado">
      <div className="rounded-lg border border-border bg-muted/40 p-5" role="note">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">Acesso não autorizado</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Nada foi lido do banco: a recusa acontece antes de qualquer consulta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Configuração ausente (gate de piloto) — indisponibilidade, não erro. */
export function EstadoIndisponivel({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6" data-testid="piloto-indisponivel">
      <div className="rounded-lg border border-border bg-muted/40 p-5" role="note">
        <p className="text-sm font-semibold text-foreground">
          Centro de controle indisponível neste ambiente
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function FibtPilotoPage() {
  const enabled = isFibtPilotEnabled();
  const hmlEnabled = import.meta.env.VITE_FIBT_HML_ENABLED;
  const [pageState, setPageState] = useState<PageState>({ state: "loading" });
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [reloading, setReloading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setReloading(true);
    try {
      const token = await currentAccessToken();
      const waveId = new URLSearchParams(window.location.search).get("wave") ?? undefined;
      setAccessToken(token);

      // No app comum o admin escolhe a onda. No deployment HML, a ServerFn
      // ignora seleção aberta e resolve a campanha sintética canônica.
      if (requiresFibtCampaignSelection(hmlEnabled, waveId)) {
        setPageState({ state: "missing_campaign" });
        return;
      }

      const result = await loadFibtManagerControlCenter({
        data: { accessToken: token, waveId },
      });
      if (!result.ok) {
        setPageState(
          stateForCategory((result as { category?: string }).category, result.error),
        );
        return;
      }
      setPageState({ state: "ready", snapshot: result.snapshot });
    } catch {
      setPageState({ state: "error", message: "Falha de comunicação com o backend protegido." });
    } finally {
      setReloading(false);
    }
  }, [enabled, hmlEnabled]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  return (
    <main className="min-h-screen bg-background">
      {!enabled && <EstadoDesabilitado />}
      {enabled && pageState.state === "loading" && <EstadoCarregando />}
      {enabled && pageState.state === "missing_campaign" && <EstadoVazio />}
      {enabled && pageState.state === "denied" && (
        <EstadoAcessoNegado message={pageState.message} />
      )}
      {enabled && pageState.state === "unavailable" && (
        <EstadoIndisponivel message={pageState.message} />
      )}
      {enabled && pageState.state === "error" && (
        <EstadoErro message={pageState.message} onRetry={() => void load()} />
      )}
      {enabled && pageState.state === "ready" && (
        <FibtManagerControlCenter
          snapshot={pageState.snapshot}
          accessToken={accessToken}
          onReload={load}
          reloading={reloading}
        />
      )}
    </main>
  );
}
