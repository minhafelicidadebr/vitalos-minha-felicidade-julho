// Primeira configuração de uma organização — só acessível com um convite
// válido gerado por um admin da PLATAFORMA (/plataforma). Fecha o self-serve:
// sem token, ninguém cria organização sozinho. Espelha o padrão de
// /convite/:token (resolve no servidor, nunca confia em estado do cliente).
//
// Nota de arquitetura: rota deliberadamente "/ativar" e não "/onboarding/:token"
// — "/onboarding" já é uma rota própria (onboarding.tsx) sem <Outlet/>, e um
// filho aninhado ali nunca renderiza (mesma armadilha resolvida em /convite).

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Building,
  GraduationCap,
  Landmark,
  HeartPulse,
  AlertCircle,
  Loader2,
  ShieldAlert,
  ChevronLeft,
  Check,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitOnboarding } from "@/lib/api/onboarding.functions";
import { checkOrgInviteToken } from "@/lib/api/org-invite.functions";
import type { OrgInviteResolution } from "@/lib/api/org-invite.server";
import { PACK_CHOICES } from "@/domain/packs/registry";

const SECTOR_ICONS: Record<string, LucideIcon> = {
  "building-2": Building2,
  "graduation-cap": GraduationCap,
  landmark: Landmark,
  building: Building,
  "heart-pulse": HeartPulse,
};

const TEAM_SIZE_BANDS = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

export const Route = createFileRoute("/ativar/$token")({
  head: () => ({ meta: [{ title: "Configurar organização — VitalOS™" }] }),
  component: OnboardingTokenPage,
});

const INVALID_MESSAGE: Record<string, string> = {
  invalid_token: "Este link de convite não foi reconhecido.",
  already_used: "Este convite já foi utilizado. Peça um novo link ao administrador.",
  expired: "Este convite expirou. Peça um novo link ao administrador.",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function OnboardingTokenPage() {
  const { token } = Route.useParams();
  const [resolution, setResolution] = useState<OrgInviteResolution | "loading">("loading");

  useEffect(() => {
    let active = true;
    checkOrgInviteToken({ data: { token } })
      .then((r) => active && setResolution(r))
      .catch(() => active && setResolution({ valid: false, reason: "invalid_token" }));
    return () => {
      active = false;
    };
  }, [token]);

  if (resolution === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando convite…</p>
        </div>
      </div>
    );
  }

  if (!resolution.valid) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-dashed border-border/70 bg-card p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-serif text-xl text-foreground">Convite indisponível</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {INVALID_MESSAGE[resolution.reason] ?? "Convite inválido."}
          </p>
        </div>
      </div>
    );
  }

  return <OnboardingForm token={token} boundEmail={resolution.email} />;
}

function OnboardingForm({ token, boundEmail }: { token: string; boundEmail: string | null }) {
  const navigate = useNavigate();
  const [packId, setPackId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [cnpj, setCnpj] = useState("");
  const [teamSizeBand, setTeamSizeBand] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [segment, setSegment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(v: string) {
    setOrgName(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  const detailsValid =
    orgName.trim().length > 1 &&
    slug.trim().length > 1 &&
    cnpj.trim().length >= 11 &&
    teamSizeBand.length > 0 &&
    phone.trim().length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!packId || !detailsValid || submitting) return;
    setSubmitting(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Sessão expirada. Faça login novamente.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await submitOnboarding({
        data: {
          userId: session.user.id,
          orgName: orgName.trim(),
          orgSlug: slug.trim(),
          packId,
          cnpj: cnpj.trim(),
          teamSizeBand,
          phone: phone.trim(),
          address: address.trim() || undefined,
          segment: segment.trim() || undefined,
          inviteToken: token,
        },
      });

      if (!result.ok) {
        setError(result.error);
      } else {
        navigate({ to: "/rh" });
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const activeChoice = PACK_CHOICES.find((c) => c.id === packId) ?? null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            4 Lentes VitalOS™
          </p>
          <h1 className="mt-2 font-serif text-2xl text-foreground">
            {packId ? "Complete o cadastro" : "Qual é o seu setor?"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {packId
              ? `Estas informações identificam ${orgName.trim() || "sua organização"} no sistema. Você poderá editar depois.`
              : boundEmail
                ? `Convite validado para ${boundEmail}. Isso define o vocabulário e os papéis do seu painel.`
                : "Isso define o vocabulário, os papéis e os relatórios do seu painel."}
          </p>
        </div>

        {/* Indicador de passo */}
        <div className="mb-6 flex items-center justify-center gap-2" aria-hidden>
          <span className={`h-1.5 w-8 rounded-full transition-colors ${!packId ? "bg-primary" : "bg-primary/30"}`} />
          <span className={`h-1.5 w-8 rounded-full transition-colors ${packId ? "bg-primary" : "bg-border"}`} />
        </div>

        {!packId ? (
          <div className="space-y-2.5" role="listbox" aria-label="Escolher setor da organização">
            {PACK_CHOICES.map((c) => {
              const Icon = SECTOR_ICONS[c.sectorIcon] ?? Building2;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => setPackId(c.id)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${c.accent}1f`, color: c.accent }}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{c.sectorLabel}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{c.promise}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm space-y-5">
            {activeChoice && (
              <button
                type="button"
                onClick={() => setPackId(null)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Setor: {activeChoice.sectorLabel}
                <span className="text-muted-foreground/50">· trocar</span>
              </button>
            )}

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Nome da organização
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Empresa ABC Ltda"
                required
                className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                <span>Identificador único</span>
                <span className="normal-case font-normal text-muted-foreground/70">URL-safe · gerado automaticamente</span>
              </label>
              <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30">
                <span className="text-muted-foreground/60 shrink-0">org/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                  pattern="[a-z0-9-]+"
                  required
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  required
                  className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 90000-0000"
                  required
                  className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Tamanho da equipe
              </label>
              <div className="flex flex-wrap gap-2">
                {TEAM_SIZE_BANDS.map((band) => (
                  <button
                    key={band}
                    type="button"
                    onClick={() => setTeamSizeBand(band)}
                    className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                      teamSizeBand === band
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background text-foreground hover:border-primary/40"
                    }`}
                  >
                    {band}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Endereço/cidade <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: São Paulo, SP"
                className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Segmento organizacional <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
              </label>
              <input
                type="text"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="Ex: Varejo, Tecnologia, Indústria…"
                className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!detailsValid || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-serif text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                "Configurando…"
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Iniciar plataforma
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          Como administrador, você terá acesso completo ao painel, criação de
          ondas e relatórios da sua organização.
        </p>
      </motion.div>
    </div>
  );
}
