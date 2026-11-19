import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { currentIvoAccessToken } from "./ivo-session";
import { cycleOfInstant, formatCycleKey } from "@/domain/ivo/cycle-key";
import { checkQ1PreparationAccess } from "@/lib/api/q1-preparation.functions";

export function Q1PreparationEntry() {
  const session = useRealOrgSession();
  const org = session.org;
  if (session.loading || org?.orgPackId !== "enterprise" || org.role === "RH_ADMIN") return null;
  return <RepresentativeEntry key={org.userId + "/" + org.orgId} orgId={org.orgId} />;
}

function RepresentativeEntry({ orgId }: { orgId: string }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let sequence = 0;
    async function check() {
      const request = ++sequence;
      setAvailable(false);
      try {
        const accessToken = await currentIvoAccessToken();
        if (!accessToken || request !== sequence) return;
        const cycle = formatCycleKey(cycleOfInstant(new Date().toISOString()));
        const result = await checkQ1PreparationAccess({ data: { accessToken, cycle } });
        if (request === sequence) setAvailable(result.scope === orgId);
      } catch {
        if (request === sequence) setAvailable(false);
      }
    }
    void check();
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      sequence++;
      window.removeEventListener("focus", onFocus);
    };
  }, [orgId]);
  if (!available) return null;

  return (
    <section aria-labelledby="q1-preparation-entry" className="mx-auto max-w-6xl px-6 pt-8">
      <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-6">
        <h2 id="q1-preparation-entry" className="flex items-center gap-2 font-serif text-xl">
          <ClipboardCheck aria-hidden className="size-5 shrink-0 text-primary" />
          Preparação empresarial Q1
        </h2>
        <p className="text-sm text-muted-foreground">
          Revise o comunicado à equipe e confira os controles existentes antes da coleta.
        </p>
        <Link
          to="/ivo-integral/preparar-q1"
          className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
        >
          Abrir preparação Q1
        </Link>
      </div>
    </section>
  );
}
