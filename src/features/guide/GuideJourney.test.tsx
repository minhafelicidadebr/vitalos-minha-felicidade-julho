import { describe, expect, test } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import { ENTERPRISE_GUIDE as G } from "@/domain/guide/enterprise-guide";
import type { GuideLens, GuidePerspective } from "@/domain/guide/guide-types";
import type { GuideServerContext } from "@/lib/guide/guide-entry";
import { GuideJourney } from "./GuideJourney";

const LENSES: GuideLens[] = ["Q1", "Q2", "Q3", "Q4", "Q5"];
const PERSPECTIVES: GuidePerspective[] = ["rh", "sst", "lideranca", "colaborador", "direcao", "plataforma"];

function view(stage: GuideLens, perspective: GuidePerspective, context: GuideServerContext | null = null, onChange: (n: unknown) => void = () => {}) {
  return render(<GuideJourney content={G} context={context} environment="unknown" stage={stage} perspective={perspective} onChange={onChange} />);
}
const session = (perspective: GuidePerspective, extra: Partial<GuideServerContext> = {}): GuideServerContext => ({
  perspective, roleLabel: "RH", availableLenses: ["Q1", "Q2"], activeStage: "Q2", tasks: [], grantedCapabilities: [], environment: "unknown", ...extra,
});

describe("Guia · jornada por perfil (Q1–Q5 × 6 perfis)", () => {
  test("matriz: toda célula mostra título da lente, voz do perfil e os dois blocos, sem URL inventada", () => {
    for (const stage of LENSES) for (const p of PERSPECTIVES) {
      const { container, unmount } = view(stage, p);
      const lens = G.lenses.find((l) => l.lens === stage)!;
      const cell = lens.matrix[p];
      expect(within(container).getByRole("heading", { level: 2 }).textContent, `${stage}/${p}`).toBe(lens.title);
      expect(container.querySelector("#guide-voice")?.textContent, `${stage}/${p}`).toBe(lens.voices[p] ?? cell.who);
      const dts = [...container.querySelectorAll("dt")].map((d) => d.textContent);
      expect(dts.length, `${stage}/${p}`).toBeGreaterThanOrEqual(2);
      expect(container.textContent).toContain(cell.receives);
      if (cell.mode === "dependencia") expect(dts).toContain("O que depende de decisão");
      // Sem sessão: nenhum atalho operacional.
      expect(container.querySelectorAll('a[href^="/ivo-integral"]').length, `${stage}/${p}`).toBe(0);
      unmount();
    }
  });

  test("Q1: só preparação, a coleta oficial fica em texto sob o fluxo preparar → revisar", () => {
    const { container, getByText } = view("Q1", "rh");
    expect(getByText("A coleta oficial está em preparação. Consulte como organizar e revisar a escuta.")).toBeTruthy();
    const flow = container.querySelector('[aria-label="Fluxo da etapa"]')!;
    expect(flow.textContent).toContain("Preparar");
    expect(flow.textContent).toContain("Revisar");
  });

  test("Q4: trilha individual sem setas de envio; reflexão pertence à pessoa", () => {
    const { container } = view("Q4", "colaborador");
    const flow = container.querySelector('[aria-label="Fluxo da etapa"]')!;
    expect(flow.querySelector("svg")).toBeNull();
    expect(container.textContent).toContain("A reflexão fica com você. Compartilhar é uma escolha sua.");
    const dts = [...container.querySelectorAll("dt")].map((d) => d.textContent);
    expect(dts).toEqual(expect.arrayContaining(["Sua parte", "O que fica com você"]));
  });

  test("Q5: exemplo sintético, quatro tipos com origem e próximo compromisso", () => {
    const { container, getByText } = view("Q5", "direcao");
    expect(getByText("Exemplo de síntese anual. Os registros abaixo são fictícios.")).toBeTruthy();
    fireEvent.click(within(container).getByRole("button", { name: /Ver um exemplo/ }));
    for (const kind of ["Execução registrada", "Decisão documentada", "Mudança observada", "Efeito avaliado"]) expect(container.textContent).toContain(kind);
    expect(container.textContent).toContain("Origem: Registro de execução da ação (Q2)");
    expect(container.textContent).toContain("Próximo compromisso");
  });

  test("checagem dá retorno imediato em texto e permite nova tentativa", () => {
    const { container } = view("Q3", "colaborador");
    fireEvent.click(within(container).getByRole("button", { name: /Ver um exemplo/ }));
    fireEvent.click(within(container).getByRole("button", { name: /Só se a liderança aprovar/ }));
    expect(container.querySelector('[role="status"]')?.textContent).toMatch(/Ainda não/);
    fireEvent.click(within(container).getByRole("button", { name: /A revisão serve para decidir/ }));
    expect(container.querySelector('[role="status"]')?.textContent).toMatch(/^Isso\./);
  });

  test("perfil consultado diferente da sessão: aviso, sem atalhos da sessão", () => {
    const { container } = view("Q2", "sst", session("rh", { grantedCapabilities: ["q2.leitura_plano"] }));
    expect(container.textContent).toContain("Sua sessão continua como RH. Aqui você consulta como SST participa.");
  });

  test("falha de consulta e lente não habilitada têm textos distintos; tarefa vazia da liderança", () => {
    const failed = view("Q1", "rh", session("rh", { unavailable: "modules" }));
    expect(failed.container.textContent).toContain("Não foi possível verificar a disponibilidade agora. Tente novamente.");
    failed.unmount();
    const off = view("Q3", "rh", session("rh"));
    expect(off.container.textContent).toContain("Esta etapa ainda não está habilitada nesta organização. Você pode consultar o exemplo.");
    off.unmount();
    const leader = view("Q2", "lideranca", session("lideranca", { grantedCapabilities: ["q2.execucao_lideranca"] }));
    expect(leader.container.textContent).toContain("Nenhuma ação atribuída neste momento.");
  });

  test("troca de etapa e de perfil chama onChange com um campo por vez", () => {
    const calls: unknown[] = [];
    const { container } = view("Q2", "rh", null, (n) => calls.push(n));
    fireEvent.click(within(container).getByRole("button", { name: /^Q4/ }));
    fireEvent.change(within(container).getByRole("combobox"), { target: { value: "colaborador" } });
    expect(calls).toEqual([{ stage: "Q4" }, { perspective: "colaborador" }]);
  });
});
