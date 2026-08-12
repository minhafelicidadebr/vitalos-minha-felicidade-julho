import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

type ListResult =
  | {
      ok: true;
      wave: { id: string; instrument: string; label: string; status: string };
      sectors: Array<Record<string, unknown>>;
      unboundLinks: Array<Record<string, unknown>>;
    }
  | { ok: false; error: string };

let listResult: ListResult = {
  ok: true,
  wave: { id: "wave-a", instrument: "FIB_T", label: "Piloto", status: "collecting" },
  sectors: [],
  unboundLinks: [],
};
let deferredList: Promise<ListResult> | null = null;

mock.module("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: "valid-test-session" } } }),
    },
  },
}));

mock.module("@/lib/api/sector-operations.functions", () => ({
  adminListWaveSectorOperations: async () => deferredList ?? listResult,
  adminCreateWaveSector: async () => ({ created: false, error: "not used" }),
  adminIssueWaveSectorLink: async () => ({ created: false, error: "not used" }),
  adminRevokeWaveSectorLink: async () => ({ revoked: false, error: "not used" }),
}));

const { SectorOperationsPanel } = await import("./SectorOperationsPanel");

afterEach(() => {
  cleanup();
  deferredList = null;
});

afterAll(() => {
  mock.restore();
});

function renderPanel() {
  return render(
    <SectorOperationsPanel
      waveId="00000000-0000-4000-8000-000000000001"
      instrument="FIB_T"
      status="collecting"
      pilotEnabled
    />,
  );
}

function openPanel() {
  fireEvent.click(screen.getByRole("button", { name: /Setores e links/i }));
}

describe("SectorOperationsPanel", () => {
  test("renders a loading state while metadata is pending", async () => {
    deferredList = new Promise(() => undefined);
    renderPanel();
    openPanel();
    expect(screen.getByRole("status").textContent).toContain("Carregando setores");
  });

  test("renders the empty state without presenting it as an error", async () => {
    listResult = {
      ok: true,
      wave: { id: "wave-a", instrument: "FIB_T", label: "Piloto", status: "collecting" },
      sectors: [],
      unboundLinks: [],
    };
    renderPanel();
    openPanel();
    await screen.findByText("Cadastre o primeiro setor da onda.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("renders a recoverable backend error", async () => {
    listResult = { ok: false, error: "Falha controlada de metadados" };
    renderPanel();
    openPanel();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Falha controlada de metadados");
  });

  test("renders protected data and identifies an unbound link without token material", async () => {
    listResult = {
      ok: true,
      wave: { id: "wave-a", instrument: "FIB_T", label: "Piloto", status: "collecting" },
      sectors: [
        {
          cohortId: "cohort-a",
          key: "OPERACOES",
          label: "Operacoes",
          reportable: false,
          responseCountLabel: "<5",
          links: [],
        },
      ],
      unboundLinks: [
        {
          id: "link-orphan",
          sectorKey: "TEXTO-LIVRE-LEGADO",
          state: "active",
          expiresAt: "2026-08-20T00:00:00.000Z",
          createdAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    };
    const { container } = renderPanel();
    openPanel();

    await screen.findByText("Operacoes");
    expect(container.textContent).toContain("<5");
    expect(container.textContent).toContain("Links sem setor correspondente");
    expect(container.textContent).toContain("TEXTO-LIVRE-LEGADO");
    expect(container.textContent?.toLowerCase()).not.toContain("token");
    expect(container.innerHTML).not.toContain("w-[");

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /Resultado protegido/i }).getAttribute("href"),
      ).toContain("/fibt-piloto?wave=");
    });
  });
});
