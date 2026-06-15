import { describe, expect, test } from "bun:test";
import {
  channelUsability,
  usableChannelIds,
  partitionByConsent,
  CONSENT_THRESHOLD_PCT,
  MIN_CONSENT_COUNT,
  type ConsentChannel,
} from "./consent-engine";

function ch(over: Partial<ConsentChannel> = {}): ConsentChannel {
  return {
    id: "pulses",
    label: "Pulses",
    personalGranted: true,
    orgConsentPct: 80,
    orgConsentCount: 400,
    ...over,
  };
}

// ─── Usabilidade do canal ─────────────────────────────────────────────────────

describe("channelUsability", () => {
  test("concedido + adesão alta → utilizável", () => {
    expect(channelUsability(ch())).toEqual({ usable: true, reason: "ok" });
  });

  test("revogado pela pessoa → não utilizável (revogado)", () => {
    const u = channelUsability(ch({ personalGranted: false }));
    expect(u.usable).toBe(false);
    expect(u.reason).toBe("revogado");
  });

  test("poucas pessoas concederam (< k-anon) → não utilizável (k_anon)", () => {
    const u = channelUsability(ch({ orgConsentCount: MIN_CONSENT_COUNT - 1 }));
    expect(u.usable).toBe(false);
    expect(u.reason).toBe("k_anon");
  });

  test("adesão da org abaixo do limiar → não utilizável (abaixo_do_limiar)", () => {
    const u = channelUsability(ch({ orgConsentPct: CONSENT_THRESHOLD_PCT - 1 }));
    expect(u.usable).toBe(false);
    expect(u.reason).toBe("abaixo_do_limiar");
  });

  test("precedência: revogado vence sobre adesão insuficiente", () => {
    const u = channelUsability(
      ch({ personalGranted: false, orgConsentPct: 10, orgConsentCount: 1 }),
    );
    expect(u.reason).toBe("revogado");
  });

  test("limiares exatos são utilizáveis", () => {
    expect(
      channelUsability(
        ch({ orgConsentPct: CONSENT_THRESHOLD_PCT, orgConsentCount: MIN_CONSENT_COUNT }),
      ).usable,
    ).toBe(true);
  });
});

// ─── Conjunto de canais utilizáveis ──────────────────────────────────────────

describe("usableChannelIds", () => {
  test("retorna só os canais utilizáveis", () => {
    const channels = [
      ch({ id: "pulses" }),
      ch({ id: "signals", personalGranted: false }),
      ch({ id: "nudges", orgConsentPct: 30 }),
    ];
    const usable = usableChannelIds(channels);
    expect(usable.has("pulses")).toBe(true);
    expect(usable.has("signals")).toBe(false);
    expect(usable.has("nudges")).toBe(false);
  });
});

// ─── Partição por consentimento ──────────────────────────────────────────────

describe("partitionByConsent", () => {
  const items = [
    { id: "a", requiresChannel: "pulses" },
    { id: "b", requiresChannel: "signals" },
    { id: "c" }, // sem canal exigido → sempre permitido
  ];

  test("permite os com canal utilizável e os sem exigência", () => {
    const { allowed, blocked } = partitionByConsent(items, new Set(["pulses"]));
    expect(allowed.map((i) => i.id).sort()).toEqual(["a", "c"]);
    expect(blocked).toHaveLength(1);
    expect(blocked[0]!.item.id).toBe("b");
    expect(blocked[0]!.missingChannel).toBe("signals");
  });

  test("revogar o canal move o item para bloqueado", () => {
    const { allowed, blocked } = partitionByConsent(items, new Set());
    expect(allowed.map((i) => i.id)).toEqual(["c"]);
    expect(blocked).toHaveLength(2);
  });

  test("conceder mais canais desbloqueia mais itens", () => {
    const { allowed } = partitionByConsent(items, new Set(["pulses", "signals"]));
    expect(allowed).toHaveLength(3);
  });
});
