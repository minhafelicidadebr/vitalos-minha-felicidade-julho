import { Link } from "@tanstack/react-router";
import { LockKeyhole, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { usePersona } from "./persona-store";
import { usePack } from "@/engine/pack";
import { canSeeNavItem, type NavItemDef } from "@/engine/rbac/rbac";

export function DemoRouteGuard({ navId, children }: { navId: string; children: ReactNode }) {
  const { pack, status } = usePack();
  const roleId = usePersona((state) => state.roleId);

  if (status.state === "idle" || status.state === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6" aria-busy="true">
        <div className="h-48 animate-pulse rounded-3xl bg-muted/60" />
      </div>
    );
  }

  const item = (pack?.navigation as unknown as NavItemDef[] | undefined)?.find(
    (candidate) => candidate.id === navId,
  );
  if (item && canSeeNavItem(item, roleId)) return children;

  const roleLabel = pack?.roles.find((role) => role.id === roleId)?.label ?? roleId;

  return (
    <div className="mx-auto flex min-h-[58vh] max-w-2xl items-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-[2rem] border border-amber-300/35 bg-card p-6 shadow-sm sm:p-8">
        <span
          className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300"
          aria-hidden
        >
          <ShieldAlert className="h-6 w-6" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
          Acesso negado no modo demonstração
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground">
          Este recurso não pertence ao escopo de {roleLabel}.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          O guard canário impede acesso direto à rota mesmo quando a URL é digitada manualmente. Ele
          demonstra a política, mas ainda não substitui autenticação, sessão e RLS no servidor.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/acesso"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <LockKeyhole className="h-4 w-4" aria-hidden />
            Entender a fronteira
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40"
          >
            Voltar à visão geral
          </Link>
        </div>
      </section>
    </div>
  );
}
