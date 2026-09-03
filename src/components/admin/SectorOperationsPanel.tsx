import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Copy,
  Link2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import {
  adminCreateWaveSector,
  adminIssueWaveSectorLink,
  adminListWaveSectorOperations,
  adminRevokeWaveSectorLink,
} from "@/lib/api/sector-operations.functions";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSectorKey, type SectorLinkState } from "@/lib/survey/sector-operations";
import { isFibtPilotEnabled } from "@/lib/fibt/fibt-pilot-flag";

interface LinkSummary {
  id: string;
  state: SectorLinkState;
  expiresAt: string;
  createdAt: string;
}

interface SectorSummary {
  cohortId: string;
  key: string;
  label: string;
  reportable: boolean;
  responseCountLabel: string;
  links: LinkSummary[];
}

interface UnboundLinkSummary extends LinkSummary {
  sectorKey: string;
}

interface SectorOperationsPanelProps {
  waveId: string;
  instrument: string;
  status: string;
  pilotEnabled?: boolean;
}

async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const LINK_STATE_LABEL: Record<SectorLinkState, string> = {
  active: "Ativo",
  expired: "Expirado",
  revoked: "Revogado",
};

export function SectorOperationsPanel({
  waveId,
  instrument,
  status,
  pilotEnabled = isFibtPilotEnabled(),
}: SectorOperationsPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [unboundLinks, setUnboundLinks] = useState<UnboundLinkSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [sectorLabel, setSectorLabel] = useState("");
  const [creatingSector, setCreatingSector] = useState(false);
  const [issuingKey, setIssuingKey] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [oneTimeLink, setOneTimeLink] = useState<{ key: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const collecting = status === "collecting";
  const sectorKeyPreview = normalizeSectorKey(sectorLabel);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = await accessToken();
      if (!token) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await adminListWaveSectorOperations({
        data: { accessToken: token, waveId },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSectors(result.sectors as SectorSummary[]);
      setUnboundLinks(result.unboundLinks as UnboundLinkSummary[]);
      setLoaded(true);
    } catch {
      setError("Não foi possível carregar os setores.");
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) await load();
  }

  async function createSector() {
    if (!sectorKeyPreview || creatingSector) return;
    setCreatingSector(true);
    setError(null);
    try {
      const token = await accessToken();
      if (!token) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await adminCreateWaveSector({
        data: {
          accessToken: token,
          waveId,
          key: sectorKeyPreview,
          label: sectorLabel.trim(),
        },
      });
      if (!result.created) {
        setError(result.error);
        return;
      }
      setSectorLabel("");
      setShowCreate(false);
      await load();
    } catch {
      setError("Não foi possível cadastrar o setor.");
    } finally {
      setCreatingSector(false);
    }
  }

  async function issueLink(cohortKey: string) {
    if (issuingKey) return;
    setIssuingKey(cohortKey);
    setError(null);
    setOneTimeLink(null);
    try {
      const token = await accessToken();
      if (!token) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await adminIssueWaveSectorLink({
        data: { accessToken: token, waveId, cohortKey, expiresInDays },
      });
      if (!result.created) {
        setError(result.error);
        return;
      }
      setOneTimeLink({
        key: cohortKey,
        url: `${window.location.origin}/respond/s/${result.token}`,
      });
      await load();
    } catch {
      setError("Não foi possível emitir o link.");
    } finally {
      setIssuingKey(null);
    }
  }

  async function revokeLink(linkId: string) {
    if (confirmRevokeId !== linkId) {
      setConfirmRevokeId(linkId);
      return;
    }
    setRevokingId(linkId);
    setError(null);
    try {
      const token = await accessToken();
      if (!token) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await adminRevokeWaveSectorLink({
        data: { accessToken: token, waveId, linkId },
      });
      if (!result.revoked) {
        setError(result.error);
        return;
      }
      setConfirmRevokeId(null);
      setOneTimeLink(null);
      await load();
    } catch {
      setError("Não foi possível revogar o link.");
    } finally {
      setRevokingId(null);
    }
  }

  async function copyOneTimeLink() {
    if (!oneTimeLink) return;
    await navigator.clipboard.writeText(oneTimeLink.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!pilotEnabled) return null;

  return (
    <section className="mt-4 border-t border-border/60 pt-3" aria-label="Operação por setores">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void toggle()}
          className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-foreground"
          aria-expanded={open}
        >
          <ShieldCheck className="h-4 w-4 text-primary" />
          Setores e links
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {instrument === "FIB_T" && (
          <a
            href={`/fibt-piloto?wave=${encodeURIComponent(waveId)}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Resultado protegido
          </a>
        )}
      </div>

      {open && (
        <div className="mt-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {sectors.length === 0 ? "Nenhum setor cadastrado" : `${sectors.length} setor(es)`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                title="Atualizar setores"
                aria-label="Atualizar setores"
                className="grid h-11 w-11 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              {collecting && !showCreate && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar setor
                </button>
              )}
            </div>
          </div>

          {showCreate && collecting && (
            <form
              className="mt-3 grid gap-2 border-y border-border/60 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                void createSector();
              }}
            >
              <label className="min-w-0 text-xs text-muted-foreground">
                Nome do setor
                <input
                  value={sectorLabel}
                  onChange={(event) => setSectorLabel(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  autoFocus
                  className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
                {sectorKeyPreview && (
                  <span className="mt-1 block font-mono text-[10px]">{sectorKeyPreview}</span>
                )}
              </label>
              <button
                type="submit"
                disabled={creatingSector || sectorLabel.trim().length < 2}
                className="min-h-11 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {creatingSector ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setSectorLabel("");
                }}
                className="min-h-11 px-3 text-xs text-muted-foreground"
              >
                Cancelar
              </button>
            </form>
          )}

          {oneTimeLink && (
            <div className="mt-3 border-l-2 border-primary pl-3">
              <p className="text-xs font-medium text-foreground">
                Link de {oneTimeLink.key} exibido uma única vez
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap bg-muted/40 px-2 py-1.5 text-[10px] text-foreground">
                  {oneTimeLink.url}
                </code>
                <button
                  type="button"
                  onClick={() => void copyOneTimeLink()}
                  title="Copiar link"
                  aria-label="Copiar link"
                  className="grid h-11 w-11 shrink-0 place-items-center text-primary"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {copied && <p className="mt-1 text-[11px] text-primary">Copiado</p>}
            </div>
          )}

          {loading && !loaded && (
            <p role="status" className="py-4 text-xs text-muted-foreground">
              Carregando setores...
            </p>
          )}

          {!loading && loaded && sectors.length === 0 && (
            <p className="py-4 text-xs text-muted-foreground">Cadastre o primeiro setor da onda.</p>
          )}

          {sectors.length > 0 && (
            <ul className="mt-3 divide-y divide-border/60 border-y border-border/60">
              {sectors.map((sector) => {
                const currentLink = sector.links.find((link) => link.state !== "revoked");
                return (
                  <li
                    key={sector.cohortId}
                    className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <p className="text-sm font-medium text-foreground">{sector.label}</p>
                        <code className="text-[10px] text-muted-foreground">{sector.key}</code>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        <span>
                          Participação:{" "}
                          <strong className="text-foreground">{sector.responseCountLabel}</strong>
                        </span>
                        {currentLink && (
                          <span>
                            Link:{" "}
                            <strong className="text-foreground">
                              {LINK_STATE_LABEL[currentLink.state]}
                            </strong>
                            {currentLink.state === "active" &&
                              ` até ${new Date(currentLink.expiresAt).toLocaleDateString("pt-BR")}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {collecting && (
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        {!currentLink && (
                          <>
                            <label className="text-[11px] text-muted-foreground">
                              Validade
                              <select
                                value={expiresInDays}
                                onChange={(event) => setExpiresInDays(Number(event.target.value))}
                                className="ml-2 min-h-11 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                              >
                                <option value={7}>7 dias</option>
                                <option value={14}>14 dias</option>
                                <option value={30}>30 dias</option>
                              </select>
                            </label>
                            <button
                              type="button"
                              onClick={() => void issueLink(sector.key)}
                              disabled={issuingKey !== null}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-primary/40 px-3 text-xs font-medium text-primary disabled:opacity-50"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                              {issuingKey === sector.key ? "Emitindo..." : "Emitir link"}
                            </button>
                          </>
                        )}

                        {currentLink && (
                          <button
                            type="button"
                            onClick={() => void revokeLink(currentLink.id)}
                            disabled={revokingId === currentLink.id}
                            className={`inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-xs font-medium disabled:opacity-50 ${
                              confirmRevokeId === currentLink.id
                                ? "bg-destructive text-destructive-foreground"
                                : "border border-border text-muted-foreground"
                            }`}
                          >
                            <Unlink className="h-3.5 w-3.5" />
                            {revokingId === currentLink.id
                              ? "Revogando..."
                              : confirmRevokeId === currentLink.id
                                ? "Confirmar revogação"
                                : "Revogar"}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {unboundLinks.length > 0 && (
            <div className="mt-3 border-l-2 border-amber-500 pl-3" role="alert">
              <p className="text-xs font-medium text-foreground">Links sem setor correspondente</p>
              <ul className="mt-2 divide-y divide-border/60">
                {unboundLinks.map((link) => (
                  <li
                    key={link.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <code className="text-[10px] text-foreground">{link.sectorKey}</code>
                      <p className="text-[11px] text-muted-foreground">
                        {LINK_STATE_LABEL[link.state]} · submissão bloqueada pelo vínculo
                        fail-closed
                      </p>
                    </div>
                    {link.state !== "revoked" && (
                      <button
                        type="button"
                        onClick={() => void revokeLink(link.id)}
                        disabled={revokingId === link.id}
                        className={`inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-xs font-medium disabled:opacity-50 ${
                          confirmRevokeId === link.id
                            ? "bg-destructive text-destructive-foreground"
                            : "border border-border text-muted-foreground"
                        }`}
                      >
                        <Unlink className="h-3.5 w-3.5" />
                        {revokingId === link.id
                          ? "Revogando..."
                          : confirmRevokeId === link.id
                            ? "Confirmar revogação"
                            : "Revogar"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
