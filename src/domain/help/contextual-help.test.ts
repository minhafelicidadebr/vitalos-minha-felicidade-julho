import { describe, expect, test } from "bun:test";
import {
  CONTEXTUAL_HELP,
  HELP_EVIDENCE_CANDIDATES,
  HELP_EXPEDICAO_PRIORIDADE,
  HELP_GUARDIOES_VOZ_SEGURA,
  resolveHelpEvidence,
} from "./contextual-help";
import { resolveHelp, validateHelpEntry as validate, type HelpRole } from "@/engine/help/contextual-help-engine";
import { AMBASSADORSHIPS } from "@/mocks/embaixadorias-mock";

const ROLES: HelpRole[] = ["colaborador", "lideranca", "rh", "sst", "direcao"];

describe("contextual help content v0.1", () => {
  test("toda entrada passa no validador editorial", () => {
    for (const entry of CONTEXTUAL_HELP) expect({ id: entry.id, problems: validate(entry) }).toEqual({ id: entry.id, problems: [] });
  });

  test("ids e âncoras são únicos", () => {
    const ids = CONTEXTUAL_HELP.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const anchors = CONTEXTUAL_HELP.map((e) => `${e.route}#${e.anchor}`);
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  test("Guardiões aponta para um card real e cobre os cinco papéis", () => {
    expect(AMBASSADORSHIPS.some((a) => `card-${a.id}` === HELP_GUARDIOES_VOZ_SEGURA.anchor)).toBe(true);
    for (const r of ROLES) expect(HELP_GUARDIOES_VOZ_SEGURA.roles[r]).toBeDefined();
    expect(HELP_GUARDIOES_VOZ_SEGURA.flow?.map((f) => f.verb)).toEqual(["Ouvir", "Combinar um retorno", "Acompanhar"]);
  });

  test("sem claim registrado para a ajuda, nenhum papel recebe estudo (registro congelado)", () => {
    for (const entry of CONTEXTUAL_HELP)
      for (const r of ROLES)
        expect(resolveHelp(entry, r, { resolveEvidence: resolveHelpEvidence }).evidence).toBeNull();
    expect(HELP_EVIDENCE_CANDIDATES.map((c) => c.helpId)).toContain(HELP_GUARDIOES_VOZ_SEGURA.id);
  });

  test("Expedição declara os seis estados e cita o item 11.4.4 do Manual", () => {
    expect(Object.keys(HELP_EXPEDICAO_PRIORIDADE.states ?? {}).sort()).toEqual(
      ["comparable", "demo", "loading", "one", "unavailable", "zero"],
    );
    const official = HELP_EXPEDICAO_PRIORIDADE.sources.filter((s) => s.nature === "orientacao_oficial");
    expect(official.some((s) => s.locator?.startsWith("Item 11.4.4"))).toBe(true);
    expect(official.every((s) => s.href?.startsWith("https://www.gov.br/"))).toBe(true);
  });
});
