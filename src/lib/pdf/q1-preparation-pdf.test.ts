import { expect, test } from "bun:test";
import { renderPreparationPdf } from "./q1-preparation-pdf";
import { noticeVersion, type PrepView } from "@/domain/survey/q1-preparation";
const id = crypto.randomUUID();
const view: PrepView = {
  scope: id,
  organization: "Empresa Ficticia Alfa",
  cycle: "2027-T1",
  revision: 3,
  state: {
    notice: {
      kind: "notice",
      template: noticeVersion,
      contact: "Canal coletivo",
      returnChannel: "Mural da equipe",
    },
    controls: [
      {
        id,
        label: "Pausas durante a jornada",
        scope: "Expedicao",
        verification: {
          kind: "verify",
          controlId: id,
          source: "dialogue",
          evidence: "Ata coletiva",
          finding: { coverage: "partial", gap: "Inicio do turno sem cobertura" },
        },
      },
    ],
  },
};
test("comunicado revisado circula sem o registro interno de controles", () => {
  const pdf = renderPreparationPdf(view, "comunicado");
  expect(pdf.getNumberOfPages()).toBe(1);
  const data = pdf.output();
  expect(data).toContain("Canal coletivo");
  expect(data).toContain("Mural da equipe");
  expect(data).not.toContain("Ata coletiva");
  expect(data).not.toContain(id);
});
test("memória técnica identifica a cobertura e sua fonte sem dados de questionário", () => {
  const data = renderPreparationPdf(view, "memoria").output();
  expect(data).toContain("Ata coletiva");
  expect(data).toContain("Inicio do turno sem cobertura");
  expect(data).toContain("2027-T1");
  expect(data).not.toContain("Mural da equipe");
});
test("documento exige os seus próprios pré-requisitos", () => {
  const empty = { ...view, state: { controls: [] } };
  expect(() => renderPreparationPdf(empty, "comunicado")).toThrow();
  expect(() => renderPreparationPdf(empty, "memoria")).toThrow();
});
