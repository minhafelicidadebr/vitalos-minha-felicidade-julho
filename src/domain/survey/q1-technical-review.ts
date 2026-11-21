import { z } from "zod";

const reviewKey = {
  preparationRevision: z.number().int().positive(),
  reviewerId: z.string().uuid(),
};

export const technicalReviewCommand = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("submit"), ...reviewKey }).strict(),
  z
    .object({
      kind: z.literal("respond"),
      preparationRevision: reviewKey.preparationRevision,
      decision: z.enum(["changes_requested", "review_recorded"]),
      rationale: z.string().trim().min(10).max(1500),
    })
    .strict(),
]);

type Command = z.infer<typeof technicalReviewCommand>;
type Response = Extract<Command, { kind: "respond" }>;
export type TechnicalReview = {
  preparationRevision: number;
  reviewerId: string;
  submittedBy: string;
  submittedAt: string;
  response?: Pick<Response, "decision" | "rationale"> & { recordedAt: string };
};

// The caller resolves this context from the authenticated session and the current
// company/cycle records. Commands carry no actor, role, company or timestamp.
type Context = {
  actorId: string;
  now: string;
  currentRevision: number;
  canPrepare: boolean;
  activeReviewerId: string | null;
};

export function applyTechnicalReview(
  history: readonly TechnicalReview[],
  command: Command,
  context: Context,
):
  { status: "ready"; history: TechnicalReview[] } | { status: "forbidden" | "stale" | "conflict" } {
  const { actorId, now, currentRevision, canPrepare, activeReviewerId } = context;
  if (
    command.kind === "submit" &&
    (!canPrepare || command.reviewerId !== activeReviewerId || actorId === activeReviewerId)
  )
    return { status: "forbidden" } as const;
  if (command.kind === "respond" && actorId !== activeReviewerId)
    return { status: "forbidden" } as const;
  if (command.preparationRevision !== currentRevision) return { status: "stale" } as const;
  const current = [...history]
    .reverse()
    .find((entry) => entry.preparationRevision === currentRevision);
  if (command.kind === "submit") {
    if (current && (current.response || current.reviewerId === command.reviewerId))
      return { status: "conflict" } as const;
    return {
      status: "ready",
      history: [
        ...history,
        {
          preparationRevision: currentRevision,
          reviewerId: command.reviewerId,
          submittedBy: actorId,
          submittedAt: now,
        },
      ],
    } as const;
  }
  if (!current || current.reviewerId !== actorId || current.submittedBy === actorId)
    return { status: "forbidden" } as const;
  if (current.response) return { status: "conflict" } as const;
  return {
    status: "ready",
    history: history.map((entry) =>
      entry === current
        ? {
            ...entry,
            response: { decision: command.decision, rationale: command.rationale, recordedAt: now },
          }
        : entry,
    ),
  } as const;
}
