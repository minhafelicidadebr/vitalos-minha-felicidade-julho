import { describe, expect, test } from "bun:test";
import { dispatchInviteEmail, dispatchInviteEmailBatch } from "./email-dispatcher.server";

const SAMPLE = {
  orgName: "TechCorp Ltda",
  inviteLink: "https://app.vitalos.com.br/convite/abc123",
  instrumentLabel: "COPSOQ",
  recipientEmail: "colaborador@techcorp.com",
};

describe("email-dispatcher", () => {
  test("falls back to logged_only when RESEND_API_KEY is absent — never throws", async () => {
    expect(process.env.RESEND_API_KEY).toBeUndefined();
    const result = await dispatchInviteEmail(SAMPLE);
    expect(result).toEqual({ sent: false, provider: "logged_only", reason: "no_api_key" });
  });

  test("batch dispatch resolves for every input without throwing, even with zero config", async () => {
    const results = await dispatchInviteEmailBatch([
      SAMPLE,
      { ...SAMPLE, recipientEmail: "outra@techcorp.com" },
    ]);
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.sent).toBe(false);
    }
  });
});
