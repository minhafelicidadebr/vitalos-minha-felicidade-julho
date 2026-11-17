import { afterEach, describe, expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EnterprisePresentation } from "./EnterprisePresentation";
import type { PresentationDeck, PresentationReply } from "./types";
import { getPresentationDeck } from "@/lib/presentation/content.server";

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
  test("profile-specific panel uses the selected role and returns focus to its exploration button", async () => {
    window.location.hash = "perfis";
    fakeFetch(() => ({ state: "ready", deck: getPresentationDeck(), ttlMs: 100_000 }));
    render(<EnterprisePresentation />);
    await screen.findByRole("heading", {
      name: "Cada pessoa participa. Cada acesso tem um propósito.",
    });
    fireEvent.click(screen.getByRole("button", { name: "Coordenação / RH" }));
    const trigger = screen.getByRole("button", { name: "Explorar este perfil" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Coordenação / RH na jornada Q2" }),
    ).toBeDefined();
    expect(within(dialog).getByText("Escopo da própria empresa")).toBeDefined();
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar painel" }));
    await waitFor(() => expect(document.activeElement === trigger).toBe(true));
  });
  test("chapter transitions introduce content without an empty panel or additional entry action", async () => {
    window.location.hash = "movimento";
    fakeFetch(() => ({ state: "ready", deck: getPresentationDeck(), ttlMs: 100_000 }));
    render(<EnterprisePresentation />);
    const heading = await screen.findByRole("heading", {
      name: "O conhecimento ganha vida na prática.",
    });
    const chapter = heading.closest("article")!;
    expect(within(chapter).queryByRole("button")).toBeNull();
    expect(within(chapter).getByRole("img", { name: /Equipe diversa/ })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Próximo slide" }));
    expect(
      screen.getByRole("heading", { name: "Cada pessoa participa. Cada acesso tem um propósito." }),
    ).toBeDefined();
  });
  test("fullscreen refusal leaves the scene usable and offers a clear recovery message", async () => {
    fakeFetch(() => ({ state: "ready", deck: fixture, ttlMs: 100_000 }));
    render(<EnterprisePresentation />);
    const heading = await screen.findByRole("heading", { name: "Fixture slide 1" });
    const root = heading.closest(".enterprise-presentation")!;
    Object.defineProperty(root, "requestFullscreen", {
      configurable: true,
      value: async () => {
        throw new Error("Synthetic unsupported fullscreen");
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar em tela cheia" }));
    await screen.findByText(
      "Tela cheia indisponível neste navegador. Continue explorando nesta janela.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Próximo slide" }));
    expect(screen.getByRole("heading", { name: "Fixture slide 2" })).toBeDefined();
    expect(
      screen.queryByText(
        "Tela cheia indisponível neste navegador. Continue explorando nesta janela.",
      ),
    ).toBeNull();
  });
  test("fullscreen state follows browser events while portals remain descendants of its root", async () => {
    fakeFetch(() => ({ state: "ready", deck: fixture, ttlMs: 100_000 }));
    const descriptor = Object.getOwnPropertyDescriptor(document, "fullscreenElement");
    render(<EnterprisePresentation />);
    const heading = await screen.findByRole("heading", { name: "Fixture slide 1" });
    const root = heading.closest(".enterprise-presentation")!;
    try {
      Object.defineProperty(document, "fullscreenElement", { configurable: true, value: root });
      fireEvent(document, new Event("fullscreenchange"));
      expect(
        screen.getByRole("button", { name: "Sair da tela cheia" }).getAttribute("aria-pressed"),
      ).toBe("true");
      fireEvent.click(screen.getByRole("button", { name: "Open fixture 1" }));
      const dialog = await screen.findByRole("dialog");
      expect(root.contains(dialog)).toBe(true);
      fireEvent.click(within(dialog).getByRole("button", { name: "Fechar painel" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
      fireEvent(document, new Event("fullscreenchange"));
      expect(
        screen.getByRole("button", { name: "Entrar em tela cheia" }).getAttribute("aria-pressed"),
      ).toBe("false");
    } finally {
      if (descriptor) Object.defineProperty(document, "fullscreenElement", descriptor);
      else Reflect.deleteProperty(document, "fullscreenElement");
    }
  });
  test("session recheck removes an open panel together with its protected scene", async () => {
    let locked = false;
    fakeFetch(() =>
      locked ? { state: "locked" } : { state: "ready", deck: fixture, ttlMs: 100_000 },
    );
    render(<EnterprisePresentation />);
    fireEvent.click(await screen.findByRole("button", { name: "Open fixture 1" }));
    await screen.findByRole("dialog");
    locked = true;
    fireEvent(window, new Event("focus"));
    await screen.findByLabelText("Senha da apresentação");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Detail body")).toBeNull();
  });
  test("executive route updates location and normal dialogs stay inside the presentation root", async () => {
    const routeFixture = {
      ...fixture,
      slides: fixture.slides.map((s, i) => ({ ...s, executive: i === 0 })),
    };
    fakeFetch(() => ({ state: "ready", deck: routeFixture, ttlMs: 100_000 }));
    render(<EnterprisePresentation />);
    await screen.findByRole("heading", { name: "Fixture slide 1" });
    fireEvent.click(screen.getByRole("button", { name: "Usar percurso executivo" }));
    expect(window.location.search).toContain("percurso=executivo");
    expect(screen.getByRole("button", { name: "Próximo slide" }).hasAttribute("disabled")).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open fixture 1" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.closest(".enterprise-presentation")).not.toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar painel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Usar percurso completo" }));
    expect(window.location.search).not.toContain("percurso=executivo");
  });
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
