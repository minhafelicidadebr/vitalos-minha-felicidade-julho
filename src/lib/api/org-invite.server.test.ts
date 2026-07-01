import { describe, expect, test } from "bun:test";
import { isAllowedPlatformAdminEmail, parsePlatformAdminAllowlist } from "./org-invite.server";

describe("org-invite: allowlist de admin da plataforma", () => {
  test("aceita e-mail exato na lista", () => {
    expect(isAllowedPlatformAdminEmail("founder@vitalos.com", "founder@vitalos.com")).toBe(true);
  });

  test("é case-insensitive dos dois lados", () => {
    expect(isAllowedPlatformAdminEmail("Founder@VitalOS.com", "founder@vitalos.com")).toBe(true);
    expect(isAllowedPlatformAdminEmail("founder@vitalos.com", "FOUNDER@VITALOS.COM")).toBe(true);
  });

  test("tolera espaços ao redor de cada e-mail na lista", () => {
    expect(isAllowedPlatformAdminEmail("a@x.com", " a@x.com , b@y.com ")).toBe(true);
    expect(isAllowedPlatformAdminEmail("b@y.com", " a@x.com , b@y.com ")).toBe(true);
  });

  test("rejeita e-mail fora da lista", () => {
    expect(isAllowedPlatformAdminEmail("invasor@fora.com", "founder@vitalos.com")).toBe(false);
  });

  test("nunca autoriza quando a variável de ambiente está ausente ou vazia — falha fechada", () => {
    expect(isAllowedPlatformAdminEmail("qualquer@coisa.com", undefined)).toBe(false);
    expect(isAllowedPlatformAdminEmail("qualquer@coisa.com", "")).toBe(false);
    expect(isAllowedPlatformAdminEmail("qualquer@coisa.com", "   ")).toBe(false);
  });

  test("suporta múltiplos administradores separados por vírgula", () => {
    const list = "a@x.com,b@y.com,c@z.com";
    expect(isAllowedPlatformAdminEmail("a@x.com", list)).toBe(true);
    expect(isAllowedPlatformAdminEmail("b@y.com", list)).toBe(true);
    expect(isAllowedPlatformAdminEmail("c@z.com", list)).toBe(true);
    expect(isAllowedPlatformAdminEmail("d@w.com", list)).toBe(false);
  });

  test("parsePlatformAdminAllowlist ignora entradas vazias (vírgula dupla, trailing comma)", () => {
    expect(parsePlatformAdminAllowlist("a@x.com,,b@y.com,")).toEqual(["a@x.com", "b@y.com"]);
  });

  test("não faz correspondência parcial (substring) — e-mail precisa bater inteiro", () => {
    expect(isAllowedPlatformAdminEmail("founder@vitalos.com.br", "founder@vitalos.com")).toBe(false);
    expect(isAllowedPlatformAdminEmail("evilfounder@vitalos.com", "founder@vitalos.com")).toBe(false);
  });
});
