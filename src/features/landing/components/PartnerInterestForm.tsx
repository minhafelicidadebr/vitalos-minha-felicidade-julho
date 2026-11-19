import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  partnerInterestAvailable,
  submitPartnerInterest,
} from "@/lib/api/partner-interest.functions";

const fieldStyle = "min-h-11 w-full rounded-md border bg-background px-3";

const defaultClient = { available: partnerInterestAvailable, submit: submitPartnerInterest };
type Client = {
  available: () => Promise<boolean>;
  submit: (
    input: Parameters<typeof submitPartnerInterest>[0],
  ) => ReturnType<typeof submitPartnerInterest>;
};

export function PartnerInterestForm({ client = defaultClient }: { client?: Client }) {
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<"idle" | "busy" | "received" | "error">("idle");
  const attempt = useRef<{ key: string; id: string } | null>(null);
  const sending = useRef(false);
  useEffect(() => {
    let active = true;
    void client
      .available()
      .then((value) => {
        if (active) setAvailable(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [client]);
  if (!available) return null;

  return (
    <section
      aria-labelledby="partner-interest-title"
      className="max-w-2xl space-y-4 rounded-2xl border bg-card p-5 sm:p-7"
    >
      <h3 id="partner-interest-title" className="font-serif text-2xl">
        Registrar interesse em colaborar
      </h3>
      <p className="text-sm text-muted-foreground">
        Ensaio local. Use apenas nomes e contatos fictícios.
      </p>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (sending.current || status === "received") return;
          const fields = new FormData(event.currentTarget);
          if (fields.get("contact") !== "on") return;
          const input = {
            name: String(fields.get("name") ?? "").trim(),
            email: String(fields.get("email") ?? "")
              .trim()
              .toLowerCase(),
            region: String(fields.get("region") ?? "").trim(),
            track: fields.get("track") === "sst" ? ("sst" as const) : ("development" as const),
          };
          const key = JSON.stringify(input);
          if (attempt.current?.key !== key) attempt.current = { id: crypto.randomUUID(), key };
          sending.current = true;
          setStatus("busy");
          try {
            const result = await client.submit({
              data: { ...input, id: attempt.current.id, contact: true },
            });
            setStatus(result.status === "received" ? "received" : "error");
          } catch {
            setStatus("error");
          } finally {
            sending.current = false;
          }
        }}
      >
        <fieldset disabled={status === "busy" || status === "received"} className="space-y-3">
          <label className="grid gap-1">
            Nome profissional
            <input className={fieldStyle} name="name" required minLength={2} maxLength={100} />
          </label>
          <label className="grid gap-1">
            E-mail fictício (ex.: pessoa@rede.test)
            <input
              className={fieldStyle}
              name="email"
              type="email"
              pattern=".+[.]test"
              required
              maxLength={200}
            />
          </label>
          <label className="grid gap-1">
            Região ou modalidade de atendimento
            <input className={fieldStyle} name="region" required minLength={2} maxLength={100} />
          </label>
          <label className="grid gap-1">
            Área de atuação
            <select className={fieldStyle} name="track">
              <option value="sst">SST e riscos psicossociais</option>
              <option value="development">Bem-estar e desenvolvimento</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="contact" required /> Concordo com o registro dos dados
            fictícios para a triagem local.
          </label>
          <Button type="submit" className="min-h-11">
            Enviar interesse
          </Button>
        </fieldset>
      </form>
      <p role="status">
        {status === "busy"
          ? "Registrando interesse…"
          : status === "received"
            ? "Interesse recebido na fila de triagem local."
            : ""}
      </p>
      {status === "error" && (
        <p role="alert">
          Não foi possível confirmar o registro. Confira os campos e tente novamente.
        </p>
      )}
    </section>
  );
}
