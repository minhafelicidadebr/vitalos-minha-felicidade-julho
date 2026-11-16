import { afterEach, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AuthCallbackStatus, MagicLinkForm } from "./InstitutionalAuth";

afterEach(cleanup);
test("envio pendente bloqueia submissões repetidas e edição; sucesso orienta sem afirmar existência", async () => {
  let finish!: () => void;
  const send = mock(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  render(<MagicLinkForm sendLink={send} />);
  const input = screen.getByLabelText("E-mail corporativo") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "alfa@institutional.test" } });
  const form = input.closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(send).toHaveBeenCalledTimes(1);
  expect(input.disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Enviando…" }).getAttribute("aria-busy")).toBe("true");
  act(() => finish());
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(screen.getByRole("status").textContent).toContain("Se o acesso estiver disponível");
  expect(document.activeElement?.textContent).toBe("Verifique seu e-mail");
  fireEvent.click(screen.getByRole("button", { name: "Usar outro e-mail ou solicitar novo link" }));
  await new Promise((resolve) => setTimeout(resolve, 40));
  expect(document.activeElement?.id).toBe("institutional-email");
  expect(send).toHaveBeenCalledTimes(1);
});
test("erro não revela diagnóstico do provedor e permite retry explícito", async () => {
  const send = mock(async () => {
    throw new Error("account missing: secret-provider-trace");
  });
  render(<MagicLinkForm sendLink={send} />);
  const input = screen.getByLabelText("E-mail corporativo");
  fireEvent.change(input, { target: { value: "wrong@institutional.test" } });
  fireEvent.submit(input.closest("form")!);
  await new Promise((resolve) => setTimeout(resolve, 40));
  expect(screen.getByRole("alert").textContent).not.toContain("secret-provider");
  expect(document.activeElement?.getAttribute("role")).toBe("alert");
  fireEvent.submit(input.closest("form")!);
  expect(send).toHaveBeenCalledTimes(2);
  await new Promise((resolve) => setTimeout(resolve, 40));
});
test("callback inválido oferece novo link, falha de perfil oferece retry sem onboarding", () => {
  const retry = mock();
  const { rerender } = render(
    <AuthCallbackStatus
      result={{ kind: "invalid_link" }}
      returnHref="/entrar?redirect=%2Frh"
      retry={retry}
    />,
  );
  expect(screen.getByRole("link", { name: "Solicitar novo link" }).getAttribute("href")).toBe(
    "/entrar?redirect=%2Frh",
  );
  rerender(
    <AuthCallbackStatus
      result={{ kind: "profile_unavailable" }}
      returnHref="/entrar"
      retry={retry}
    />,
  );
  expect(screen.queryByRole("link")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert").textContent).toContain("não altera seu vínculo");
});
