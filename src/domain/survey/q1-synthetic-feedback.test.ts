import { expect, test } from "bun:test";
import { WAVE_K_ANON_MIN } from "@/engine/campaign/campaign-engine";
import { projectSyntheticQ1Feedback, syntheticQ1FeedbackExamples } from "./q1-synthetic-feedback";

test("a projeção protegida não contém achado nem contagem", () => {
  const view = syntheticQ1FeedbackExamples.protected;
  expect(view.state).toBe("protected");
  expect(view).not.toHaveProperty("observation");
  expect(view).not.toHaveProperty("eligibleResponses");
  expect(view.guidance).toContain("escuta coletiva");
});

test("base suficiente requer publicação e o resultado é sempre identificado como sintético", () => {
  const view = projectSyntheticQ1Feedback({
    cycle: "2027-T1",
    label: "Turno fictício",
    publication: "pending",
    eligibleResponses: WAVE_K_ANON_MIN,
    observation: "Observação fictícia",
  });
  expect(view.state).toBe("awaiting_publication");
  expect(view).not.toHaveProperty("observation");
  expect(syntheticQ1FeedbackExamples.available).toMatchObject({
    synthetic: true,
    state: "available",
  });
});
