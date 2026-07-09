import { describe, expect, test } from "bun:test";
import { parseUtmParams, validateLeadSubmission, type LeadSubmission } from "./lead-capture-engine";

const VALID: LeadSubmission = {
  name: "Marina Santos",
  company: "Instituto Felicidade",
  role: "CHRO",
  email: "marina@empresa.com",
  whatsapp: "(11) 90000-0000",
  interest: "Riscos psicossociais (NR-1)",
  sourcePage: "/nr1",
  consent: true,
  consentVersion: "2026.1",
};

describe("lead-capture-engine — parseUtmParams", () => {
  test("extrai os 5 parâmetros UTM de uma querystring completa", () => {
    const result = parseUtmParams(
      "?utm_source=linkedin&utm_medium=social&utm_campaign=nr1-julho&utm_term=copsoq&utm_content=post1",
    );
    expect(result).toEqual({
      source: "linkedin",
      medium: "social",
      campaign: "nr1-julho",
      term: "copsoq",
      content: "post1",
    });
  });

  test("sem querystring → todos os campos null (nunca inventa origem)", () => {
    expect(parseUtmParams("")).toEqual({
      source: null,
      medium: null,
      campaign: null,
      term: null,
      content: null,
    });
  });

  test("querystring parcial → só os presentes são preenchidos", () => {
    const result = parseUtmParams("?utm_source=google");
    expect(result.source).toBe("google");
    expect(result.medium).toBeNull();
  });

  test("ignora parâmetros que não são utm_*", () => {
    const result = parseUtmParams("?ref=xyz&utm_source=email");
    expect(result.source).toBe("email");
  });
});

describe("lead-capture-engine — validateLeadSubmission (consentimento nunca assumido)", () => {
  test("submissão válida com consentimento explícito → ok", () => {
    expect(validateLeadSubmission(VALID).reason).toBe("ok");
  });

  test("sem consentimento → recusada, mesmo com todos os outros campos certos", () => {
    expect(validateLeadSubmission({ ...VALID, consent: false }).reason).toBe("missing_consent");
  });

  test("consentVersion vazia → recusada mesmo com consent=true (versão rastreável é obrigatória)", () => {
    expect(validateLeadSubmission({ ...VALID, consentVersion: "" }).reason).toBe("missing_consent");
  });

  test("campos obrigatórios vazios → invalid_request", () => {
    expect(validateLeadSubmission({ ...VALID, name: "" }).reason).toBe("invalid_request");
    expect(validateLeadSubmission({ ...VALID, company: "  " }).reason).toBe("invalid_request");
    expect(validateLeadSubmission({ ...VALID, email: "" }).reason).toBe("invalid_request");
    expect(validateLeadSubmission({ ...VALID, interest: "" }).reason).toBe("invalid_request");
    expect(validateLeadSubmission({ ...VALID, sourcePage: "" }).reason).toBe("invalid_request");
  });

  test("role e whatsapp vazios são aceitos (opcionais)", () => {
    expect(validateLeadSubmission({ ...VALID, role: "", whatsapp: "" }).reason).toBe("ok");
  });

  test("e-mail sem formato válido → invalid_email", () => {
    expect(validateLeadSubmission({ ...VALID, email: "nao-e-email" }).reason).toBe("invalid_email");
    expect(validateLeadSubmission({ ...VALID, email: "a@b" }).reason).toBe("invalid_email");
  });

  test("campo além do teto de tamanho → field_too_long", () => {
    expect(validateLeadSubmission({ ...VALID, name: "a".repeat(201) }).reason).toBe(
      "field_too_long",
    );
  });

  test("determinístico: mesma entrada → mesma saída", () => {
    expect(validateLeadSubmission(VALID)).toEqual(validateLeadSubmission({ ...VALID }));
  });
});
