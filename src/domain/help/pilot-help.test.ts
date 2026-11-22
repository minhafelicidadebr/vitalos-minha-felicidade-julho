import { describe, expect, test } from "bun:test";
import { validateHelpEntry } from "@/engine/help/contextual-help-engine";
import { CONTEXTUAL_HELP } from "./contextual-help";
import { EMBAIXADORIA_CARD_HELP } from "./embaixadorias-help";
import {
  HELP_COLABORADOR_ACADEMIA,
  HELP_DEVOLUTIVA_COLETIVA,
  HELP_LIDER_ACAO,
  HELP_RH_JORNADA,
  PILOT_HELP,
} from "./pilot-help";

describe("ajuda contextual · onda 4 (devolutiva, liderança, RH)", () => {
  test("as três entradas passam no validador (fonte de produto, sem termo proibido)", () => {
    for (const e of PILOT_HELP) expect(validateHelpEntry(e)).toEqual([]);
  });

  test("só regra de produto: nenhuma cita estudo nem fixa claim", () => {
    for (const e of PILOT_HELP) {
      expect(e.evidence).toBeUndefined();
      expect(e.sources.every((s) => s.nature === "produto")).toBe(true);
    }
  });

  test("perguntas não repetem as de outras telas", () => {
    const outras = [...CONTEXTUAL_HELP, ...Object.values(EMBAIXADORIA_CARD_HELP)].map((e) => e.question);
    for (const e of PILOT_HELP) expect(outras).not.toContain(e.question);
  });

  test("devolutiva diz que é coletiva, quem vê e o limite de 5", () => {
    expect(HELP_DEVOLUTIVA_COLETIVA.summary).toContain("Sobre o grupo");
    expect(HELP_DEVOLUTIVA_COLETIVA.dataScope).toContain("5 ou mais");
    expect(HELP_DEVOLUTIVA_COLETIVA.dataScope).toContain("nem para o RH");
    expect(HELP_DEVOLUTIVA_COLETIVA.roles.rh?.link?.to).toBe("/ivo-integral/acoes");
  });

  test("liderança: registro esperado, quem recebe e limite de acesso; aponta para a tarefa real", () => {
    expect(HELP_LIDER_ACAO.summary).toContain("registra a execução");
    expect(HELP_LIDER_ACAO.afterwards).toContain("sem o seu nome");
    expect(HELP_LIDER_ACAO.limits.join(" ")).toContain("não cria nem ativa o plano");
    expect(HELP_LIDER_ACAO.roles.geral.link?.to).toBe("/ivo-integral/acoes");
    expect(HELP_LIDER_ACAO.demoNotice).toContain("demonstração");
  });

  test("nenhuma ajuda apresenta a cerimônia (desligada no produto) como passo", () => {
    for (const e of PILOT_HELP) expect(JSON.stringify(e).toLowerCase()).not.toContain("cerimônia");
  });

  test("colaborador: quem vê, sem identificar pessoas, limite de 5 e sem avaliação", () => {
    expect(HELP_COLABORADOR_ACADEMIA.summary).toContain("nunca quem");
    expect(HELP_COLABORADOR_ACADEMIA.summary).toContain("5 pessoas ou mais");
    expect(HELP_COLABORADOR_ACADEMIA.dataScope).toContain("não veem");
    expect(HELP_COLABORADOR_ACADEMIA.limits.join(" ")).toContain("avaliação de desempenho");
  });

  test("RH: leitura, designação, acompanhamento e devolutiva, nesta ordem", () => {
    expect(HELP_RH_JORNADA.flow?.map((f) => f.verb)).toEqual(["Ler", "Designar", "Acompanhar", "Devolver"]);
  });
});
