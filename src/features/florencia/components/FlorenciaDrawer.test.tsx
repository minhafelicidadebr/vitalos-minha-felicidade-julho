// Testes de comportamento do FlorenciaDrawer — puramente apresentacional,
// então os 3 estados (allowed/blocked/null) são construídos aqui como
// literais que respeitam FlorenciaResponseTemplateResult, sem chamar
// buildResponseTemplate() nem qualquer outra peça do engine. Prefere
// asserção semântica/comportamental (role, texto, callback) a snapshot.
//
// Cobertura automatizada (happy-dom + Testing Library): semântica, estados,
// conteúdo, eventos, fechamento, callbacks, ausência de dados internos,
// foco quando o ambiente simulado suporta. NÃO comprovado aqui — pendente
// de navegador real na etapa de wiring: focus trap completo, retorno de
// foco em todos os navegadores, scroll interno, responsividade visual,
// contraste, tema claro/escuro, zoom 200%, reduced motion, composição
// visual. happy-dom não reproduz essas capacidades com fidelidade.

import { describe, expect, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { FlorenciaDrawer } from "./FlorenciaDrawer";
import type { FlorenciaResponseTemplateResult } from "@/engine/florencia/response-templates";

const ALLOWED_RESULT: FlorenciaResponseTemplateResult = Object.freeze({
  status: "allowed",
  templateId: "prepare-safe-conversation-v1",
  title: "Preparar uma conversa segura",
  summary:
    "Como preparar uma conversa para acolher o relato de um erro, risco ou preocupação, descrevendo fatos observáveis e evitando atribuição antecipada de culpa ou intenção.",
  guidance: Object.freeze([
    "Escolher um momento adequado e um ambiente com privacidade compatível com a conversa.",
    "Descrever o fato observável, sem atribuir intenção, culpa ou traço pessoal.",
    "Fazer uma pergunta aberta e oferecer tempo suficiente para a resposta.",
    "Confirmar o entendimento antes de responder, corrigir ou propor uma ação.",
    "Encerrar com um próximo passo claro, proporcional e acordado quando isso for possível.",
  ]),
  limitations: Object.freeze([
    "Não substitui RH, SST, ouvidoria, canal de ética ou suporte especializado quando o caso exigir.",
    "Situações envolvendo assédio, violência, discriminação, risco relevante ou obrigação formal devem seguir os canais e protocolos competentes.",
    "A evidência científica utilizada é correlacional e não garante mudança de comportamento ou resultado organizacional.",
    "O roteiro não pode ser usado para avaliação de desempenho, promoção, punição, disciplina, seleção ou classificação individual.",
    "Este template não realiza diagnóstico clínico, jurídico ou individual.",
    "Nenhuma orientação pode revelar ou tentar inferir quem respondeu a uma pesquisa.",
  ]),
  nextActionLabel: "Revisar o roteiro da conversa",
  usedClaimIds: Object.freeze(["CLAIM-EDMONDSON1999-VOICE-002"]),
  classification: "DEMO",
}) as FlorenciaResponseTemplateResult;

const BLOCKED_RESULT: FlorenciaResponseTemplateResult = Object.freeze({
  status: "blocked",
  reasonCode: "policy_gate_denied",
  safeMessage: "Esta orientação não está disponível neste contexto.",
  usedClaimIds: Object.freeze([]),
}) as FlorenciaResponseTemplateResult;

function withClassification(
  classification: "REAL" | "PARCIAL" | "DEMO",
): FlorenciaResponseTemplateResult {
  return { ...ALLOWED_RESULT, classification } as FlorenciaResponseTemplateResult;
}

function noop() {}

describe("FlorenciaDrawer — identidade institucional", () => {
  test("mostra o título FlorêncIA no estado allowed", () => {
    render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    expect(screen.getByRole("heading", { name: "FlorêncIA" })).toBeDefined();
  });

  test("mostra o título FlorêncIA no estado blocked", () => {
    render(<FlorenciaDrawer open result={BLOCKED_RESULT} onOpenChange={noop} />);
    expect(screen.getByRole("heading", { name: "FlorêncIA" })).toBeDefined();
  });

  test("mostra o título FlorêncIA no estado vazio (result null)", () => {
    render(<FlorenciaDrawer open result={null} onOpenChange={noop} />);
    expect(screen.getByRole("heading", { name: "FlorêncIA" })).toBeDefined();
  });

  test("mostra a descrição institucional 'Copiloto contextual'", () => {
    render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    expect(screen.getByText("Copiloto contextual")).toBeDefined();
  });
});

describe("FlorenciaDrawer — estado allowed", () => {
  test("renderiza o título da capacidade como heading", () => {
    render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    expect(screen.getByRole("heading", { name: "Preparar uma conversa segura" })).toBeDefined();
  });

  test("renderiza o resumo (summary)", () => {
    render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    expect(screen.getByText(ALLOWED_RESULT.status === "allowed" ? ALLOWED_RESULT.summary : "")).toBeDefined();
  });

  test("renderiza os 5 itens de guidance em uma lista ordenada", () => {
    render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    const lists = screen.getAllByRole("list");
    const orderedList = lists.find((el) => el.tagName === "OL");
    expect(orderedList).toBeDefined();
    expect(within(orderedList as HTMLElement).getAllByRole("listitem")).toHaveLength(5);
  });

  test("renderiza as 6 limitations em uma lista", () => {
    render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    const lists = screen.getAllByRole("list");
    const unorderedList = lists.find((el) => el.tagName === "UL");
    expect(unorderedList).toBeDefined();
    expect(within(unorderedList as HTMLElement).getAllByRole("listitem")).toHaveLength(6);
  });

  test("renderiza nextActionLabel como texto, não como controle clicável", () => {
    render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    expect(screen.getByText(/Revisar o roteiro da conversa/)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Revisar o roteiro da conversa/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Revisar o roteiro da conversa/ })).toBeNull();
  });

  test.each([["REAL"], ["PARCIAL"], ["DEMO"]] as const)(
    "mostra o StatusBadge correto para classification=%s",
    (classification) => {
      render(<FlorenciaDrawer open result={withClassification(classification)} onOpenChange={noop} />);
      const expectedLabel = { REAL: "Real", PARCIAL: "Parcial", DEMO: "Demo" }[classification];
      expect(screen.getByText(expectedLabel)).toBeDefined();
    },
  );

  test("não renderiza nenhum usedClaimIds no texto visível", () => {
    render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    expect(screen.queryByText(/CLAIM-/)).toBeNull();
  });

  test("não renderiza safeMessage nem reasonCode do estado blocked", () => {
    render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    expect(screen.queryByText("Esta orientação não está disponível neste contexto.")).toBeNull();
  });
});

