import { z } from "zod";
import { normalizeCycleKey } from "@/domain/ivo/cycle-key";

// Identificadores editoriais próprios. O catálogo descreve condições de trabalho,
// sem mapeamento automático para itens, escores ou eficácia da COPSOQ.
export const controlCatalog = [
  {
    group: "Governança e políticas",
    items: [
      ["listening", "Ouvidoria ou canal de denúncias"],
      ["harassment", "Política de prevenção do assédio"],
      ["conduct", "Código de conduta"],
      ["inclusion", "Comitê de inclusão"],
      ["cipa", "Pauta psicossocial na CIPA"],
    ],
  },
  {
    group: "Comunicação e relacionamento",
    items: [
      ["climate", "Pesquisa de clima"],
      ["meetings", "Reuniões de equipe"],
      ["communication", "Comunicação de mudanças"],
      ["engagement", "Comunicação interna e engajamento"],
    ],
  },
  {
    group: "Saúde e bem-estar",
    items: [
      ["support", "Apoio ao empregado"],
      ["health", "Promoção da saúde"],
      ["occupational", "Atendimento ocupacional"],
      ["breaks", "Pausas durante a jornada"],
    ],
  },
  {
    group: "Liderança e gestão",
    items: [
      ["leadership", "Formação de lideranças"],
      ["feedback", "Avaliação de gestores"],
      ["mediation", "Mediação de conflitos"],
    ],
  },
  {
    group: "Desenvolvimento e carreira",
    items: [
      ["career", "Critérios de carreira e remuneração"],
      ["development", "Plano de desenvolvimento individual"],
      ["training", "Capacitação técnica"],
      ["recognition", "Reconhecimento do trabalho"],
    ],
  },
  {
    group: "Organização do trabalho",
    items: [
      ["roles", "Definição de responsabilidades"],
      ["flexibility", "Flexibilidade de jornada"],
      ["rotation", "Rodízio de tarefas"],
      ["participation", "Participação nas decisões"],
      ["process", "Revisão de processos"],
    ],
  },
] as const;
const catalogLabels = new Map<string, string>();
for (const group of controlCatalog)
  for (const [id, label] of group.items) catalogLabels.set(id, label);
export const coverageLabels = {
  partial: "Cobertura parcial",
  uncovered: "Lacuna em todo o recorte",
  covered: "Cobertura observada no recorte",
} as const;
export const sourceLabels = {
  dialogue: "Escuta coletiva da equipe ou CIPA",
  observation: "Observação do trabalho",
  document: "Conferência documental",
} as const;
export const reviewLabels = { observed: "Execução observada", revisit: "Requer ajuste" } as const;
export const noticeVersion = "Q1-PRE-1";
export const noticePurpose =
  "Estamos preparando uma escuta sobre como o trabalho é organizado. A equipe receberá orientações sobre a participação antes da abertura da coleta.";
export const noticePrivacy =
  "A devolutiva prevista é coletiva. Use os canais abaixo para dúvidas sobre o processo e sugestões sobre a organização do trabalho. Reserve questões pessoais para um canal de atendimento individual.";
export const prepMessages = {
  forbidden: "A preparação exige vínculo de RH administrador com uma empresa habilitada para Q1.",
  unavailable: "Não foi possível consultar a preparação. Tente novamente.",
  conflict: "O registro mudou em outra sessão. Releia a versão atual antes de confirmar.",
  duplicate: "Este controle já consta neste recorte. Abra o registro para conferir sua cobertura.",
  invalid: "A etapa solicitada já mudou. Confira o controle e a medida antes de continuar.",
  scope: "A empresa da sessão mudou. Abra a preparação novamente.",
};
const short = z.string().trim().min(2).max(100);
const detail = z.string().trim().min(4).max(320);
const uuid = z.string().uuid();
const date = z.string().date();
export const cycleSchema = z
  .string()
  .refine((v) => normalizeCycleKey(v) === v, "Use um ciclo como 2027-T1.");
