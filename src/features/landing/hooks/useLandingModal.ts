import { useCallback, useState } from "react";
import type { CtaAction, LandingModalType } from "../data/landing-copy";

/**
 * Estado de qual modal da landing está aberto (um por vez). Acessível por
 * construção: o Dialog (Radix) cuida de foco/escape/aria; aqui só orquestramos.
 */
export function useLandingModal() {
  const [openModal, setOpenModal] = useState<LandingModalType | null>(null);

  const open = useCallback((modal: LandingModalType) => setOpenModal(modal), []);
  const close = useCallback(() => setOpenModal(null), []);

  /** Resolve uma ação de CTA: abre um modal OU navega para uma rota. */
  const runAction = useCallback(
    (action: CtaAction, navigate: (to: string) => void) => {
      if (action.kind === "modal") open(action.modal);
      else if (action.kind === "anchor") {
        document.getElementById(action.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `#${action.id}`);
      } else navigate(action.to);
    },
    [open],
  );

  return { openModal, open, close, runAction };
}
