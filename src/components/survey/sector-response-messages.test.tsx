import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { getWaveSurvey } from "@/mocks/survey-mock";
import { ConsentScreen, ThanksScreen } from "@/routes/respond.s.$token";

afterEach(cleanup);

const grant = {
  valid: true as const,
  sectorLabel: "Equipe sintética",
  campaignTitle: "Campanha sintética",
  instrumentShort: "FIB-T",
  opensAt: "2026-11-15",
  closesAt: "2026-11-29",
  accessMode: "shared_sector" as const,
  waveId: "synthetic-wave",
  surveyId: "fibt-32",
};

describe("mensagens da resposta setorial preservam o instrumento servido", () => {
  test("consentimento FIB-T não se apresenta como avaliação de risco COPSOQ", () => {
    const survey = getWaveSurvey("enterprise", "FIB-T")!;
    const { container } = render(
      <ConsentScreen grant={grant} survey={survey} onAccept={() => {}} />,
    );
    expect(screen.getByText(survey.intro.eyebrow)).toBeTruthy();
    expect(container.textContent).not.toMatch(/Domínio B|Risco Psicossocial/);
    expect(
      screen.getByRole("button", { name: "Começar a pesquisa →" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  test("COPSOQ mantém sua identidade e o aviso específico sem herdar o texto FIB-T", () => {
    const survey = getWaveSurvey("enterprise", "COPSOQ")!;
    const { container } = render(
      <ConsentScreen
        grant={{ ...grant, instrumentShort: "COPSOQ", surveyId: survey.id }}
        survey={survey}
        onAccept={() => {}}
      />,
    );
    expect(screen.getByText(survey.intro.eyebrow)).toBeTruthy();
    expect(container.textContent).toContain("Domínio B");
    expect(container.textContent).toContain("redação destes itens é demonstrativa");
  });

  test("recibo FIB-T usa agradecimento nativo e não promete disponibilidade automática ou GRO", () => {
    const survey = getWaveSurvey("enterprise", "FIB-T")!;
    const { container } = render(<ThanksScreen grant={grant} survey={survey} receipt={null} />);
    expect(screen.getByRole("heading", { name: survey.intro.thanksTitle })).toBeTruthy();
    expect(screen.getByText(survey.intro.thanksBody)).toBeTruthy();
    expect(container.textContent).not.toMatch(/GRO|NR-1|Ao atingir 5 respondentes/);
    expect(container.textContent).toContain("a quantidade, sozinha, não garante disponibilidade");
  });
});
