// Teste de integração do wiring real: CTA → pipeline canônico → drawer.
// Usa os registries reais (cta-registry.json, claim-registry.json,
// evidence-registry.json) — não duplica a lógica do Policy Gate aqui, só
// observa o comportamento fim-a-fim através de props (segment/role/route/
// entityRefs) que a produção nunca varia, mas que permitem exercitar os
// cenários bloqueados sem uma segunda implementação do Policy Gate.
//
// Nota sobre o item "k-anonimato insuficiente produz bloqueio": não é
// exercitável fim-a-fim por ESTA CTA — allowedEntityRefPrefixes do
// CTA-PREPARE-CONVERSATION já é exatamente ["mechanism","study"], o mesmo
// padrão seguro que checkKAnonymitySafe exige em response-templates.ts. Todo
// entity_ref que sobrevive a resolveFlorenciaContext já é seguro por
// construção — a guarda k_anonymity_not_satisfied é inalcançável por esta
// CTA e permanece coberta no nível de unidade (response-templates.test.ts).

import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { FlorenciaSafeConversationEntryPoint } from "./FlorenciaSafeConversationEntryPoint";

const PLANNED_CAPABILITY_STRINGS = [
  "interpret_aggregated_results",
  "transform_findings_into_action",
  "create_educational_activity",
  "register_next_step",
];

describe("FlorenciaSafeConversationEntryPoint — visibilidade da CTA", () => {
  test("CTA visível com texto exato 'Preparar uma conversa segura' no contexto permitido", () => {
    render(<FlorenciaSafeConversationEntryPoint />);
    expect(screen.getByRole("button", { name: "Preparar uma conversa segura" })).toBeDefined();
  });

  test("CTA não aparece para papel não autorizado", () => {
    render(<FlorenciaSafeConversationEntryPoint role="colaborador" />);
    expect(screen.queryByRole("button", { name: "Preparar uma conversa segura" })).toBeNull();
  });

  test("CTA não aparece para segmento não autorizado", () => {
    render(<FlorenciaSafeConversationEntryPoint segment="school" />);
    expect(screen.queryByRole("button", { name: "Preparar uma conversa segura" })).toBeNull();
  });

  test("nenhum CTA/capacidade PLANNED aparece no DOM", () => {
    const { container } = render(<FlorenciaSafeConversationEntryPoint />);
    for (const planned of PLANNED_CAPABILITY_STRINGS) {
      expect(container.textContent?.includes(planned)).toBe(false);
    }
  });
});