const catalogChoice = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("catalog"), key: z.string().refine((v) => catalogLabels.has(v)) })
    .strict(),
  z.object({ kind: z.literal("custom"), label: short }).strict(),
]);
const verification = z.discriminatedUnion("coverage", [
  z.object({ coverage: z.literal("covered") }).strict(),
  z.object({ coverage: z.literal("partial"), gap: detail }).strict(),
  z.object({ coverage: z.literal("uncovered"), gap: detail }).strict(),
]);
const followup = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("observed") }).strict(),
  z.object({ outcome: z.literal("revisit"), nextDate: date }).strict(),
]);
export const prepCommandSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("notice"),
      template: z.literal(noticeVersion),
      contact: short,
      returnChannel: short,
    })
    .strict(),
  z.object({ kind: z.literal("declare"), choice: catalogChoice, scope: short }).strict(),
  z
    .object({
      kind: z.literal("verify"),
      controlId: uuid,
      source: z.enum(["dialogue", "observation", "document"]),
      evidence: detail,
      finding: verification,
    })
    .strict(),
  z
    .object({
      kind: z.literal("plan"),
      controlId: uuid,
      action: detail,
      owner: short,
      due: date,
      indicator: detail,
    })
    .strict(),
  z
    .object({ kind: z.literal("review"), controlId: uuid, evidence: detail, result: followup })
    .strict(),
]);
export type PrepCommand = z.infer<typeof prepCommandSchema>;
export const prepReadSchema = z
  .object({ accessToken: z.string().min(10).optional(), cycle: cycleSchema })
  .strict();
export const prepSaveSchema = prepReadSchema
  .extend({
    expectedScope: uuid,
    base: z.number().int().nonnegative(),
    requestId: uuid,
    command: prepCommandSchema,
  })
  .strict();
export type PrepSave = z.infer<typeof prepSaveSchema>;
type CommandOf<K extends PrepCommand["kind"]> = Extract<PrepCommand, { kind: K }>;
export type PrepEvent = { id: string; command: PrepCommand };
export interface PrepControl {
  id: string;
  label: string;
  scope: string;
  verification?: CommandOf<"verify">;
  measure?: CommandOf<"plan">;
  reviews?: CommandOf<"review">[];
}
export interface PrepState {
  notice?: CommandOf<"notice">;
  controls: PrepControl[];
}
export interface PrepView {
  scope: string;
  organization: string;
  cycle: string;
  revision: number;
  state: PrepState;
}
export type PrepFailure = { ok: false; reason: keyof typeof prepMessages };
export type PrepResult = { ok: true; view: PrepView } | PrepFailure;
export function preparationNextStep(state: PrepState) {
  if (!state.notice)
    return { target: "q1-notice", label: "Revisar o comunicado aos trabalhadores" };
  const unchecked = state.controls.find((c) => !c.verification);
  if (unchecked)
    return {
      target: "control-" + unchecked.id,
      label: "Conferir a cobertura de " + unchecked.label,
    };
  const gap = state.controls.find(
    (c) => c.verification?.finding && c.verification.finding.coverage !== "covered" && !c.measure,
  );
  if (gap) return { target: "control-" + gap.id, label: "Planejar a medida para " + gap.label };
  const pending = state.controls.find(
    (c) => c.measure && c.reviews?.at(-1)?.result.outcome !== "observed",
  );
  if (pending)
    return { target: "control-" + pending.id, label: "Acompanhar a medida de " + pending.label };
  if (!state.controls.length)
    return { target: "q1-controls", label: "Declarar o primeiro controle" };
  return { target: "q1-memory", label: "Consultar a memória de preparação" };
}
export function controlName(choice: CommandOf<"declare">["choice"]) {
  return choice.kind === "custom" ? choice.label : catalogLabels.get(choice.key)!;
}
const normalized = (value: string) =>
  value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

/** Uma lacuna confirmada tem uma medida; revisões ficam vinculadas à mesma origem. */
export function applyPreparation(
  state: PrepState,
  { id, command }: PrepEvent,
): PrepState | PrepFailure {
  if (command.kind === "notice") return { ...state, notice: command };
  if (command.kind === "declare") {
    const label = controlName(command.choice);
    if (
      state.controls.some(
        (c) =>
          normalized(c.label) === normalized(label) &&
          normalized(c.scope) === normalized(command.scope),
      )
    )
      return { ok: false, reason: "duplicate" };
    return { ...state, controls: [...state.controls, { id, label, scope: command.scope }] };
  }
  const control = state.controls.find((c) => c.id === command.controlId);
  if (!control) return { ok: false, reason: "invalid" };
  let change: Partial<PrepControl>;
  if (command.kind === "verify" && !control.measure) change = { verification: command };
  else if (
    command.kind === "plan" &&
    control.verification &&
    control.verification.finding.coverage !== "covered" &&
    !control.measure
  )
    change = { measure: command };
  else if (
    command.kind === "review" &&
    control.measure &&
    (control.reviews?.at(-1)?.result.outcome !== "observed" || command.result.outcome === "revisit")
  )
    change = { reviews: [...(control.reviews ?? []), command] };
  else return { ok: false, reason: "invalid" };
  return {
    ...state,
    controls: state.controls.map((c) => (c.id === control.id ? { ...c, ...change } : c)),
  };
}
