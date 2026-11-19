import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PartnerInterestForm } from "./PartnerInterestForm";

afterEach(cleanup);

test("preserva o preenchimento e repete a mesma candidatura após perder a confirmação", async () => {
  const ids: string[] = [];
  render(
    <PartnerInterestForm
      client={{
        available: async () => true,
        submit: async (options) => {
          ids.push(options.data.id);
          if (ids.length === 1) throw new Error("Resposta perdida");
          return { status: "received" };
        },
      }}
    />,
  );
  const name = (await screen.findByLabelText("Nome profissional")) as HTMLInputElement;
  fireEvent.change(name, { target: { value: "Pessoa fictícia" } });
  fireEvent.change(screen.getByLabelText(/E-mail fictício/), {
    target: { value: "pessoa@rede.test" },
  });
  fireEvent.change(screen.getByLabelText(/Região ou modalidade/), {
    target: { value: "Atendimento remoto" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  const form = name.closest("form")!;
  fireEvent.submit(form);
  await screen.findByRole("alert");
  expect(name.value).toBe("Pessoa fictícia");
  fireEvent.submit(form);
  await screen.findByText("Interesse recebido na fila de triagem local.");
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
  fireEvent.submit(form);
  expect(ids).toHaveLength(2);
});

test("mantém a captação fechada quando o servidor não autoriza o ensaio", async () => {
  let checked = false;
  render(
    <PartnerInterestForm
      client={{
        available: async () => {
          checked = true;
          return false;
        },
        submit: async () => {
          throw new Error("Envio inesperado");
        },
      }}
    />,
  );
  await waitFor(() => expect(checked).toBe(true));
  expect(screen.queryByRole("button", { name: "Enviar interesse" })).toBeNull();
});
