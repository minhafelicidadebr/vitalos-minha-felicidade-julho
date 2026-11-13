import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { acceptFirstAdminFn, inspectFirstAdminFn } from "@/lib/api/first-admin.functions";

type Preview = Awaited<ReturnType<typeof inspectFirstAdminFn>>;
export function FirstAdminAcceptance({ token }: { token: string }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    setPreview(null); setError(null);
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const result = await inspectFirstAdminFn({ data: { accessToken: data.session?.access_token ?? "", token } });
        if (active) setPreview(result);
      } catch { if (active) setError("Falha ao verificar o convite. Tente novamente."); }
    })();
    return () => { active = false; };
  }, [token, attempt]);
  async function accept() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const result = await acceptFirstAdminFn({ data: { accessToken: data.session?.access_token ?? "", token } });
      if (!result.ok) { setError(result.message); return; }
      // RH_ADMIN tem painel institucional em /rh; /painel é a vitrine legada.
      window.location.assign("/rh");
    } catch { setError("Não foi possível confirmar o aceite. Tente novamente; o mesmo convite não duplica seu vínculo."); }
    finally { lock.current = false; setBusy(false); }
  }
  const button = "min-h-11 rounded-md border border-border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
  async function switchAccount() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) { setError("Não foi possível sair da conta. Tente novamente."); return; }
      window.location.assign(`/entrar?redirect=${encodeURIComponent(`/aceitar-convite/${token}`)}`);
    } catch { setError("Não foi possível trocar de conta. Tente novamente."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10"><section aria-labelledby="first-admin-accept-title" className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
    <p className="text-xs text-muted-foreground">VitalOS · Instituto Felicidade para Todos</p>
    <h1 id="first-admin-accept-title" className="font-serif text-2xl">Acesso institucional · primeiro administrador</h1>
    {!preview && !error && <p role="status">Verificando identidade e convite…</p>}
    {preview?.ok && <>
      <p>Empresa: <strong>{preview.value.organization?.name}</strong> · {preview.value.organization?.slug}</p>
      <p className="break-all text-xs text-muted-foreground">Identificador: {preview.value.invite.organizationId}</p>
      <p>Conta autenticada: {preview.value.identity}</p><p>Papel autorizado: RH_ADMIN</p>
      <p className="text-sm text-muted-foreground">Você administrará somente esta organização. Um vínculo existente com outra empresa ou papel será preservado e impedirá o aceite.</p>
      <button type="button" className={button} disabled={busy} onClick={() => void accept()}>{busy ? "Confirmando…" : preview.value.invite.acceptedAt ? "Acessar organização" : "Aceitar convite e acessar organização"}</button>
    </>}
    {preview && !preview.ok && <p role="alert">{preview.message}</p>}
    {error && <p role="alert">{error}</p>}
    <button type="button" className={button} disabled={busy} onClick={() => setAttempt((a) => a + 1)}>Verificar novamente</button>
    <button type="button" className={button} disabled={busy} onClick={() => void switchAccount()}>Entrar com outra conta</button>
  </section></main>;
}