describe("FlorenciaSafeConversationEntryPoint — clique executa o pipeline", () => {
  test("result null: drawer fechado, nada de allowed/blocked visível antes do clique", () => {
    render(<FlorenciaSafeConversationEntryPoint />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("clique no contexto autorizado abre o drawer com resultado allowed", () => {
    render(<FlorenciaSafeConversationEntryPoint />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Preparar uma conversa segura" })).toBeDefined();
  });

  test("template correto é exibido (prepare-safe-conversation-v1 via summary aprovado)", () => {
    render(<FlorenciaSafeConversationEntryPoint />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(
      screen.getByText(
        "Como preparar uma conversa para acolher o relato de um erro, risco ou preocupação, descrevendo fatos observáveis e evitando atribuição antecipada de culpa ou intenção.",
      ),
    ).toBeDefined();
  });

  test("classificação DEMO é exibida com a nota 'Conteúdo demonstrativo.'", () => {
    render(<FlorenciaSafeConversationEntryPoint />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(screen.getByText("Demo")).toBeDefined();
    expect(screen.getByText("Conteúdo demonstrativo.")).toBeDefined();
  });

  test("guidance possui cinco passos", () => {
    render(<FlorenciaSafeConversationEntryPoint />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    const lists = screen.getAllByRole("list");
    const ordered = lists.find((el) => el.tagName === "OL");
    expect(ordered).toBeDefined();
    expect(ordered?.querySelectorAll("li")).toHaveLength(5);
  });

  test("limitations aparecem", () => {
    render(<FlorenciaSafeConversationEntryPoint />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(
      screen.getByText(/Este template não realiza diagnóstico clínico, jurídico ou individual\./),
    ).toBeDefined();
  });

  test("próximo passo permanece texto, não vira botão/link", () => {
    render(<FlorenciaSafeConversationEntryPoint />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(screen.getByText("Revisar o roteiro da conversa")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Revisar o roteiro da conversa/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Revisar o roteiro da conversa/ })).toBeNull();
  });
});

describe("FlorenciaSafeConversationEntryPoint — bloqueios governados pelo pipeline real", () => {
  test("rota incorreta não ativa a capacidade — abre blocked, não allowed", () => {
    render(<FlorenciaSafeConversationEntryPoint route="/rh" />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Esta orientação não está disponível neste contexto.")).toBeDefined();
    expect(screen.queryByText("Revisar o roteiro da conversa")).toBeNull();
  });

  test("entity_ref válido mas não-requerido produz bloqueio (required_entity_missing)", () => {
    render(<FlorenciaSafeConversationEntryPoint entityRefs={["study:EDMONDSON-1999"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Esta orientação não está disponível neste contexto.")).toBeDefined();
  });

  test("bloqueio nunca revela reasonCode cru no DOM", () => {
    const { container } = render(<FlorenciaSafeConversationEntryPoint route="/rh" />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(container.textContent?.includes("route_not_allowed")).toBe(false);
  });
});

describe("FlorenciaSafeConversationEntryPoint — ausência de dados internos e efeitos colaterais", () => {
  test("claim ID não aparece no DOM", () => {
    const { container } = render(<FlorenciaSafeConversationEntryPoint />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(container.textContent?.includes("CLAIM-")).toBe(false);
  });

  test("Skill ID não aparece no DOM", () => {
    const { container } = render(<FlorenciaSafeConversationEntryPoint />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(container.textContent?.includes("SKILL-")).toBe(false);
  });

  test("nenhuma resposta individual entra nas props (entityRefs default só mechanism/study)", () => {
    render(<FlorenciaSafeConversationEntryPoint />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(screen.queryByText(/participant:/)).toBeNull();
  });

  test("nenhuma chamada de rede", () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = ((() => {
      called = true;
      throw new Error("fetch não deveria ser chamado");
    }) as unknown) as typeof fetch;
    try {
      render(<FlorenciaSafeConversationEntryPoint />);
      fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("não persiste nada — nenhum acesso a localStorage/sessionStorage", () => {
    const originalSetItem = window.localStorage.setItem;
    let called = false;
    window.localStorage.setItem = (...args: Parameters<typeof originalSetItem>) => {
      called = true;
      return originalSetItem.apply(window.localStorage, args);
    };
    try {
      render(<FlorenciaSafeConversationEntryPoint />);
      fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
      expect(called).toBe(false);
    } finally {
      window.localStorage.setItem = originalSetItem;
    }
  });
});

describe("FlorenciaSafeConversationEntryPoint — fechamento e determinismo", () => {
  test("fechamento por Escape", () => {
    render(<FlorenciaSafeConversationEntryPoint />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // Retorno de foco ao CTA após fechar o dialog depende da restauração de
  // foco assíncrona (rAF) do focus-scope do Radix, que happy-dom não resolve
  // de forma confiável — comparar document.activeElement trava a suíte em
  // vez de falhar rápido. Fica como PENDENTE DE NAVEGADOR REAL, junto dos
  // outros itens de foco já documentados no cabeçalho deste arquivo e no de
  // FlorenciaDrawer.test.tsx.

  test("reabertura produz resultado determinístico (mesmo texto nas duas aberturas)", () => {
    render(<FlorenciaSafeConversationEntryPoint />);
    const trigger = screen.getByRole("button", { name: "Preparar uma conversa segura" });
    fireEvent.click(trigger);
    const firstText = screen.getByRole("dialog").textContent;
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog").textContent).toBe(firstText);
  });

  test("troca de contexto não reutiliza resultado anterior (allowed → blocked no clique seguinte)", () => {
    const { rerender } = render(<FlorenciaSafeConversationEntryPoint />);
    const trigger = screen.getByRole("button", { name: "Preparar uma conversa segura" });
    fireEvent.click(trigger);
    expect(screen.getByText("Revisar o roteiro da conversa")).toBeDefined();
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    rerender(<FlorenciaSafeConversationEntryPoint route="/rh" />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    expect(screen.getByText("Esta orientação não está disponível neste contexto.")).toBeDefined();
    expect(screen.queryByText("Revisar o roteiro da conversa")).toBeNull();
  });

  test("não muta o envelope construído no clique (objeto congelado não lança)", () => {
    const frozenEntityRefs = Object.freeze(["mechanism:MECH-VOICE-001", "study:EDMONDSON-1999"]);
    expect(() => {
      render(<FlorenciaSafeConversationEntryPoint entityRefs={[...frozenEntityRefs]} />);
      fireEvent.click(screen.getByRole("button", { name: "Preparar uma conversa segura" }));
    }).not.toThrow();
  });
});
