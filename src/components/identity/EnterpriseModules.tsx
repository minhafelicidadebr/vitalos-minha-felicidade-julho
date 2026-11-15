import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  changeModuleFn,
  institutionalModulesFn,
  listPlatformModulesFn,
} from "@/lib/api/module-access.functions";
import { MODULE_MESSAGES, type ModuleState } from "@/lib/identity/module-contract";
import { loadIvoQ2Reading } from "@/lib/api/ivo-q2-reading.functions";
import type { IvoQ2Outcome } from "@/lib/ivo/ivo-views";

function q2Status(outcome: IvoQ2Outcome): string {
  if (!outcome.ok) return outcome.error;
  if (outcome.state === "no_wave") return "Habilitado — configure o primeiro ciclo Q2.";
  if (outcome.view.sectors.some((s) => s.group === "available"))
    return "Resultado publicado disponível. Setores protegidos permanecem indisponíveis.";
  if (
    outcome.view.sectors.some((s) => s.group === "suppressed" || s.group === "pending_publication")
  )
    return "Resultado ainda não publicável. A proteção de privacidade permanece ativa.";
  return outcome.view.wave.status === "collecting"
    ? "Em coleta — ainda sem resultado publicado."
    : "Habilitado — ainda sem resultado disponível.";
}

export function PlatformModules({ accessToken }: { accessToken: string }) {
  const [organizations, setOrganizations] = useState<
    { id: string; name: string; slug: string; modules: ModuleState[] | null }[]
  >([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    requestId: string;
    organizationId: string;
    module: "Q1" | "Q2";
    enabled: boolean;
    expectedRevision: number;
  } | null>(null);
  const load = useCallback(async () => {
    try {
      const result = await listPlatformModulesFn({ data: { accessToken } });
      if (result.ok) {
        setOrganizations(result.organizations);
        setError("");
      } else setError(result.error);
    } catch {
      setError(MODULE_MESSAGES.unavailable);
    }
  }, [accessToken]);
  useEffect(() => {
    void load();
  }, [load]);
  const org = organizations.find((o) => o.id === selected);
  async function save() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const result = await changeModuleFn({ data: { accessToken, ...pending } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPending(null);
      await load();
    } catch {
      setError("Conexão interrompida. Repetir confirmação reutiliza o mesmo pedido.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-4 rounded-2xl border border-border bg-card p-6"
      aria-label="Habilitação empresarial"
    >
      <h2 className="font-serif text-xl">Módulos da empresa</h2>
      <p className="text-sm text-muted-foreground">
        Habilitação independente por empresa. Aprovação metodológica e proteção de resultados
        continuam obrigatórias.
      </p>
      <label className="block text-sm">
        Empresa
        <select
          className="mt-2 w-full rounded-lg border bg-background p-3"
          value={selected}
          disabled={busy || !!pending}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Selecione uma empresa existente</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} · {o.slug} · {o.id}
            </option>
          ))}
        </select>
      </label>
      {org && (
        <div className="space-y-3">
          {org.modules?.map((m) => (
            <div
              key={m.module}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
            >
              <span>
                {m.module === "Q1" ? "Q1 · COPSOQ" : "Q2 · FIB-T"} —{" "}
                {m.enabled ? "Habilitado" : "Não habilitado"} · revisão {m.revision}
              </span>
              <Button
                variant="outline"
                disabled={busy || !!pending}
                onClick={() =>
                  setPending({
                    requestId: crypto.randomUUID(),
                    organizationId: org.id,
                    module: m.module,
                    enabled: !m.enabled,
                    expectedRevision: m.revision,
                  })
                }
              >
                {m.enabled ? "Desabilitar" : "Habilitar"} {m.module}
              </Button>
            </div>
          )) ?? <p role="alert">{MODULE_MESSAGES.unavailable}</p>}
        </div>
      )}
      {pending && (
        <div
          className="space-y-3 rounded-xl border border-primary p-4"
          role="group"
          aria-label="Confirmar alteração"
        >
          <p>
            Confirmar {pending.enabled ? "habilitação" : "desabilitação"} de {pending.module} para{" "}
            {org?.name} ({org?.slug})?
          </p>
          <p className="text-sm text-muted-foreground">
            Desabilitar preserva os registros e bloqueia novas operações e leituras. Habilitar Q1
            mantém o método pendente.
          </p>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? "Salvando…" : "Confirmar alteração"}
          </Button>{" "}
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setPending(null);
              setError("");
              void load();
            }}
          >
            Cancelar e atualizar
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

export function InstitutionalModules() {
  const [modules, setModules] = useState<ModuleState[] | null>(null);
  const [error, setError] = useState("");
  const [q2, setQ2] = useState("Verificando jornada Q2…");
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const { data } = await supabase.auth.getSession();
      const result = await institutionalModulesFn({
        data: { accessToken: data.session?.access_token ?? "" },
      });
      if (request !== sequence.current) return;
      if (result.ok) {
        setModules(result.modules);
        setError("");
        if (result.modules.some((m) => m.module === "Q2" && m.enabled)) {
          setQ2("Verificando jornada Q2…");
          try {
            const outcome = await loadIvoQ2Reading({
              data: { accessToken: data.session?.access_token },
            });
            if (request === sequence.current) setQ2(q2Status(outcome));
          } catch {
            if (request === sequence.current)
              setQ2("Não foi possível consultar a jornada. Atualize para tentar novamente.");
          }
        }
      } else {
        setModules(null);
        setError(result.error);
      }
    } catch {
      if (request !== sequence.current) return;
      setModules(null);
      setError(MODULE_MESSAGES.unavailable);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      sequence.current++;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  return (
    <section className="space-y-3" aria-label="Seus módulos">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl">Jornada da empresa</h2>
        <Button variant="outline" onClick={() => void refresh()}>
          Atualizar habilitação
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!modules && !error && <p role="status">Verificando habilitação…</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {modules?.map((m) => (
          <article key={m.module} className="space-y-3 rounded-2xl border bg-card p-5">
            <h3 className="font-medium">{m.module === "Q1" ? "Q1 · COPSOQ" : "Q2 · FIB-T"}</h3>
            <p className="text-sm text-muted-foreground">
              {!m.enabled
                ? MODULE_MESSAGES.disabled
                : m.module === "Q1"
                  ? MODULE_MESSAGES.method_pending
                  : q2}
            </p>
            {m.enabled && m.module === "Q2" && (
              <Link
                className="inline-flex rounded-xl bg-primary px-4 py-2 text-primary-foreground"
                to="/ivo-integral/q2"
              >
                Abrir jornada Q2
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
