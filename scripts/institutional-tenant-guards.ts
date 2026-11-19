// Guards puros do harness de personas institucionais (sem I/O).
// Recusam antes de qualquer leitura de ambiente, rede ou banco.

/** Fixtures preservadas: o harness nunca as cria nem altera. */
export const PROTECTED_TENANTS = new Set(["alfa", "beta"]);
/** Porta do app do checkout principal: o harness nunca a usa. */
export const RESERVED_APP_PORT = 8091;

export type TenantCommand =
  | { kind: "provision"; tenant: string; origin: string }
  | { kind: "readback" };

export function tenantSlug(tenant: string): string {
  return `institutional-${tenant}`;
}

export function syntheticEmails(tenant: string) {
  return { rh: `${tenant}@institutional.test`, leader: `lider.${tenant}@institutional.test` };
}

export function parseAppPort(argv: readonly string[]): number {
  const raw = valueOf(argv, "--port") ?? "8092";
  if (!/^\d{4,5}$/.test(raw)) throw new Error("Porta inválida.");
  const port = Number(raw);
  if (port === RESERVED_APP_PORT || port < 1024 || port > 65535) throw new Error(`Porta ${port} não autorizada para o harness.`);
  return port;
}

export function parseTenantCommand(argv: readonly string[]): TenantCommand {
  const command = argv.find((a) => !a.startsWith("--"));
  if (command === "readback") return { kind: "readback" };
  if (command !== "provision") throw new Error("Use: provision --tenant <nome> [--port 8092] | readback");
  const tenant = valueOf(argv, "--tenant");
  if (!tenant || !/^[a-z]{3,12}$/.test(tenant)) throw new Error("Tenant deve ter 3–12 letras minúsculas.");
  if (PROTECTED_TENANTS.has(tenant)) throw new Error(`Tenant ${tenant} é fixture preservada; o harness não a altera.`);
  return { kind: "provision", tenant, origin: `http://localhost:${parseAppPort(argv)}` };
}

function valueOf(argv: readonly string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

/** Remove tokens JWT e hex longos de qualquer linha antes de imprimir. */
export function sanitizeLine(line: string): string {
  return line.replace(/eyJ[\w.-]+/g, "[redacted]").replace(/\b[a-f0-9]{40,}\b/gi, "[redacted]");
}
