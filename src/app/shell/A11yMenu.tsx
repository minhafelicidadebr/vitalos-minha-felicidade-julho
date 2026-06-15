import { Accessibility, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useA11y } from "./A11yProvider";

// Porta de entrada do A11yProvider para o usuário final — disponível no header de
// toda tela. Os setters já existiam (cabeados só no /design-system); aqui viram
// um controle real. Estado persiste em localStorage via o próprio provider.

const FONT_STEPS = [0.875, 1, 1.125, 1.25] as const;
const FONT_LABEL: Record<number, string> = {
  0.875: "87,5%",
  1: "100%",
  1.125: "112,5%",
  1.25: "125%",
};

export function A11yMenu() {
  const { fontScale, setFontScale, highContrast, setHighContrast, reduceMotion, setReduceMotion } =
    useA11y();

  const idx = Math.max(0, FONT_STEPS.indexOf(fontScale as (typeof FONT_STEPS)[number]));
  const isDefault = fontScale === 1 && !highContrast && !reduceMotion;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Acessibilidade">
          <Accessibility className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="text-sm font-medium text-foreground">Acessibilidade</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Suas preferências ficam salvas neste navegador.
        </p>

        {/* Tamanho da fonte */}
        <div className="mt-4">
          <Label className="text-xs text-muted-foreground">Tamanho da fonte</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Diminuir tamanho da fonte"
              disabled={idx <= 0}
              onClick={() => setFontScale(FONT_STEPS[idx - 1]!)}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span
              className="flex-1 text-center text-sm tabular-nums text-foreground"
              aria-live="polite"
            >
              {FONT_LABEL[fontScale] ?? "100%"}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Aumentar tamanho da fonte"
              disabled={idx >= FONT_STEPS.length - 1}
              onClick={() => setFontScale(FONT_STEPS[idx + 1]!)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Toggles */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="a11y-contrast" className="text-sm">
              Alto contraste
            </Label>
            <Switch id="a11y-contrast" checked={highContrast} onCheckedChange={setHighContrast} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="a11y-motion" className="text-sm">
              Reduzir movimento
            </Label>
            <Switch id="a11y-motion" checked={reduceMotion} onCheckedChange={setReduceMotion} />
          </div>
        </div>

        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 h-8 w-full text-xs text-muted-foreground"
            onClick={() => {
              setFontScale(1);
              setHighContrast(false);
              setReduceMotion(false);
            }}
          >
            Restaurar padrão
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
