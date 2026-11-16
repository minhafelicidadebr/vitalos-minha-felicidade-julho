import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Navegação nativa mantém o acesso utilizável sem depender do estado do demo.
// Sem redirect fixo: o fluxo existente decide o destino pela sessão e vínculo.
export function InstitutionalAccessLink({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size={compact ? "sm" : "default"}
      className={cn("min-h-11 rounded-full", compact && "px-2.5 sm:px-3", className)}
    >
      <a href="/entrar" aria-label="Entrar na plataforma institucional">
        <Building2 aria-hidden="true" className={compact ? "hidden size-4 md:block" : "size-4"} />
        {compact ? (
          <>
            <span className="md:hidden">Institucional</span>
            <span className="hidden md:inline">Entrar na plataforma</span>
          </>
        ) : (
          <span>Entrar na plataforma</span>
        )}
      </a>
    </Button>
  );
}
