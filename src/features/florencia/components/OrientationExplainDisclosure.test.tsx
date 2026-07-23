// Testes do OrientationExplainDisclosure (SAFE-VOICE-BRIDGE §5, Fatia C) —
// happy-dom + Testing Library, mesmo padrão de FlorenciaDrawer.test.tsx:
// literais de ViewModel construídos aqui, sem chamar o engine/projeção.

import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { OrientationExplainDisclosure } from "./OrientationExplainDisclosure";
import type { OrientationRationaleViewModel } from "@/engine/florencia/orientation-rationale-view-model";

const VIEW_MODEL: OrientationRationaleViewModel = Object.freeze({
  title: "Como esta orientação foi selecionada?",
  selectionExplanation:
    "Esta orientação segue uma regra determinística de governança — papel, contexto e evidência científica autorizada —, não uma recomendação personalizada por inteligência artificial.",
  mechanismPublicName: "Redução do medo interpessoal",
  mechanismSafeExplanation:
    "Ambientes em que perguntar, discordar e admitir erro recebem resposta não punitiva favorecem comportamentos de aprendizagem.",
  evidenceSummary: "Claim seguro de teste com pelo menos quarenta caracteres de comprimento útil.",
  skillPublicName: "Facilitador Conversacional",
  passportReference: Object.freeze({
    studyId: "TRU-006",
    ctaLabel: "Ver a evidência científica completa",
  }),
}) as OrientationRationaleViewModel;

const VIEW_MODEL_SEM_PASSPORT: OrientationRationaleViewModel = Object.freeze({
  ...VIEW_MODEL,
  passportReference: null,
}) as OrientationRationaleViewModel;

describe("OrientationExplainDisclosure — viewModel ausente (fail-closed)", () => {
  test("viewModel null não renderiza nada", () => {
    const { container } = render(<OrientationExplainDisclosure viewModel={null} />);
    expect(container.textContent).toBe("");
    expect(container.querySelector("button")).toBeNull();
  });
});

describe("OrientationExplainDisclosure — fechado por padrão", () => {
  test("mostra só o gatilho (title) — conteúdo expandido não está no DOM", () => {
    render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    expect(screen.getByRole("button", { name: /Como esta orientação foi selecionada\?/ })).toBeDefined();
    expect(screen.queryByText(VIEW_MODEL.selectionExplanation)).toBeNull();
    expect(screen.queryByText(VIEW_MODEL.mechanismPublicName)).toBeNull();
  });

  test("aria-expanded=false por padrão", () => {
    render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("false");
  });
});

describe("OrientationExplainDisclosure — expandir mostra os 7 campos do ViewModel", () => {
  test("clique expande e revela selectionExplanation, mecanismo, evidência e Skill", () => {
    render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(VIEW_MODEL.selectionExplanation)).toBeDefined();
    expect(screen.getByText(VIEW_MODEL.mechanismPublicName)).toBeDefined();
    expect(screen.getByText(VIEW_MODEL.mechanismSafeExplanation)).toBeDefined();
    expect(screen.getByText(VIEW_MODEL.evidenceSummary)).toBeDefined();
    expect(screen.getByText(/Facilitador Conversacional/)).toBeDefined();
  });

  test("clicar de novo recolhe (aria-expanded volta a false e conteúdo some)", () => {
    render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(VIEW_MODEL.selectionExplanation)).toBeNull();
  });
});

describe("OrientationExplainDisclosure — referência ao Evidence Passport", () => {
  test("com passportReference, mostra o ctaLabel como texto informativo", () => {
    render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Ver a evidência científica completa/)).toBeDefined();
  });

  test("sem passportReference, não mostra nenhuma nota de evidência adicional — resto do conteúdo continua íntegro", () => {
    render(<OrientationExplainDisclosure viewModel={VIEW_MODEL_SEM_PASSPORT} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText(/Ver a evidência científica completa/)).toBeNull();
    expect(screen.getByText(VIEW_MODEL.mechanismPublicName)).toBeDefined();
  });

  test("passportReference é texto inerte — nenhum link/botão novo é criado para ele", () => {
    render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(1); // só o gatilho do disclosure
  });

  test("studyId (TRU-006) nunca aparece como texto visível — só existe como dado estrutural do ViewModel", () => {
    render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText(/TRU-006/)).toBeNull();
  });
});

describe("OrientationExplainDisclosure — ausência de IDs internos no DOM", () => {
  test("nenhum id técnico (MECH-/CLAIM-/SKILL-/STUDY-) aparece em nenhum estado", () => {
    const { container } = render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    fireEvent.click(screen.getByRole("button"));
    for (const pattern of [/MECH-/, /CLAIM-/, /SKILL-/, /STUDY-/]) {
      expect(container.textContent).not.toMatch(pattern);
    }
  });
});

describe("OrientationExplainDisclosure — acessibilidade", () => {
  test("gatilho é um <button> nativo com min-h-11 (alvo de toque)", () => {
    render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    const trigger = screen.getByRole("button");
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.className).toContain("min-h-11");
  });

  test("respeita foco visível via focus-visible (classe presente)", () => {
    render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    expect(screen.getByRole("button").className).toContain("focus-visible:ring");
  });
});

describe("OrientationExplainDisclosure — determinismo, imutabilidade e ausência de efeitos colaterais", () => {
  test("renderização é determinística para o mesmo ViewModel", () => {
    const first = render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    fireEvent.click(screen.getByRole("button"));
    const firstText = first.container.textContent;
    first.unmount();

    const second = render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
    fireEvent.click(screen.getByRole("button"));
    expect(second.container.textContent).toBe(firstText);
  });

  test("não muta o viewModel recebido (congelado com Object.freeze — não lança)", () => {
    expect(() => {
      render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
      fireEvent.click(screen.getByRole("button"));
    }).not.toThrow();
  });

  test("nenhuma chamada de rede ao expandir", () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = ((() => {
      called = true;
      throw new Error("fetch não deveria ser chamado");
    }) as unknown) as typeof fetch;
    try {
      render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
      fireEvent.click(screen.getByRole("button"));
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("nenhum acesso a localStorage/sessionStorage ao expandir (sem ActionLog, sem persistência)", () => {
    const originalSetItem = window.localStorage.setItem;
    let called = false;
    window.localStorage.setItem = (...args: Parameters<typeof originalSetItem>) => {
      called = true;
      return originalSetItem.apply(window.localStorage, args);
    };
    try {
      render(<OrientationExplainDisclosure viewModel={VIEW_MODEL} />);
      fireEvent.click(screen.getByRole("button"));
      expect(called).toBe(false);
    } finally {
      window.localStorage.setItem = originalSetItem;
    }
  });
});
