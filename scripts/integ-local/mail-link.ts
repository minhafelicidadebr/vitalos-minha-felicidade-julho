// Link mágico mais recente do Mailpit da pilha descartável (127.0.0.1:57924) para o destinatário EXATO.
// Só loopback; uso exclusivo do ensaio sintético.
// Uso: bun --no-env-file scripts/integ-local/mail-link.ts rh.alfa@integ.test
const to = process.argv[2];
if (!to) throw new Error("informe o e-mail");
const MAILPIT = "http://127.0.0.1:57924/api/v1";
const list = (await (await fetch(`${MAILPIT}/messages?limit=50`)).json()) as { messages: Array<{ ID: string; To: Array<{ Address: string }> }> };
const hit = list.messages.find((m) => m.To.some((t) => t.Address === to));
if (!hit) process.exit(1);
const msg = (await (await fetch(`${MAILPIT}/message/${hit.ID}`)).json()) as { HTML?: string; Text?: string };
const link = /http:\/\/127\.0\.0\.1:57921\/auth\/v1\/verify\?[^\s"'<>)]+/.exec(`${msg.Text ?? ""} ${msg.HTML ?? ""}`)?.[0];
if (!link) process.exit(1);
console.log(link.replace(/&amp;/g, "&"));
