import { useEffect, useRef, useState } from "react";
import { Mail, MessageCircle, Send, Sparkles, X, CheckCircle2 } from "lucide-react";
import avatar from "@/assets/flora-concierge-avatar.jpg";
import { CONTACT_EMAIL, TOPICS, findTopic, whatsappLink, type Block } from "./concierge-knowledge";

type Msg = { role: "user" | "bot"; blocks: Block[]; next?: string[] };

const WELCOME: Msg = {
  role: "bot",
  blocks: [
    { kind: "text", text: "Olá! Sou a Flora, guia do VitalOS. Posso te mostrar como cuidar da vitalidade da sua equipe e preparar sua organização para a NR-1. Por onde quer começar?" },
  ],
  next: ["4Lentes", "NR1", "METE", "Planos"],
};

function BlockView({ b, onIntent }: { b: Block; onIntent: (i: string) => void }) {
  if (b.kind === "text") return <p className="text-sm leading-relaxed">{b.text}</p>;
  if (b.kind === "callout")
    return (
      <div className={`rounded-lg border-l-4 p-3 text-xs ${b.tone === "evidence" ? "border-accent bg-accent/10" : "border-primary bg-primary/5"}`}>
        {b.tone === "evidence" ? "🔬 " : "🤝 "}{b.text}
      </div>
    );
  if (b.kind === "steps")
    return (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{b.title}</p>
        <ol className="grid gap-2 sm:grid-cols-2">
          {b.items.map((it, i) => (
            <li key={it.label} className="flex gap-2 rounded-lg border border-border bg-background p-2.5">
              <span aria-hidden className="text-lg">{it.icon}</span>
              <div>
                <p className="text-sm font-semibold">{i + 1}. {it.label}</p>
                <p className="text-xs text-muted-foreground">{it.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  if (b.kind === "table")
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <caption className="bg-muted px-3 py-2 text-left font-semibold">{b.title}</caption>
          <thead className="bg-primary text-primary-foreground">
            <tr>{b.head.map((h) => <th key={h} scope="col" className="px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {b.rows.map((r, i) => (
              <tr key={i} className="border-t border-border even:bg-muted/40">
                {r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === 0 ? "font-semibold" : ""}`}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <button onClick={() => onIntent(b.intent)} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow transition hover:brightness-105">
      <Sparkles className="h-4 w-4" /> {b.label}
    </button>
  );
}

export function ConciergeWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [lead, setLead] = useState<{ intent: string } | null>(null);
  const [sent, setSent] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, lead]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const ask = (text: string, tag?: string) => {
    const topic = tag ? TOPICS.find((t) => t.tag === tag) ?? null : findTopic(text);
    const reply: Msg = topic
      ? { role: "bot", blocks: topic.blocks, next: topic.next }
      : { role: "bot", blocks: [
          { kind: "text", text: "Boa pergunta! Para te responder com precisão, prefiro te conectar a um consultor humano — ou escolha um tema abaixo." },
          { kind: "cta", label: "Falar com um consultor", intent: `Tenho uma dúvida: ${text}` },
        ], next: ["4Lentes", "NR1", "Planos"] };
    setMsgs((m) => [...m, { role: "user", blocks: [{ kind: "text", text: topic && tag ? topic.title : text }] }, reply]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    ask(input.trim());
    setInput("");
  };

  const sendLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const msg = `Olá! Sou ${f.get("nome")} (${f.get("cargo")}) da ${f.get("empresa")}. ${lead?.intent ?? ""}`;
    window.open(whatsappLink(msg), "_blank", "noopener");
    setSent(true);
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 print:hidden">
        <a
          href={whatsappLink("Olá! Quero falar com um consultor VitalOS.")}
          target="_blank" rel="noopener noreferrer"
          aria-label="Falar com consultor humano no WhatsApp"
          className="group flex h-12 items-center gap-2 rounded-full bg-primary pl-3 pr-4 text-sm font-semibold text-primary-foreground shadow-lg ring-2 ring-accent/60 transition hover:scale-105"
        >
          <MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">Consultor humano</span>
        </a>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Fechar assistente" : "Abrir assistente Flora"}
          aria-expanded={open}
          className="relative h-16 w-16 overflow-hidden rounded-full shadow-2xl ring-4 ring-accent transition hover:scale-105"
        >
          {open ? (
            <span className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground"><X className="h-7 w-7" /></span>
          ) : (
            <img src={avatar} alt="" width={64} height={64} className="h-full w-full object-cover" />
          )}
          {!open && <span className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-accent motion-safe:animate-pulse" />}
        </button>
      </div>

      {open && (
        <section
          role="dialog" aria-label="Assistente Flora do VitalOS"
          className="fixed inset-0 z-[59] flex flex-col bg-card text-card-foreground shadow-2xl sm:inset-auto sm:bottom-28 sm:right-5 sm:h-[min(760px,calc(100vh-8rem))] sm:w-[min(720px,calc(100vw-2.5rem))] sm:rounded-2xl sm:border sm:border-border motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
        >
          <header className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground sm:rounded-t-2xl">
            <img src={avatar} alt="Flora, guia do VitalOS" width={48} height={48} className="h-12 w-12 rounded-full object-cover ring-2 ring-accent" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Flora · Guia VitalOS</p>
              <p className="flex items-center gap-1.5 text-xs opacity-80"><span className="h-2 w-2 rounded-full bg-accent" /> Online · respostas baseadas na metodologia</p>
            </div>
            <a href={whatsappLink("Olá! Vim pelo assistente Flora e quero falar com um consultor.")} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground sm:inline-flex">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Proposta VitalOS")}`} aria-label="Enviar e-mail" className="rounded-full p-2 hover:bg-primary-foreground/10"><Mail className="h-5 w-5" /></a>
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-full p-2 hover:bg-primary-foreground/10"><X className="h-5 w-5" /></button>
          </header>

          <nav aria-label="Temas" className="flex gap-2 overflow-x-auto border-b border-border bg-muted/50 px-4 py-2.5">
            {TOPICS.map((t) => (
              <button key={t.tag} onClick={() => ask(t.title, t.tag)} className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium transition hover:border-primary hover:text-primary">
                #{t.tag}
              </button>
            ))}
          </nav>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "bot" && <img src={avatar} alt="" width={32} height={32} loading="lazy" className="mt-1 h-8 w-8 shrink-0 rounded-full object-cover" />}
                <div className={`max-w-[88%] space-y-3 rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
                  {m.blocks.map((b, j) => <BlockView key={j} b={b} onIntent={(intent) => { setLead({ intent }); setSent(false); }} />)}
                  {m.next && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="w-full text-[11px] font-medium text-muted-foreground">Continue explorando:</span>
                      {m.next.map((tag) => (
                        <button key={tag} onClick={() => ask(tag, tag)} className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-primary ring-1 ring-border hover:ring-primary">#{tag}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {lead && (
              <div className="rounded-2xl border-2 border-accent bg-background p-4">
                {sent ? (
                  <p className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-5 w-5 text-primary" /> Pronto! Abrimos o WhatsApp com sua mensagem. Um consultor responde em breve.</p>
                ) : (
                  <form onSubmit={sendLead} className="space-y-3">
                    <p className="text-sm font-semibold">Leva 20 segundos — um consultor continua daqui com você:</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[["nome", "Seu nome"], ["empresa", "Empresa"], ["cargo", "Cargo"]].map(([n, l]) => (
                        <label key={n} className="text-xs">
                          <span className="sr-only">{l}</span>
                          <input name={n} required placeholder={l} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><MessageCircle className="h-4 w-4" /> Continuar no WhatsApp</button>
                      <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Proposta VitalOS")}&body=${encodeURIComponent(lead.intent)}`} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium"><Mail className="h-4 w-4" /> Prefiro e-mail</a>
                    </div>
                  </form>
                )}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
            <label htmlFor="concierge-input" className="sr-only">Sua pergunta</label>
            <input id="concierge-input" value={input} onChange={(e) => setInput(e.target.value)} autoFocus placeholder="Pergunte sobre NR-1, metodologia, planos…" className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" aria-label="Enviar" className="rounded-full bg-primary p-3 text-primary-foreground"><Send className="h-4 w-4" /></button>
          </form>
          <p className="px-4 pb-2 text-center text-[10px] text-muted-foreground">Conteúdo educativo. Não substitui PGR nem profissional habilitado.</p>
        </section>
      )}
    </>
  );
}
