import { expect, test } from "bun:test";
import { applyTechnicalReview, technicalReviewCommand } from "./q1-technical-review";

const owner = crypto.randomUUID();
const reviewer = crypto.randomUUID();
const context = {
  actorId: owner,
  now: "2026-11-19T12:00:00Z",
  currentRevision: 2,
  canPrepare: true,
  activeReviewerId: reviewer,
};
const submission = { kind: "submit", preparationRevision: 2, reviewerId: reviewer } as const;
const response = {
  kind: "respond",
  preparationRevision: 2,
  decision: "changes_requested",
  rationale: "Conferir a cobertura com a equipe do turno.",
} as const;

test("registra devolução na revisão examinada e preserva seu histórico após edição", () => {
  const sent = applyTechnicalReview([], submission, context);
  if (sent.status !== "ready") throw new Error(sent.status);
  const returned = applyTechnicalReview(sent.history, response, { ...context, actorId: reviewer });
  if (returned.status !== "ready") throw new Error(returned.status);
  expect(returned.history[0].response?.decision).toBe("changes_requested");
  expect(
    applyTechnicalReview(returned.history, response, { ...context, actorId: reviewer }).status,
  ).toBe("conflict");
  expect(
    applyTechnicalReview(returned.history, response, {
      ...context,
      actorId: reviewer,
      currentRevision: 3,
    }).status,
  ).toBe("stale");
  const next = applyTechnicalReview(
    returned.history,
    { ...submission, preparationRevision: 3 },
    { ...context, currentRevision: 3 },
  );
  if (next.status !== "ready") throw new Error(next.status);
  expect(next.history[0]).toEqual(returned.history[0]);
  expect(next.history[1].response).toBeUndefined();
});

test("recusa autoavaliação e revisor revogado, preservando a designação anterior", () => {
  expect(applyTechnicalReview([], submission, { ...context, actorId: reviewer }).status).toBe(
    "forbidden",
  );
  const sent = applyTechnicalReview([], submission, context);
  if (sent.status !== "ready") throw new Error(sent.status);
  const replacement = crypto.randomUUID();
  const reassigned = { ...context, activeReviewerId: replacement };
  expect(
    applyTechnicalReview(sent.history, response, { ...reassigned, actorId: reviewer }).status,
  ).toBe("forbidden");
  expect(
    applyTechnicalReview(sent.history, response, { ...reassigned, actorId: replacement }).status,
  ).toBe("forbidden");
  const next = applyTechnicalReview(
    sent.history,
    { ...submission, reviewerId: replacement },
    reassigned,
  );
  if (next.status !== "ready") throw new Error(next.status);
  expect(next.history.map((item) => item.reviewerId)).toEqual([reviewer, replacement]);
  expect(technicalReviewCommand.safeParse({ ...response, actorId: reviewer }).success).toBe(false);
});
