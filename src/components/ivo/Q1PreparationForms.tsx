import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  controlCatalog,
  coverageLabels,
  noticePrivacy,
  noticePurpose,
  noticeVersion,
  reviewLabels,
  sourceLabels,
  type PrepCommand,
  type PrepControl,
  type PrepState,
} from "@/domain/survey/q1-preparation";

type Save = (command: PrepCommand) => Promise<boolean>;
const inputStyle =
  "block min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-2 focus-visible:outline-ring";
export const actionStyle = "min-h-11 max-w-full whitespace-normal";
const summaryStyle =
  "min-h-11 cursor-pointer rounded-md py-2 font-medium text-primary focus-visible:outline-2 focus-visible:outline-ring";
const formStyle = "mt-3 grid min-w-0 gap-3";

function Field({
  label,
  name,
  hint,
  value,
  date = false,
  long = false,
}: {
  label: string;
  name: string;
  hint?: string;
  value?: string;
  date?: boolean;
  long?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <span id={id + "-hint"} className="font-normal text-muted-foreground">
          {hint}
        </span>
      )}
      <input
        id={id}
        aria-describedby={hint ? id + "-hint" : undefined}
        className={inputStyle}
        type={date ? "date" : "text"}
        name={name}
        defaultValue={value}
        required
        minLength={date ? undefined : long ? 4 : 2}
        maxLength={date ? undefined : long ? 320 : 100}
      />
    </div>
  );
}
function SelectField({
  label,
  name,
  children,
  value,
  change,
}: {
  label: string;
  name: string;
  children: ReactNode;
  value?: string;
  change?: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className={inputStyle}
        name={name}
        defaultValue={value}
        onChange={change ? (e) => change(e.target.value) : undefined}
        required
      >
        {children}
      </select>
    </div>
  );
}
function fields(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  return (name: string) => String(data.get(name) ?? "").trim();
}
function Submit({ children }: { children: ReactNode }) {
  return (
    <Button className={actionStyle + " justify-self-start"} type="submit">
      {children}
    </Button>
  );
}
export function NoticeForm({ notice, save }: { notice: PrepState["notice"]; save: Save }) {
  return (
    <div className="space-y-3">
      <p>{noticePurpose}</p>
      <p>{noticePrivacy}</p>
      <form
        className={formStyle}
        onSubmit={(e) => {
          const f = fields(e);
          void save({
            kind: "notice",
            template: noticeVersion,
            contact: f("contact"),
            returnChannel: f("return"),
          });
        }}
      >
        <Field
          name="contact"
          label="Canal institucional para dúvidas"
          hint="Use o nome de um canal coletivo, como Plantão do RH."
          value={notice?.contact}
        />
        <Field
          name="return"
          label="Onde a equipe acompanhará a devolutiva"
          value={notice?.returnChannel}
        />
        <Submit>
          {notice ? "Confirmar revisão do comunicado" : "Registrar comunicado revisado"}
        </Submit>
      </form>
    </div>
  );
}

