import { describe, expect, test } from "bun:test";
import { buildInviteEmail } from "./invite-email-template";

describe("invite-email-template", () => {
  const base = {
    orgName: "TechCorp Ltda",
    inviteLink: "https://app.vitalos.com.br/convite/abc123",
    instrumentLabel: "COPSOQ",
    recipientEmail: "colaborador@techcorp.com",
  };

  test("subject and recipient are set correctly", () => {
    const email = buildInviteEmail(base);
    expect(email.to).toBe(base.recipientEmail);
    expect(email.subject).toContain("TechCorp Ltda");
  });

  test("text and html both contain the invite link", () => {
    const email = buildInviteEmail(base);
    expect(email.text).toContain(base.inviteLink);
    expect(email.html).toContain(base.inviteLink);
  });

  test("never includes individual score or answer content (only template fields)", () => {
    const email = buildInviteEmail(base);
    const serialized = email.text + email.html;
    expect(serialized).not.toMatch(/score|resposta:|answer/i);
  });

  test("always states the n>=5 k-anonymity guarantee", () => {
    const email = buildInviteEmail(base);
    expect(email.text).toMatch(/5 ou mais/);
    expect(email.html).toMatch(/5 ou mais/);
  });

  test("HTML-escapes org name to prevent injection via untrusted org data", () => {
    const email = buildInviteEmail({ ...base, orgName: '<script>alert(1)</script>' });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  test("falls back to generic blurb for unknown instrument", () => {
    const email = buildInviteEmail({ ...base, instrumentLabel: "UNKNOWN_X" });
    expect(email.text).toContain("pesquisa de clima organizacional");
  });

  test("recognizes all three pilot instruments with distinct blurbs", () => {
    const copsoq = buildInviteEmail({ ...base, instrumentLabel: "COPSOQ" });
    const perma = buildInviteEmail({ ...base, instrumentLabel: "PERMA+V / IVO" });
    const viat = buildInviteEmail({ ...base, instrumentLabel: "VIA-T" });
    expect(copsoq.text).toContain("organização e relações no trabalho");
    expect(perma.text).toContain("bem-estar e florescimento");
    expect(viat.text).toContain("forças e talentos");
  });
});
