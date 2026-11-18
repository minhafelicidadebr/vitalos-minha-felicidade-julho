import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  checkQ2PilotReviewPackage,
  checkArchivedQ2PilotReviewPackage,
  renderQ2PilotReviewPackage,
  REVIEW_ATTACHMENTS,
  REVIEW_PACKAGE_PATH,
} from "./q2-pilot-review-package";

test("pacote histórico permanece íntegro mesmo após o avanço do checkout", () => {
  const archived = readFileSync(REVIEW_PACKAGE_PATH, "utf8");
  expect(checkArchivedQ2PilotReviewPackage(archived)).toBe(true);
  expect(checkArchivedQ2PilotReviewPackage(archived.replace("517c206", "620a206"))).toBe(false);
  const candidate = renderQ2PilotReviewPackage();
  expect(checkQ2PilotReviewPackage(candidate)).toBe(true);
});

test("aprovação editorial local não é liberação de piloto real ou nova prova executada", () => {
  const packet = JSON.parse(renderQ2PilotReviewPackage());
  expect(packet.editorialApproval.unit.approval.scope).toBe("local_descartavel");
  expect(packet.editorialApproval.activity.approval.scope).toBe("local_descartavel");
  expect(packet.editorialApproval.unit.approval.reviewer).toContain("Olga Mariano");
  expect(packet.editorialApproval.unit.approval.reviewer).toContain("Ana Paula Barbalho");
  expect(packet.realPilotAuthorization).toBe("nao_concedida_por_este_pacote");
  expect(packet.pilotScopeProposal.organizationReference).toBeNull();
  expect(
    packet.reportedEvidence.every(
      (proof: { currentExecution: boolean }) => !proof.currentExecution,
    ),
  ).toBe(true);
});

test("trocar aprovação, escopo, SHA ou declaração de teste invalida o pacote", () => {
  for (const patch of [
    { realPilotAuthorization: "aprovado" },
    { evidenceScope: "production" },
    { productCandidate: "0".repeat(40) },
    { reportedEvidence: [] },
    { pilotScopeProposal: { state: "aprovado" } },
  ]) {
    expect(
      checkQ2PilotReviewPackage(
        JSON.stringify({ ...JSON.parse(renderQ2PilotReviewPackage()), ...patch }, null, 2) + "\n",
      ),
    ).toBe(false);
  }
  const changed = JSON.parse(renderQ2PilotReviewPackage());
  changed.integrity.attachments[0].sha256 = "0".repeat(64);
  expect(checkQ2PilotReviewPackage(JSON.stringify(changed, null, 2) + "\n")).toBe(false);
});

test("fonte ou imagem alterada torna a evidência selecionada divergente", () => {
  const current = renderQ2PilotReviewPackage();
  for (const target of [
    "src/routes/auth.callback.tsx",
    "src/domain/evidence/claim-registry.json",
    "docs/vitalos/artifacts/MACRO_ACESSO_MOBILE_320_2026-11-16.jpg",
  ]) {
    expect(
      checkQ2PilotReviewPackage(current, (path) => {
        const bytes = readFileSync(path);
        return path === target ? Buffer.concat([bytes, Buffer.from("changed")]) : bytes;
      }),
    ).toBe(false);
  }
});

test("normaliza CRLF de textos, mas preserva bytes das imagens", () => {
  expect(
    checkQ2PilotReviewPackage(renderQ2PilotReviewPackage(), (path) => {
      const bytes = readFileSync(path);
      return path.endsWith(".jpg")
        ? bytes
        : Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"));
    }),
  ).toBe(true);
});

test("arquivo ausente não pode ser contado como evidência íntegra", () => {
  expect(() =>
    checkQ2PilotReviewPackage(renderQ2PilotReviewPackage(), () => {
      throw new Error("missing");
    }),
  ).toThrow("missing");
});

test("índice não enumera arquivos e não inclui segredos, arquivos protegidos ou a si mesmo", () => {
  expect(new Set(REVIEW_ATTACHMENTS).size).toBe(REVIEW_ATTACHMENTS.length);
  for (const path of REVIEW_ATTACHMENTS) {
    expect(path).not.toMatch(/(?:\.env|\.q\.(?:out|sql)|\.local\/|\.git\/)/);
    expect(path).not.toBe(REVIEW_PACKAGE_PATH);
  }
});
