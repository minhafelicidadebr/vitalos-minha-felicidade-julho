// Testes DOM (happy-dom + Testing Library) dos componentes novos da Onda
// LDX-1 — mesma fundação e padrão de FlorenciaDrawer.test.tsx: asserção
// semântica (role, texto, callback), não snapshot.
//
// Os itens 1/8/9/10 da lista de testes DOM do Super Prompt (texto "5 marcos
// práticos", aviso de sessão do ActionLog, disclaimer DEMO da FlorêncIA,
// hero/card IVO inalterados) foram verificados via NAVEGADOR REAL nesta
// sessão (dev server + leitura de DOM), não aqui — montar a rota inteira
// exigiria mockar AppShell/roteador/stores por inteiro, mais frágil e menos
// fiel que a verificação de runtime já feita. Aqui cobrimos os itens
// 2..7: comportamento isolado e determinístico dos componentes novos.

import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { LearningMethodDialog } from "./components/LearningMethodDialog";
import { IntroVideoCard, type IntroVideoSource } from "./components/IntroVideoCard";
import { LearningDynamicCard } from "./components/LearningDynamicCard";
import { LearningDynamicsRail } from "./components/LearningDynamicsRail";
import type { CanonicalLearningDynamic } from "@/engine/learning/learning-dynamics-resolution";

function makeDynamic(overrides: Partial<CanonicalLearningDynamic> = {}): CanonicalLearningDynamic {
  return {
    id: "LD-999",
    version: "1.0.0",
    slug: "fixture",
    title: "Dinâmica de teste",
    shortLabel: "Fixture",
    description: "Fixture",
    kind: "quiz",
    meteAxes: ["educar"],
    primaryOutcome: "Resultado de teste",
    authorizedRoles: [],
    enrichesRoutes: [],
    runtimeStatus: "REAL",
    contentStatus: "VERIFIED",
    persistenceStatus: "NONE",
    aiMode: "NONE",
    publicExposure: "AVAILABLE",
    riskTier: "R1_LOW",
    dataClasses: [],
    evidenceRefs: [],
    runtimeEvidence: [],
    documentationEvidence: [],
    dependencies: [],
    forbiddenUses: [],
    accessibilityRequirements: [],
    acceptanceCriteria: ["existe"],
    rolloutWave: "LDX-1",
    ...overrides,
  };
}

const noop = () => {};

