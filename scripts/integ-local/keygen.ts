// Gera segredo JWT e chaves anon/service_role (HS256) SÓ para a pilha descartável vitalos-q1q2-integ.
// Grava em .env.integ ao lado deste arquivo; nada é impresso.
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const out = join(import.meta.dir, ".env.integ");
if (existsSync(out)) { console.log("chaves já existem"); process.exit(0); }
const secret = randomBytes(36).toString("base64url");
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (role: string) => {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({ iss: "supabase-integ", role, iat: 1795000000, exp: 1900000000 });
  return `${head}.${body}.${createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url")}`;
};
const pg = randomBytes(18).toString("base64url");
writeFileSync(out, [`JWT_SECRET=${secret}`, `ANON_KEY=${sign("anon")}`, `SERVICE_ROLE_KEY=${sign("service_role")}`, `POSTGRES_PASSWORD=${pg}`].join("\n") + "\n", { mode: 0o600 });
console.log("chaves geradas (não impressas)");
