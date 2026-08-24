import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { FIBT_PILOT_DISABLED_REASON } from "@/lib/fibt/fibt-pilot-flag";
import { requiresFibtCampaignSelection } from "@/lib/fibt/fibt-manager-route";
import { EstadoCarregando, EstadoDesabilitado, EstadoErro, EstadoVazio } from "./fibt-piloto";

afterEach(cleanup);

describe("FIB-T manager route states", () => {
  test("HML resolves its canonical campaign even with a Supabase session", () => {
    expect(requiresFibtCampaignSelection("true", null)).toBe(false);
    expect(requiresFibtCampaignSelection("false", null)).toBe(true);
    expect(requiresFibtCampaignSelection(undefined, "wave-a")).toBe(false);
  });

  test("loading is announced", () => {
    render(<EstadoCarregando />);
    expect(screen.getByRole("status").textContent).toContain("Carregando campanha");
  });

  test("feature gate is a deliberate unavailable state", () => {
    render(<EstadoDesabilitado />);
    expect(screen.getByTestId("piloto-desabilitado").textContent).toBe(
      "Piloto indisponível neste ambiente" + FIBT_PILOT_DISABLED_REASON,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("missing campaign directs the admin back to campaign selection", () => {
    render(<EstadoVazio />);
    expect(screen.getByRole("link", { name: "Voltar para campanhas" }).getAttribute("href")).toBe(
      "/admin",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("backend error is explicit and never substitutes demo data", () => {
    render(<EstadoErro message="Falha controlada" />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Falha controlada");
    expect(alert.textContent).toContain("Nenhum dado de demonstração");
  });
});
