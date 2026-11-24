// Constantes e contexto compartilhados pelos componentes da proposta (fora dos arquivos de
// componente, para o Fast Refresh do Vite funcionar).
import { createContext } from "react";
import { Gauge, GraduationCap, Sprout, Workflow } from "lucide-react";
import type { IftMovement } from "./types";

const fmt = (n: number) => n.toLocaleString("pt-BR");
export const brl = (n: number) => (n < 0 ? "− " : "") + "R$ " + fmt(Math.abs(n));

/** Ícones fixos da Matriz IFT (pré-treino: os mesmos em toda a proposta). */
export const IFT_ICON: Record<IftMovement, typeof Gauge> = {
  mensurar: Gauge,
  educar: GraduationCap,
  transformar: Workflow,
  evoluir: Sprout,
};
export const IFT_ORDER: IftMovement[] = ["mensurar", "educar", "transformar", "evoluir"];

/** Onde as janelas "Entenda" abrem: no modo apresentação, dentro do palco (tela cheia). */
export const DialogContainer = createContext<HTMLElement | null>(null);
