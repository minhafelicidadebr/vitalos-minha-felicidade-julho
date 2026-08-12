import { describe, expect, test } from "bun:test";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import {
  HML_BATCH_ID,
  HML_CONTRACT_VERSION,
  HML_ENVIRONMENT,
  HML_COHORT_KEYS,
  HML_ORGANIZATION,
  HML_SECTOR_SMOKE,
  HML_WAVE,
  assertInviteWithinAuthorizedHmlBatch,
  assertSectorLinkWithinAuthorizedHmlSmoke,
  validateHmlOrigin,
} from "./hml-contract";

describe("contrato canônico — constantes", () => {
  test("versão, ambiente e batch são os valores fixados da campanha", () => {
    expect(HML_CONTRACT_VERSION).toBe("FIBT-HML-1");
    expect(HML_ENVIRONMENT).toBe("staging");
    expect(HML_BATCH_ID).toBe("FIBT-ISG-HML-01");
  });

  test("as duas coortes sintéticas são exatamente Alfa e Beta", () => {
    expect(HML_COHORT_KEYS).toEqual(["ISG-HML-ALFA", "ISG-HML-BETA"]);
  });
});

const AUTHORIZED = "https://fibt-hml-01.lovable.app";

describe("validateHmlOrigin — caminho feliz", () => {
  test("candidata idêntica à autorizada: válida", () => {
    const r = validateHmlOrigin(AUTHORIZED, AUTHORIZED);
    expect(r).toEqual({ valid: true, origin: "https://fibt-hml-01.lovable.app" });
  });

  test("porta explícita padrão https é normalizada e ainda bate", () => {
    const r = validateHmlOrigin("https://fibt-hml-01.lovable.app:443", AUTHORIZED);
    expect(r.valid).toBe(true);
  });

  test("path/trailing slash na candidata não afeta a origem", () => {
    const r = validateHmlOrigin("https://fibt-hml-01.lovable.app/convite/abc", AUTHORIZED);
    expect(r.valid).toBe(true);
  });
});

describe("validateHmlOrigin — forma inválida", () => {
  test("ausente", () => {
    expect(validateHmlOrigin(undefined, AUTHORIZED)).toEqual({
      valid: false,
      failure: "HML_FRONTEND_ORIGIN_MISSING",
    });
  });

  test("não parseável", () => {
    expect(validateHmlOrigin("not a url", AUTHORIZED)).toEqual({
      valid: false,
      failure: "HML_FRONTEND_ORIGIN_UNPARSEABLE",
    });
  });

  test("HTTP puro é recusado", () => {
    expect(validateHmlOrigin("http://fibt-hml-01.lovable.app", AUTHORIZED)).toEqual({
      valid: false,
      failure: "HML_FRONTEND_ORIGIN_NOT_HTTPS",
    });
  });

  test("credenciais embutidas são recusadas", () => {
    expect(validateHmlOrigin("https://user:pass@fibt-hml-01.lovable.app", AUTHORIZED)).toEqual({
      valid: false,
      failure: "HML_FRONTEND_ORIGIN_HAS_CREDENTIALS",
    });
  });

  test("query string é recusada", () => {
    expect(validateHmlOrigin("https://fibt-hml-01.lovable.app?x=1", AUTHORIZED)).toEqual({
      valid: false,
      failure: "HML_FRONTEND_ORIGIN_HAS_QUERY",
    });
  });

  test("fragment é recusado", () => {
    expect(validateHmlOrigin("https://fibt-hml-01.lovable.app#frag", AUTHORIZED)).toEqual({
      valid: false,
      failure: "HML_FRONTEND_ORIGIN_HAS_FRAGMENT",
    });
  });

  test.each(["vitalos.com.br", "www.vitalos.com.br", "app.vitalos.com.br", "APP.VITALOS.COM.BR"])(
    "hostname produtivo %s é recusado mesmo como autorizado",
    (host) => {
      expect(validateHmlOrigin(`https://${host}`, `https://${host}`)).toEqual({
        valid: false,
        failure: "HML_FRONTEND_ORIGIN_FORBIDDEN_HOSTNAME",
      });
    },
  );

  test("autorizada malformada também reprova, mesmo com candidata válida", () => {
    expect(validateHmlOrigin(AUTHORIZED, "not-a-url")).toEqual({
      valid: false,
      failure: "HML_FRONTEND_ORIGIN_UNPARSEABLE",
    });
  });
});

describe("validateHmlOrigin — os bypasses concretos que a FIBT-HML-1C confirmou explorando o blocklist antigo", () => {
  test("sufixo-lookalike (vitalos.com.br.attacker-controlled.test) diverge da origem autorizada", () => {
    const r = validateHmlOrigin("https://vitalos.com.br.attacker-controlled.test", AUTHORIZED);
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_MISMATCH" });
  });

  test("homóglifo Unicode (о cirílico) normaliza para punycode e diverge da origem autorizada", () => {
    const homoglyph = "https://vitalos.com.br".replace("o", "о"); // 'о' cirílico
    const r = validateHmlOrigin(homoglyph, AUTHORIZED);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.failure).toBe("HML_FRONTEND_ORIGIN_MISMATCH");
  });

  test("subdomínio enganoso diverge", () => {
    const r = validateHmlOrigin("https://staging.fibt-hml-01.lovable.app", AUTHORIZED);
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_MISMATCH" });
  });

  test("porta divergente diverge", () => {
    const r = validateHmlOrigin("https://fibt-hml-01.lovable.app:8443", AUTHORIZED);
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_MISMATCH" });
  });
});