describe("FlorenciaDrawer — estado blocked", () => {
  test("renderiza o safeMessage", () => {
    render(<FlorenciaDrawer open result={BLOCKED_RESULT} onOpenChange={noop} />);
    expect(screen.getByText("Esta orientação não está disponível neste contexto.")).toBeDefined();
  });

  test("não renderiza o reasonCode cru em lugar nenhum", () => {
    render(<FlorenciaDrawer open result={BLOCKED_RESULT} onOpenChange={noop} />);
    expect(screen.queryByText(/policy_gate_denied/)).toBeNull();
  });

  test("não renderiza conteúdo do estado allowed (título/summary/guidance)", () => {
    render(<FlorenciaDrawer open result={BLOCKED_RESULT} onOpenChange={noop} />);
    expect(screen.queryByText("Preparar uma conversa segura")).toBeNull();
    expect(screen.queryByText(/Revisar o roteiro da conversa/)).toBeNull();
  });
});

describe("FlorenciaDrawer — estado vazio (result null)", () => {
  test("renderiza a mensagem de estado vazio", () => {
    render(<FlorenciaDrawer open result={null} onOpenChange={noop} />);
    expect(screen.getByText("Nenhuma orientação selecionada ainda.")).toBeDefined();
  });

  test("não renderiza conteúdo de allowed nem de blocked", () => {
    render(<FlorenciaDrawer open result={null} onOpenChange={noop} />);
    expect(screen.queryByText("Preparar uma conversa segura")).toBeNull();
    expect(screen.queryByText("Esta orientação não está disponível neste contexto.")).toBeNull();
  });
});

describe("FlorenciaDrawer — acessibilidade e fechamento", () => {
  test("expõe role=dialog quando aberto", () => {
    render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  test("não renderiza nada quando open=false", () => {
    render(<FlorenciaDrawer open={false} result={ALLOWED_RESULT} onOpenChange={noop} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("nenhum elemento usa aria-live", () => {
    const { container } = render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(0);
  });

  test("o botão de fechar chama onOpenChange(false)", () => {
    let closedWith: boolean | undefined;
    render(
      <FlorenciaDrawer
        open
        result={ALLOWED_RESULT}
        onOpenChange={(next) => {
          closedWith = next;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(closedWith).toBe(false);
  });

  test("Escape chama onOpenChange(false)", () => {
    let closedWith: boolean | undefined;
    render(
      <FlorenciaDrawer
        open
        result={ALLOWED_RESULT}
        onOpenChange={(next) => {
          closedWith = next;
        }}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(closedWith).toBe(false);
  });
});

function TriggerHarness({ result }: { result: FlorenciaResponseTemplateResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir FlorêncIA
      </button>
      <FlorenciaDrawer open={open} onOpenChange={setOpen} result={result} />
    </div>
  );
}

describe("FlorenciaDrawer — harness controlado (foco)", () => {
  test("abre a partir de um disparador externo e expõe o dialog", () => {
    render(<TriggerHarness result={ALLOWED_RESULT} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Abrir FlorêncIA" }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  test("Escape fecha o dialog aberto pelo disparador", () => {
    render(<TriggerHarness result={ALLOWED_RESULT} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir FlorêncIA" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("FlorenciaDrawer — determinismo e imutabilidade", () => {
  test("renderização é determinística para a mesma entrada", () => {
    const first = render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    const firstText = first.container.textContent;
    first.unmount();
    const second = render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
    expect(second.container.textContent).toBe(firstText);
  });

  test("não muta o objeto result recebido (congelado com Object.freeze)", () => {
    expect(() =>
      render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />),
    ).not.toThrow();
  });

  test("não dispara nenhuma requisição de rede", () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = ((() => {
      called = true;
      throw new Error("fetch não deveria ser chamado");
    }) as unknown) as typeof fetch;
    try {
      render(<FlorenciaDrawer open result={ALLOWED_RESULT} onOpenChange={noop} />);
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
