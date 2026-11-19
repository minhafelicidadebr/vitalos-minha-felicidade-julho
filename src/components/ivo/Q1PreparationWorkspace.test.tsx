import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Q1PreparationWorkspace } from "./Q1PreparationWorkspace";
import {
  applyPreparation,
  noticeVersion,
  type PrepResult,
  type PrepSave,
  type PrepView,
} from "@/domain/survey/q1-preparation";
afterEach(cleanup);
test("o seletor de controle tem um nome acessível independente das 25 opções", async () => {
  const f = fixture();
  render(<Q1PreparationWorkspace scope={scope} cycle={cycle} client={f.client} />);
  const toggle = await screen.findByText("Declarar um controle");
  toggle.closest("details")!.open = true;
  expect(screen.getByRole("combobox", { name: "Controle existente" })).toBeTruthy();
  expect(
    screen.getByRole("textbox", { name: "Recorte de trabalho" }).getAttribute("aria-describedby"),
  ).toBeTruthy();
});
const scope = crypto.randomUUID(),
  cycle = "2027-T1";
const fresh = (): PrepView => ({
  scope,
  cycle,
  organization: "Alfa fictícia",
  revision: 0,
  state: { controls: [] },
});
function fixture() {
  let view = fresh();
  let blocked = false;
  let retry = false;
  const requests: string[] = [],
    downloads: string[] = [];
  const client = {
    read: async (): Promise<PrepResult> =>
      blocked ? { ok: false, reason: "forbidden" } : { ok: true, view },
    save: async (input: Omit<PrepSave, "accessToken">): Promise<PrepResult> => {
      requests.push(input.requestId);
      if (retry) {
        retry = false;
        return { ok: false, reason: "unavailable" };
      }
      const next = applyPreparation(view.state, { id: input.requestId, command: input.command });
      if ("ok" in next) return next;
      view = { ...view, revision: view.revision + 1, state: next };
      return { ok: true, view };
    },
    download: async (_: PrepView, kind: string) => {
      downloads.push(kind);
    },
  };
  return {
    client,
    requests,
    downloads,
    revoke: () => {
      blocked = true;
    },
    loseAck: () => {
      retry = true;
    },
    advance: () => {
      view = { ...view, revision: view.revision + 1 };
    },
  };
}
function update(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
test("estado vazio, comunicado revisado, exportação reautorizada e revogação", async () => {
  const f = fixture();
  render(<Q1PreparationWorkspace scope={scope} cycle={cycle} client={f.client} />);
  expect(await screen.findByText(/O ciclo ainda não tem controles/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Baixar comunicado" })).toBeNull();
  update(/Canal institucional para dúvidas/, "Plantão coletivo");
  update(/Onde a equipe acompanhará/, "Mural interno");
  f.loseAck();
  fireEvent.click(screen.getByRole("button", { name: "Registrar comunicado revisado" }));
  expect(await screen.findByText(/repetir o mesmo envio/)).toBeTruthy();
  expect(
    (screen.getByLabelText(/Canal institucional para dúvidas/) as HTMLInputElement).value,
  ).toBe("Plantão coletivo");
  fireEvent.click(screen.getByRole("button", { name: "Registrar comunicado revisado" }));
  const download = await screen.findByRole("button", { name: "Baixar comunicado" });
  expect(f.requests[0]).toBe(f.requests[1]);
  fireEvent.click(download);
  await waitFor(() => expect(f.downloads).toEqual(["comunicado"]));
  f.revoke();
  fireEvent.click(download);
  expect(await screen.findByText(/empresa habilitada para Q1/)).toBeTruthy();
  expect(screen.queryByText(/Canal de dúvidas ·/)).toBeNull();
  expect(f.downloads).toHaveLength(1);
});
test("revisão concorrente exige recarregar antes de novo envio", async () => {
  const f = fixture();
  render(<Q1PreparationWorkspace scope={scope} cycle={cycle} client={f.client} />);
  await screen.findByText(/O ciclo ainda não tem controles/);
  f.advance();
  fireEvent.focus(window);
  expect(await screen.findByText(/outra sessão/)).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Registrar comunicado revisado" }).closest("fieldset")
      ?.disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Reler preparação" }));
  await screen.findByText(/revisão 1/);
  expect(
    screen.getByRole("button", { name: "Registrar comunicado revisado" }).closest("fieldset")
      ?.disabled,
  ).toBe(false);
});
test("resposta de sessão trocada não mostra conteúdo da organização anterior", async () => {
  const f = fixture();
  const stale = {
    ...fresh(),
    scope: crypto.randomUUID(),
    state: {
      notice: {
        kind: "notice",
        template: noticeVersion,
        contact: "Reservado",
        returnChannel: "Outro RH",
      } as const,
      controls: [],
    },
  };
  render(
    <Q1PreparationWorkspace
      scope={scope}
      cycle={cycle}
      client={{ ...f.client, read: async () => ({ ok: true, view: stale }) }}
    />,
  );
  await screen.findByRole("alert");
  expect(screen.queryByText(/Reservado/)).toBeNull();
});