const VALID_ROW = {
  organizationSlug: HML_ORGANIZATION.slug,
  waveLabel: HML_WAVE.label,
  cohortKey: "ISG-HML-ALFA",
  expiresAt: null,
};

describe("assertInviteWithinAuthorizedHmlBatch — vínculo invite→cohort→wave→organization (Fase 14, itens 15-20)", () => {
  test("16. convite Alfa válido é aceito", () => {
    expect(assertInviteWithinAuthorizedHmlBatch(VALID_ROW)).toEqual({ ok: true });
  });

  test("17. convite Beta válido é aceito", () => {
    expect(assertInviteWithinAuthorizedHmlBatch({ ...VALID_ROW, cohortKey: "ISG-HML-BETA" })).toEqual({ ok: true });
  });

  test("15. convite fora do lote (organização diferente) é rejeitado", () => {
    expect(assertInviteWithinAuthorizedHmlBatch({ ...VALID_ROW, organizationSlug: "outra-org" })).toEqual({
      ok: false,
      code: "HML_INVITE_OUTSIDE_AUTHORIZED_BATCH",
    });
  });

  test("onda diferente (mesma organização) é rejeitada", () => {
    expect(assertInviteWithinAuthorizedHmlBatch({ ...VALID_ROW, waveLabel: "Outra onda" })).toEqual({
      ok: false,
      code: "HML_INVITE_OUTSIDE_AUTHORIZED_BATCH",
    });
  });

  test("cohort_id nulo (convite sem coorte) é rejeitado", () => {
    expect(assertInviteWithinAuthorizedHmlBatch({ ...VALID_ROW, cohortKey: null })).toEqual({
      ok: false,
      code: "HML_INVITE_OUTSIDE_AUTHORIZED_BATCH",
    });
  });

  test("cohort key que não é Alfa nem Beta é rejeitado", () => {
    expect(assertInviteWithinAuthorizedHmlBatch({ ...VALID_ROW, cohortKey: "OUTRA-COORTE" })).toEqual({
      ok: false,
      code: "HML_INVITE_OUTSIDE_AUTHORIZED_BATCH",
    });
  });

  test("18. convite expirado é rejeitado", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(assertInviteWithinAuthorizedHmlBatch({ ...VALID_ROW, expiresAt: past })).toEqual({
      ok: false,
      code: "HML_INVITE_EXPIRED",
    });
  });

  test("expires_at no futuro ainda é válido", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    expect(assertInviteWithinAuthorizedHmlBatch({ ...VALID_ROW, expiresAt: future })).toEqual({ ok: true });
  });

  test("expires_at nulo nunca expira", () => {
    expect(assertInviteWithinAuthorizedHmlBatch({ ...VALID_ROW, expiresAt: null })).toEqual({ ok: true });
  });
});

const VALID_SECTOR_SMOKE_ROW = {
  linkOrganizationId: "org-smoke-1",
  waveOrganizationId: "org-smoke-1",
  organizationName: HML_SECTOR_SMOKE.organizationName,
  waveLabel: HML_SECTOR_SMOKE.waveLabel,
  instrument: HML_SECTOR_SMOKE.instrument,
  instrumentVersion: HML_SECTOR_SMOKE.instrumentVersion,
  sectorLabel: HML_SECTOR_SMOKE.sectorLabels[0],
};

describe("assertSectorLinkWithinAuthorizedHmlSmoke — vínculo fail-closed do smoke ISG", () => {
  test("a versão do boundary acompanha o manifesto canônico da FIB-T", () => {
    expect(getFibtManifest().instrument_version).toBe(HML_SECTOR_SMOKE.instrumentVersion);
  });

  test("aceita somente os dois labels sintéticos autorizados", () => {
    for (const sectorLabel of HML_SECTOR_SMOKE.sectorLabels) {
      expect(assertSectorLinkWithinAuthorizedHmlSmoke({ ...VALID_SECTOR_SMOKE_ROW, sectorLabel })).toEqual({
        ok: true,
      });
    }
  });

  test("rejeita qualquer divergência de link, organização, onda, instrumento, versão ou label", () => {
    const invalidRows = [
      { ...VALID_SECTOR_SMOKE_ROW, linkOrganizationId: "outra-org" },
      { ...VALID_SECTOR_SMOKE_ROW, waveOrganizationId: "outra-org" },
      { ...VALID_SECTOR_SMOKE_ROW, organizationName: "Outra organização" },
      { ...VALID_SECTOR_SMOKE_ROW, waveLabel: "Outra onda" },
      { ...VALID_SECTOR_SMOKE_ROW, instrument: "COPSOQ" },
      { ...VALID_SECTOR_SMOKE_ROW, instrumentVersion: "fibt-1.0.0" },
      { ...VALID_SECTOR_SMOKE_ROW, instrumentVersion: null },
      { ...VALID_SECTOR_SMOKE_ROW, sectorLabel: "Operações" },
    ];

    for (const row of invalidRows) {
      expect(assertSectorLinkWithinAuthorizedHmlSmoke(row)).toEqual({
        ok: false,
        code: "HML_SECTOR_LINK_OUTSIDE_AUTHORIZED_SMOKE",
      });
    }
  });
});
