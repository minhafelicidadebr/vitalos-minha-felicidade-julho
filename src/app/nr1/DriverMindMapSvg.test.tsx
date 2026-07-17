// Testes de acessibilidade por teclado do DriverMindMapSvg (happy-dom +
// Testing Library, mesmo padrão de FlorenciaDrawer.test.tsx).
//
// Follow-up cirúrgico: o componente é pré-existente (usado em
// /driver/$driverId desde antes da Onda LDX-1) e passou a integrar
// /voz-segura nesta onda — por isso o gap de teclado (nós clicáveis sem
// onKeyDown) virou parte da experiência entregue e foi corrigido aqui.
//
// Usa o registro real (NR1_CROSSWALK/DEMO_COPSOQ_EXPOSURE), não um fixture
// sintético — o mesmo dado usado tanto em /driver/$driverId quanto no mapa
// embutido em /voz-segura (driver "confianca"), para provar ausência de
// regressão nos dois pontos de uso reais.

import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DriverMindMapSvg } from "./DriverMindMapSvg";
import { NR1_CROSSWALK as R, DEMO_COPSOQ_EXPOSURE } from "@/mocks/nr1-crosswalk-mock";

const PILLAR_LABEL: Record<string, string> = {
  seguranca_psicologica: "Segurança Psicológica",
};

describe("DriverMindMapSvg — semântica e alcançabilidade por teclado", () => {
  test("cada nó de dimensão é um role=button focável (tabIndex=0) com nome acessível", () => {
    render(<DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.tabIndex).toBe(0);
      expect(btn.getAttribute("aria-label")).toMatch(/força \d+%/);
    }
  });

  test("Tab alcança o primeiro nó (ordem do DOM, sem tabIndex negativo escondendo nada)", () => {
    render(<DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />);
    const buttons = screen.getAllByRole("button");
    // fireEvent.focus() não move document.activeElement no happy-dom — .focus()
    // real move, mas dispara o onFocus do React fora do ciclo de eventos do
    // Testing Library, por isso o act() explícito aqui.
    act(() => {
      buttons[0]!.focus();
    });
    expect(document.activeElement).toBe(buttons[0]);
  });

  test("nenhum nó depende de hover — nome acessível e clicabilidade já existem sem qualquer evento de mouse", () => {
    render(<DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />);
    const buttons = screen.getAllByRole("button");
    // Nenhuma interação de hover disparada — só a renderização inicial.
    for (const btn of buttons) {
      expect(btn.getAttribute("aria-label")).toBeTruthy();
    }
  });
});

describe("DriverMindMapSvg — ativação por teclado equivalente ao clique", () => {
  test("Enter ativa o nó (mesmo efeito do clique: abre o painel de detalhe, aria-pressed=true)", () => {
    render(<DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />);
    const button = screen.getAllByRole("button")[0]!;
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.keyDown(button, { key: "Enter", code: "Enter" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  test("Espaço ativa o nó e previne o comportamento padrão (rolagem da página)", () => {
    render(<DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />);
    const button = screen.getAllByRole("button")[0]!;
    // fireEvent devolve o retorno de dispatchEvent — false quando preventDefault foi chamado.
    const notCancelled = fireEvent.keyDown(button, { key: " ", code: "Space" });
    expect(notCancelled).toBe(false);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  test("pressionar Enter de novo desmarca (toggle), igual ao clique duplo", () => {
    render(<DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />);
    const button = screen.getAllByRole("button")[0]!;
    fireEvent.keyDown(button, { key: "Enter" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(button, { key: "Enter" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  test("teclas irrelevantes (ex.: Tab, Escape) não ativam o nó", () => {
    render(<DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />);
    const button = screen.getAllByRole("button")[0]!;
    fireEvent.keyDown(button, { key: "Tab" });
    fireEvent.keyDown(button, { key: "Escape" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  test("clique com mouse continua funcionando (sem regressão)", () => {
    render(<DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />);
    const button = screen.getAllByRole("button")[0]!;
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  test("clique e teclado produzem o mesmo estado final (mostram o mesmo painel de detalhe)", () => {
    const { unmount } = render(
      <DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />,
    );
    const clickButton = screen.getAllByRole("button")[0]!;
    fireEvent.click(clickButton);
    const clickDetailText = document.body.textContent;
    unmount();

    render(<DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />);
    const keyButton = screen.getAllByRole("button")[0]!;
    fireEvent.keyDown(keyButton, { key: "Enter" });
    const keyDetailText = document.body.textContent;

    expect(keyDetailText).toBe(clickDetailText);
  });
});

describe("DriverMindMapSvg — foco visível", () => {
  test("nó ganha um anel de foco visível (SVG) ao receber foco, e perde ao perder foco", () => {
    const { container } = render(
      <DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />,
    );
    const button = screen.getAllByRole("button")[0]!;
    expect(container.querySelector('[data-testid="focus-ring"]')).toBeNull();
    fireEvent.focus(button);
    expect(container.querySelector('[data-testid="focus-ring"]')).not.toBeNull();
    fireEvent.blur(button);
    expect(container.querySelector('[data-testid="focus-ring"]')).toBeNull();
  });

  test("outline nativo suprimido é substituído pelo anel — nunca outline-none sem substituto", () => {
    render(<DriverMindMapSvg registry={R} driverId="carga" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />);
    const button = screen.getAllByRole("button")[0]!;
    expect(button.getAttribute("class")).toContain("outline-none");
    // outline-none só é aceitável porque o anel SVG (testado acima) substitui — não é regra isolada.
  });
});

describe("DriverMindMapSvg — ausência de regressão no mapa embutido em /voz-segura", () => {
  test("driver 'confianca' (o mesmo usado em /voz-segura) continua resolvendo nós reais e ativáveis por teclado", () => {
    render(<DriverMindMapSvg registry={R} driverId="confianca" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.keyDown(buttons[0]!, { key: "Enter" });
    expect(buttons[0]!.getAttribute("aria-pressed")).toBe("true");
  });

  test("driver inexistente continua retornando null (nenhuma quebra introduzida)", () => {
    const { container } = render(
      <DriverMindMapSvg registry={R} driverId="nao_existe" exposures={DEMO_COPSOQ_EXPOSURE} pillarLabels={PILLAR_LABEL} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
