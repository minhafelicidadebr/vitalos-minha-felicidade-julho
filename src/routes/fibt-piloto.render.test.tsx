import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { FIBT_PILOT_DISABLED_REASON } from "@/lib/fibt/fibt-pilot-flag";
import { requiresFibtCampaignSelection } from "@/lib/fibt/fibt-manager-route";
import {
  EstadoAcessoNegado,
  EstadoCarregando,
  EstadoDesabilitado,
  EstadoErro,
  EstadoIndisponivel,
  EstadoVazio,
} from "./fibt-piloto";

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

  // ── Macro-onda 10.2-B, etapa 5 ────────────────────────────────────────────
  // Antes, TODO `ok:false` (autorização, fronteira HML, gate de piloto e falha
  // de backend) caía na mesma tela de erro com `role="alert"` — o operador ia
  // procurar um defeito de infraestrutura diante de uma recusa de acesso.

  test("acesso negado não é apresentado como falha técnica", () => {
    render(<EstadoAcessoNegado message="A sessão HML não está atestada para esta operação." />);
    const box = screen.getByTestId("piloto-acesso-negado");
    expect(box.textContent).toContain("Acesso não autorizado");
    expect(box.textContent).toContain("A sessão HML não está atestada");
    expect(box.textContent).toContain("antes de qualquer consulta");
    // Nem alerta, nem "tentar novamente": repetir não muda a decisão.
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("indisponibilidade de configuração é distinta de erro e de acesso negado", () => {
    render(<EstadoIndisponivel message={FIBT_PILOT_DISABLED_REASON} />);
    const box = screen.getByTestId("piloto-indisponivel");
    expect(box.textContent).toContain("indisponível neste ambiente");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByTestId("piloto-acesso-negado")).toBeNull();
  });

  test("os três estados de indisponibilidade têm títulos distintos entre si", () => {
    const titles = new Set<string>();
    for (const node of [
      <EstadoAcessoNegado key="a" message="m" />,
      <EstadoIndisponivel key="b" message="m" />,
      <EstadoErro key="c" message="m" />,
    ]) {
      const { container, unmount } = render(node);
      titles.add(container.querySelector("p")!.textContent!);
      unmount();
    }
    expect(titles.size).toBe(3);
  });
});
