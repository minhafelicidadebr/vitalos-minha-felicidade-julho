import { afterEach, describe, expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EnterprisePresentation } from "./EnterprisePresentation";
import type { PresentationDeck, PresentationReply } from "./types";

const originalFetch = globalThis.fetch;
const fixture: PresentationDeck = {
  edition: "Synthetic edition",
  contact: { label: "Contato de teste", href: "https://example.invalid/contact" },
  slides: ["first", "second"].map((id, i) => ({
    id,
    chapter: "Fixture chapter",
    eyebrow: "Fixture",
    title: `Fixture slide ${i + 1}`,
    summary: "Synthetic summary",
    kind: "context",
    note: "Synthetic qualification",
    cards: [{ label: "Fixture", title: "Fixture card", body: "Fixture body", icon: "heart" }],
    detailCta: `Open fixture ${i + 1}`,
    detail: {
      title: `Detail fixture ${i + 1}`,
      introduction: "Fixture detail",
      blocks: [{ label: "Fixture", title: "Detail card", body: "Detail body", icon: "shield" }],
    },
  })),
};
function fakeFetch(response: (init?: RequestInit) => unknown) {
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) =>
    Response.json(response(init))) as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = originalFetch;
  window.history.replaceState(null, "", "/");
});

describe("enterprise presentation experience", () => {
  test("anonymous entry renders only access; submitted password is cleared and not in location", async () => {
    let requestBody = "";
    fakeFetch((init) => {
      if (init?.method === "POST") {
        requestBody = String(init.body);
        return { state: "locked" };
      }
      return { state: "locked" };
    });
    render(<EnterprisePresentation />);
    const password = (await screen.findByLabelText("Senha da apresentação")) as HTMLInputElement;
    expect(screen.queryByRole("heading", { name: "Fixture slide 1" })).toBeNull();
    fireEvent.change(password, { target: { value: "synthetic-ui-only" } });
    fireEvent.submit(password.closest("form")!);
    await waitFor(() => expect(requestBody).toContain("synthetic-ui-only"));
    expect(password.value).toBe("");
    expect(window.location.href).not.toContain("synthetic-ui-only");
  });
  test("next and previous render one slide, update the fragment and restore heading focus", async () => {
    fakeFetch(
      () => ({ state: "ready", deck: fixture, ttlMs: 100_000 }) satisfies PresentationReply,
    );
    render(<EnterprisePresentation />);
    await screen.findByRole("heading", { name: "Fixture slide 1" });
    expect(screen.queryByRole("heading", { name: "Fixture slide 2" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Próximo slide" }));
    await screen.findByRole("heading", { name: "Fixture slide 2" });
    expect(window.location.hash).toBe("#second");
    expect(document.activeElement?.id).toBe("titulo-second");
    fireEvent.click(screen.getByRole("button", { name: "Slide anterior" }));
    expect(screen.getByRole("heading", { name: "Fixture slide 1" })).toBeDefined();
  });
  test("continuous reading and direct fragment reuse the same slide content", async () => {
    window.location.hash = "second";
    fakeFetch(() => ({ state: "ready", deck: fixture, ttlMs: 100_000 }));
    render(<EnterprisePresentation />);
    await screen.findByRole("heading", { name: "Fixture slide 2" });
    fireEvent.click(screen.getByRole("button", { name: "Usar leitura contínua" }));
    expect(screen.getByRole("heading", { name: "Fixture slide 1" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Fixture slide 2" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Usar modo de slides" }));
    expect(screen.queryByRole("heading", { name: "Fixture slide 1" })).toBeNull();
  });
  test("detail opens an accessible dialog with an explicit close action", async () => {
    fakeFetch(() => ({ state: "ready", deck: fixture, ttlMs: 100_000 }));
    render(<EnterprisePresentation />);
    fireEvent.click(await screen.findByRole("button", { name: "Open fixture 1" }));
    const dialog = await screen.findByRole("dialog", { name: "Detail fixture 1" });
    expect(within(dialog).getByText("Detail body")).toBeDefined();
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar painel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  test("logout immediately removes protected content and a later focus rechecks the server", async () => {
    let locked = false;
    fakeFetch((init) => {
      if (init?.method === "DELETE") locked = true;
      return locked ? { state: "locked" } : { state: "ready", deck: fixture, ttlMs: 100_000 };
    });
    render(<EnterprisePresentation />);
    await screen.findByRole("heading", { name: "Fixture slide 1" });
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    await screen.findByLabelText("Senha da apresentação");
    fireEvent(window, new Event("focus"));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Fixture slide 1" })).toBeNull(),
    );
  });
});