export function DeclareControlForm({ save }: { save: Save }) {
  const [choice, setChoice] = useState("");
  return (
    <details className="rounded-lg border p-3">
      <summary className={summaryStyle}>Declarar um controle</summary>
      <form
        className={formStyle}
        onSubmit={async (e) => {
          const form = e.currentTarget;
          const f = fields(e);
          if (
            await save({
              kind: "declare",
              choice:
                choice === "custom"
                  ? { kind: "custom", label: f("label") }
                  : { kind: "catalog", key: f("choice") },
              scope: f("scope"),
            })
          ) {
            form.reset();
            setChoice("");
          }
        }}
      >
        <SelectField label="Controle existente" name="choice" value="" change={setChoice}>
          <option value="" disabled>
            Selecione um controle
          </option>
          {controlCatalog.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map(([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="custom">Outro controle da empresa</option>
        </SelectField>
        {choice === "custom" && <Field name="label" label="Nome do controle da empresa" />}
        <Field
          name="scope"
          label="Recorte de trabalho"
          hint="Informe uma atividade, turno ou área. Por exemplo, expedição no turno da noite."
        />
        <Submit>Registrar controle declarado</Submit>
      </form>
    </details>
  );
}
function VerifyControl({ c, save }: { c: PrepControl; save: Save }) {
  const verification = c.verification;
  const [coverage, setCoverage] = useState<string>(verification?.finding.coverage ?? "");
  return (
    <details className="rounded-md border p-3">
      <summary className={summaryStyle}>
        {verification ? "Revisar a conferência" : "Conferir a cobertura"}
      </summary>
      <form
        className={formStyle}
        onSubmit={(e) => {
          const f = fields(e);
          const v = f("coverage") as keyof typeof coverageLabels;
          void save({
            kind: "verify",
            controlId: c.id,
            source: f("source") as keyof typeof sourceLabels,
            evidence: f("evidence"),
            finding: v === "covered" ? { coverage: v } : { coverage: v, gap: f("gap") },
          });
        }}
      >
        <SelectField
          name="source"
          label="Como a cobertura foi conferida"
          value={verification?.source ?? ""}
        >
          <option value="" disabled>
            Selecione a fonte
          </option>
          {Object.entries(sourceLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
        <Field
          name="evidence"
          label="Referência da evidência coletiva"
          hint="Descreva o que foi consultado, como a escala de pausas do setor."
          long
          value={verification?.evidence}
        />
        <SelectField
          name="coverage"
          label="Cobertura encontrada"
          value={coverage}
          change={setCoverage}
        >
          <option value="" disabled>
            Selecione a cobertura
          </option>
          {Object.entries(coverageLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
        {(coverage === "partial" || coverage === "uncovered") && (
          <Field
            name="gap"
            label="Qual condição ainda precisa mudar?"
            long
            value={verification && "gap" in verification.finding ? verification.finding.gap : ""}
          />
        )}
        <Submit>Salvar conferência</Submit>
      </form>
    </details>
  );
}
function PlanMeasure({ id, save }: { id: string; save: Save }) {
  return (
    <details className="rounded-md border border-primary/30 bg-primary/5 p-3">
      <summary className={summaryStyle}>Planejar medida para esta lacuna</summary>
      <form
        className={formStyle}
        onSubmit={(e) => {
          const f = fields(e);
          void save({
            kind: "plan",
            controlId: id,
            action: f("action"),
            owner: f("owner"),
            due: f("due"),
            indicator: f("indicator"),
          });
        }}
      >
        <Field name="action" label="Mudança na organização do trabalho" long />
        <Field
          name="owner"
          label="Função responsável"
          hint="Indique a função ou área que coordenará a medida."
        />
        <Field name="due" label="Prazo de execução" date />
        <Field name="indicator" label="Como conferir a execução" long />
        <Submit>Registrar medida</Submit>
      </form>
    </details>
  );
}
function ReviewMeasure({ id, save, reopen }: { id: string; save: Save; reopen: boolean }) {
  const [outcome, setOutcome] = useState(reopen ? "revisit" : "");
  return (
    <details className="rounded-md border p-3">
      <summary className={summaryStyle}>
        {reopen ? "Reabrir para ajuste" : "Registrar acompanhamento"}
      </summary>
      <form
        className={formStyle}
        onSubmit={(e) => {
          const f = fields(e);
          void save({
            kind: "review",
            controlId: id,
            evidence: f("observation"),
            result:
              outcome === "observed" ? { outcome } : { outcome: "revisit", nextDate: f("next") },
          });
        }}
      >
        <Field name="observation" label="O que foi observado no acompanhamento?" long />
        <SelectField label="Situação da medida" name="outcome" value={outcome} change={setOutcome}>
          <option value="" disabled>
            Selecione a situação
          </option>
          {Object.entries(reviewLabels)
            .filter(([k]) => !reopen || k === "revisit")
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
        </SelectField>
        {outcome === "revisit" && <Field name="next" label="Data da próxima revisão" date />}
        <Submit>Salvar acompanhamento</Submit>
      </form>
    </details>
  );
}
export function ControlCard({ c, save }: { c: PrepControl; save: Save }) {
  const v = c.verification,
    m = c.measure,
    r = c.reviews?.at(-1);
  return (
    <article
      id={"control-" + c.id}
      tabIndex={-1}
      aria-label={c.label + " · " + c.scope}
      className="min-w-0 space-y-3 rounded-xl border bg-card p-4 [overflow-wrap:anywhere]"
    >
      <h3 className="font-serif text-lg">{c.label}</h3>
      <p>
        <strong>Recorte</strong> · {c.scope}
      </p>
      <p>
        <strong>
          {v ? coverageLabels[v.finding.coverage] : "Declarado · cobertura a conferir"}
        </strong>
      </p>
      {v && (
        <>
          <p>
            {sourceLabels[v.source]} · {v.evidence}
          </p>
          {"gap" in v.finding && (
            <p>
              <strong>Lacuna</strong> · {v.finding.gap}
            </p>
          )}
        </>
      )}
      {!m && <VerifyControl c={c} save={save} />}
      {!m && v && v.finding.coverage !== "covered" && <PlanMeasure id={c.id} save={save} />}
      {m && (
        <div className="space-y-1 rounded-lg bg-muted/40 p-3">
          <h4 className="font-semibold">
            {r ? reviewLabels[r.result.outcome] : "Medida planejada"}
          </h4>
          <p>{m.action}</p>
          <p>Responsável · {m.owner}</p>
          <p>Prazo · {ptDate(m.due)}</p>
          <p>Indicador de execução · {m.indicator}</p>
          {r && <p>Observação · {r.evidence}</p>}
          {r?.result.outcome === "revisit" && <p>Próxima revisão · {ptDate(r.result.nextDate)}</p>}
        </div>
      )}
      {c.reviews && c.reviews.length > 1 && (
        <details>
          <summary className={summaryStyle}>Ver acompanhamentos anteriores</summary>
          <ol className="list-decimal space-y-2 pl-5">
            {c.reviews.slice(0, -1).map((review, index) => (
              <li key={index}>
                {reviewLabels[review.result.outcome]} · {review.evidence}
                {review.result.outcome === "revisit" &&
                  " · Próxima revisão " + ptDate(review.result.nextDate)}
              </li>
            ))}
          </ol>
        </details>
      )}
      {m && (
        <ReviewMeasure
          key={c.reviews?.length ?? 0}
          id={c.id}
          save={save}
          reopen={r?.result.outcome === "observed"}
        />
      )}
    </article>
  );
}
const ptDate = (iso: string) => iso.split("-").reverse().join("/");