describe("LearningMethodDialog — item 2 (modal abre, fecha, foco)", () => {
  test("expõe role=dialog com o título correto quando aberto", () => {
    render(<LearningMethodDialog open onOpenChange={noop} />);
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Como funciona a trilha Voz Segura")).toBeDefined();
  });

  test("não renderiza nada quando open=false", () => {
    render(<LearningMethodDialog open={false} onOpenChange={noop} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("renderiza os 5 marcos na ordem Aprender→Praticar→Aplicar→Registrar→Evoluir", () => {
    render(<LearningMethodDialog open onOpenChange={noop} />);
    const dialog = screen.getByRole("dialog");
    const headings = within(dialog)
      .getAllByText(/^\d\. /)
      .map((el) => el.textContent);
    expect(headings).toEqual(["1. Aprender", "2. Praticar", "3. Aplicar", "4. Registrar", "5. Evoluir"]);
  });

  test("mostra os blocos 'o que é' e 'o que não é', incluindo a negação explícita de diagnóstico/denúncia/terapia", () => {
    render(<LearningMethodDialog open onOpenChange={noop} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("O que esta trilha é")).toBeDefined();
    expect(within(dialog).getByText("O que esta trilha não é")).toBeDefined();
    expect(within(dialog).getByText(/Diagnóstico psicológico\./)).toBeDefined();
    expect(within(dialog).getByText(/Canal de denúncia\./)).toBeDefined();
    expect(within(dialog).getByText(/^• Terapia\.$/)).toBeDefined();
  });

  test("Escape chama onOpenChange(false)", () => {
    let closedWith: boolean | undefined;
    render(<LearningMethodDialog open onOpenChange={(next) => (closedWith = next)} />);
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(closedWith).toBe(false);
  });

  test("o botão de fechar chama onOpenChange(false)", () => {
    let closedWith: boolean | undefined;
    render(<LearningMethodDialog open onOpenChange={(next) => (closedWith = next)} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(closedWith).toBe(false);
  });
});

describe("IntroVideoCard — item 3 (sem fonte, nunca player falso)", () => {
  const notAvailable: IntroVideoSource = {
    title: "Em 90 segundos",
    sourceType: "NOT_AVAILABLE",
    contentStatus: "DRAFT",
  };

  test("sourceType NOT_AVAILABLE nunca renderiza <video>", () => {
    const { container } = render(<IntroVideoCard source={notAvailable} onOpenMethod={noop} />);
    expect(container.querySelector("video")).toBeNull();
  });

  test("mostra o badge 'Vídeo em preparação', não um player vazio", () => {
    render(<IntroVideoCard source={notAvailable} onOpenMethod={noop} />);
    expect(screen.getByText("Vídeo em preparação")).toBeDefined();
  });

  test("com fonte real (OWNED + videoSrc), renderiza <video> de verdade", () => {
    const owned: IntroVideoSource = {
      title: "Vídeo real",
      sourceType: "OWNED",
      videoSrc: "/media/intro.mp4",
      contentStatus: "CURATED",
    };
    const { container } = render(<IntroVideoCard source={owned} onOpenMethod={noop} />);
    expect(container.querySelector("video")).not.toBeNull();
    expect(screen.queryByText("Vídeo em preparação")).toBeNull();
  });

  test("o botão 'Como funciona' chama onOpenMethod", () => {
    let called = false;
    render(<IntroVideoCard source={notAvailable} onOpenMethod={() => (called = true)} />);
    fireEvent.click(screen.getByRole("button", { name: /Como funciona/ }));
    expect(called).toBe(true);
  });
});

describe("LearningDynamicCard — itens 4/5/7 (CTA só quando operacional; badge reflete o registry)", () => {
  test("runtimeStatus REAL com onActivate mostra CTA clicável", () => {
    let activated = false;
    render(
      <LearningDynamicCard
        dynamic={makeDynamic({ runtimeStatus: "REAL", publicExposure: "AVAILABLE" })}
        onActivate={() => (activated = true)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Abrir/ }));
    expect(activated).toBe(true);
  });

  test("runtimeStatus PLANNED NUNCA mostra CTA, mesmo se onActivate for passado por engano", () => {
    render(
      <LearningDynamicCard
        dynamic={makeDynamic({ runtimeStatus: "PLANNED", publicExposure: "PREPARATION" })}
        onActivate={noop}
      />,
    );
    expect(screen.queryByRole("button", { name: /Abrir/ })).toBeNull();
  });

  test("badge reflete publicExposure com o vocabulário do doc (Disponível/Piloto/Demonstração/Em preparação)", () => {
    const cases: Array<[CanonicalLearningDynamic["publicExposure"], string]> = [
      ["AVAILABLE", "Disponível"],
      ["PILOT", "Piloto"],
      ["DEMO", "Demonstração"],
      ["PREPARATION", "Em preparação"],
    ];
    for (const [exposure, label] of cases) {
      const { unmount } = render(<LearningDynamicCard dynamic={makeDynamic({ publicExposure: exposure })} />);
      expect(screen.getByText(label)).toBeDefined();
      unmount();
    }
  });
});

describe("LearningDynamicsRail — item 6 (PROPOSED/R_AND_D nunca aparecem; roadmap sem CTA)", () => {
  test("itens em roadmap aparecem sem nenhum botão de CTA", () => {
    const planned = makeDynamic({ id: "LD-PLANNED", runtimeStatus: "PLANNED", publicExposure: "PREPARATION" });
    render(<LearningDynamicsRail title="Praticar" available={[]} roadmap={[planned]} />);
    fireEvent.click(screen.getByRole("button", { name: /Em evolução/ }));
    expect(screen.getByText(planned.title)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Abrir/ })).toBeNull();
  });

  test("não renderiza nada (null) quando não há disponíveis nem roadmap", () => {
    const { container } = render(<LearningDynamicsRail title="Vazio" available={[]} roadmap={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test("corta em no máximo 3 cards disponíveis por rail, mesmo recebendo mais", () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      makeDynamic({ id: `LD-${i}`, slug: `fixture-${i}`, title: `Dinâmica ${i}` }),
    );
    render(<LearningDynamicsRail title="Muitas" available={many} onActivate={noop} />);
    expect(screen.getAllByRole("button", { name: /Abrir/ })).toHaveLength(3);
  });
});
