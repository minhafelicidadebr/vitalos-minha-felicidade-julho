import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { ManagerAnalytics } from "@/lib/fibt/fibt-manager-control-center";
import type { FibtManagerSnapshot } from "@/lib/fibt/fibt-manager-control-center.server";
import { AnalyticsState, FibtManagerControlCenter } from "./FibtManagerControlCenter";

afterEach(cleanup);

const available: ManagerAnalytics = {
  state: "available",
  countLabel: "5",
  n: 5,
  result: {
    escoreBruto: 9,
    factors: [
      { id: "f1", name: "Fator 1", mean: 3, domains: [] },
      { id: "f2", name: "Fator 2", mean: 3, domains: [] },
      { id: "f3", name: "Fator 3", mean: 3, domains: [] },
    ],
    domains: [],
  },
};

describe("FIB-T manager analytics states", () => {
  test("available renders all three canonical factors", () => {
    render(<AnalyticsState analytics={available} />);
    expect(screen.getByTestId("analytics-available").textContent).toContain("Fator 1");
    expect(screen.getByTestId("analytics-available").textContent).toContain("Fator 2");
    expect(screen.getByTestId("analytics-available").textContent).toContain("Fator 3");
    expect(screen.getByTestId("analytics-available").textContent).toContain("9 / 12");
  });

  test("suppressed never renders a score", () => {
    render(
      <AnalyticsState
        analytics={{
          state: "suppressed",
          countLabel: "<5",
          kMin: 5,
          message: "Dado ainda não publicável - mínimo de 5 participações válidas.",
        }}
      />,
    );
    const text = screen.getByTestId("analytics-suppressed").textContent ?? "";
    expect(text).toContain("Dado ainda não publicável");
    expect(text).not.toMatch(/\d+\s*\/\s*12/);
  });

  test("no data is distinct from suppression and error", () => {
    render(
      <AnalyticsState
        analytics={{ state: "no_data", countLabel: "0", message: "Nenhuma participacao valida." }}
      />,
    );
    expect(screen.getByTestId("analytics-no-data")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("methodology error is announced", () => {
    render(
      <AnalyticsState
        analytics={{ state: "error", countLabel: "Indisponível", message: "Agregado incompleto." }}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("Agregado incompleto");
  });
});

describe("FIB-T manager control center layout", () => {
  test("connects campaign, privacy, sectors, links and next action without fixed-width overflow", () => {
    const suppressed: ManagerAnalytics = {
      state: "suppressed",
      countLabel: "<5",
      kMin: 5,
      message: "Dado ainda não publicável - mínimo de 5 participações válidas.",
    };
    const snapshot: FibtManagerSnapshot = {
      campaign: {
        waveId: "00000000-0000-4000-8000-000000000001",
        organizationName: "ISG Sintetica",
        label: "Validacao controlada",
        instrument: "FIB_T",
        instrumentVersion: "1.0.0",
        status: "collecting",
        createdAt: "2026-08-01T00:00:00.000Z",
        closesAt: null,
        environment: "hml_staging",
        hmlAttested: true,
      },
      participation: {
        state: "suppressed",
        countLabel: "<5",
        publishableCohorts: 0,
        totalCohorts: 1,
      },
      waveAnalytics: suppressed,
      sectors: [
        {
          id: "cohort-a",
          key: "TESTE-ISG-A",
          label: "TESTE-ISG-A",
          operationalState: "collecting",
          participationState: "suppressed",
          participationLabel: "<5",
          publicationEligible: false,
          analytics: suppressed,
          links: [
            {
              id: "link-a",
              state: "active",
              expiresAt: "2026-08-20T00:00:00.000Z",
              createdAt: "2026-08-01T00:00:00.000Z",
            },
          ],
        },
      ],
      factorComparison: [],
      readiness: {
        state: "ready",
        operational: true,
        blockers: [],
        nextAction: "Manter a coleta controlada.",
      },
      telemetry: [],
      privacy: { kMin: 5, individualResponsesExposed: false, rawTokensExposed: false },
    };

    const { container } = render(
      <FibtManagerControlCenter snapshot={snapshot} onReload={() => undefined} />,
    );
    expect(screen.getByRole("heading", { name: "Validacao controlada" })).toBeDefined();
    expect(screen.getByText("HML atestado - dados sintéticos")).toBeDefined();
    expect(screen.getByText("Manter a coleta controlada.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Revogar link" })).toBeDefined();
    expect(container.textContent).toContain("Publicação mínima n=5");
    expect(container.innerHTML).not.toMatch(/w-\[\d+px\]/);
    expect(container.innerHTML).not.toContain("overflow-x-scroll");
    expect(container.innerHTML).toContain("min-h-11");
  });
});
