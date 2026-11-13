import { useCallback, useEffect, useRef, useState } from "react";
import { issueFirstAdminFn, listFirstAdminFn, revokeFirstAdminFn } from "@/lib/api/first-admin.functions";
import type { FirstAdminInviteView, FirstAdminOrganization } from "@/lib/identity/first-admin-contract";

function newRequest() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return { requestId: crypto.randomUUID(), token: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("") };
}
const inputClass = "min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const buttonClass = "min-h-11 rounded-md border border-border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
export function FirstAdminInvites({ accessToken }: { accessToken: string }) {
  const [organizations, setOrganizations] = useState<FirstAdminOrganization[]>([]);
  const [invites, setInvites] = useState<FirstAdminInviteView[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const request = useRef<ReturnType<typeof newRequest> | null>(null);
  const load = useCallback(async () => {
    try {
      const result = await listFirstAdminFn({ data: { accessToken } });
      if (!result.ok) { setError(result.message); return; }
      setOrganizations(result.value.organizations); setInvites(result.value.invites);
    } catch { setError("Não foi possível consultar empresas e convites. Tente novamente."); }
  }, [accessToken]);
  useEffect(() => { void load(); }, [load]);
  async function issue(event: React.FormEvent) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    request.current ??= newRequest();
    try {
      const result = await issueFirstAdminFn({ data: { accessToken, organizationId, email, ...request.current } });
      if (!result.ok) { setError(result.message); return; }
      if (result.value.revokedAt || result.value.acceptedAt) { setError("Este pedido já foi encerrado. Confira seu estado antes de iniciar outro."); return; }
      setLink(`${window.location.origin}/aceitar-convite/${request.current.token}`);
      await load();
    } catch { setError("Falha de comunicação. Preserve os dados e tente emitir novamente com o mesmo pedido."); }
    finally { locked.current = false; setBusy(false); }
  }
  async function revoke(inviteId: string) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      const result = await revokeFirstAdminFn({ data: { accessToken, inviteId } });
      if (!result.ok) setError(result.message);
      else { setLink(null); await load(); }
    } catch { setError("Não foi possível confirmar a revogação. Consulte o estado e tente novamente."); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section aria-labelledby="first-admin-title" className="space-y-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
    <h2 id="first-admin-title" className="font-serif text-2xl">Primeiro administrador · empresa existente</h2>
    <p className="text-sm text-muted-foreground">Selecione uma empresa pelo nome e identificador. O convite concede RH_ADMIN somente à identidade destinatária, após autenticação e aceite. Nenhuma empresa será criada.</p>
    <form onSubmit={issue} className="space-y-3">
      <label htmlFor="first-admin-org" className="block text-sm">Empresa de destino</label>
      <select id="first-admin-org" required value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className={inputClass} disabled={busy || !!link}>
        <option value="">Selecione a empresa</option>
        {organizations.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.slug} · {o.id}</option>)}
      </select>
      <label htmlFor="first-admin-email" className="block text-sm">E-mail destinatário do administrador</label>
      <input id="first-admin-email" type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} disabled={busy || !!link} />
      <p className="text-xs text-muted-foreground">Validade de sete dias. Empresa com administrador ou outro convite pendente não recebe nova emissão. Em caso de perda do link, revogue o convite e emita um novo.</p>
      <button className={buttonClass} disabled={busy || !!link}>{busy ? "Processando…" : "Emitir convite de primeiro administrador"}</button>
      <button type="button" className={buttonClass} disabled={busy} onClick={() => { request.current = null; setLink(null); setError(null); }}>Iniciar outro pedido</button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {link && <div role="status" className="space-y-2"><label htmlFor="first-admin-link" className="block text-sm">Link emitido — encaminhe por canal seguro</label><input id="first-admin-link" readOnly value={link} className={inputClass} onFocus={(e) => e.target.select()} /></div>}
    <button type="button" className={buttonClass} disabled={busy} onClick={() => void load()}>Atualizar empresas e convites</button>
    <ul className="space-y-3">{invites.map((i) => <li key={i.id} className="rounded-md border border-border p-3 text-sm">
      <p>{organizations.find((o) => o.id === i.organizationId)?.name ?? i.organizationId} · {i.email} · RH_ADMIN</p>
      <p>{i.acceptedAt ? "Aceito" : i.revokedAt ? "Revogado" : Date.parse(i.expiresAt) <= Date.now() ? "Expirado" : "Pendente"} · convite {i.id}</p>
      {!i.acceptedAt && !i.revokedAt && <button type="button" disabled={busy} className={buttonClass} onClick={() => void revoke(i.id)}>Revogar convite de {i.email}</button>}
    </li>)}</ul>
  </section>;
}
