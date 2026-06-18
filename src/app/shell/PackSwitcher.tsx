import { useState } from "react";
import { Building2, GraduationCap, Check, ChevronDown, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePack } from "@/engine/pack";
import { usePersona } from "@/engine/rbac/rbac";
import { PACK_CHOICES } from "@/domain/packs/registry";

// Seletor de SETOR (Domain Pack) no header. Prova viva do Engine ≠ Domínio: ao
// trocar o pack, vocabulário, papéis, navegação e o índice (IVO ↔ IEV) mudam ao
// vivo — sem rebuild. Só aparece quando há mais de um setor registrado.
//
// Honestidade Fable 5: é uma PRÉ-VISUALIZAÇÃO de setor. A tela de medição (/ivo)
// computa o índice real do setor; telas operacionais ainda usam dados-exemplo.

const ICONS: Record<string, LucideIcon> = {
  "building-2": Building2,
  "graduation-cap": GraduationCap,
};

export function PackSwitcher() {
  const { packId, setPackId, sectorLabel } = usePack();
  const setRole = usePersona((s) => s.setRole);
  const [open, setOpen] = useState(false);

  if (PACK_CHOICES.length < 2) return null;

  const active = PACK_CHOICES.find((c) => c.id === packId) ?? PACK_CHOICES[0]!;
  const ActiveIcon = ICONS[active.sectorIcon] ?? Building2;

  function choose(id: string, defaultRole: string) {
    if (id !== packId) {
      setPackId(id);
      // A navegação é dirigida por papel × pack; ao trocar de setor o papel atual
      // pode não existir no novo pack. Reposiciona num papel default coerente.
      setRole(defaultRole);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 rounded-xl px-3"
          aria-label={`Setor ativo: ${sectorLabel}. Trocar setor`}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: active.accent }}
            aria-hidden
          />
          <ActiveIcon className="h-4 w-4 opacity-80" aria-hidden />
          <span className="hidden text-xs font-medium xl:inline">{active.sectorLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-sm font-medium text-foreground">Setor (demonstração)</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          O mesmo motor, outro Domain Pack. Vocabulário, papéis, navegação e o índice trocam ao
          vivo.
        </p>

        <ul className="mt-3 space-y-1" role="listbox" aria-label="Escolher setor">
          {PACK_CHOICES.map((c) => {
            const Icon = ICONS[c.sectorIcon] ?? Building2;
            const isActive = c.id === packId;
            return (
              <li key={c.id} role="option" aria-selected={isActive}>
                <button
                  onClick={() => choose(c.id, c.defaultRole)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "border-primary/40 bg-secondary"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${c.accent}1f`, color: c.accent }}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{c.sectorLabel}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {c.indexLabel}
                      </span>
                      {isActive && <Check className="ml-auto h-4 w-4 text-primary" aria-hidden />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {c.promise}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 border-t border-border/50 pt-2.5 text-[11px] leading-snug text-muted-foreground">
          Pré-visualização de setor: a tela de <span className="font-medium">medição</span> computa
          o índice real do setor; telas operacionais ainda usam dados-exemplo nesta fase mock.
        </p>
      </PopoverContent>
    </Popover>
  );
}
