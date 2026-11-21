/** Fronteira fixa da fixture descartável de prova Q1; nenhum destino é configurável. */
export function requireQ1BrowserProofLocalTarget(
  apiUrl: string | undefined,
  dbUrl: string | undefined,
  container: string,
  dbBinding: string | undefined,
  projectId: string | undefined,
): void {
  if (
    apiUrl !== "http://127.0.0.1:57721" ||
    container !== "supabase_db_vitalos-q1-browser-proof" ||
    projectId !== "vitalos-q1-browser-proof"
  ) {
    throw new Error("Alvo da fixture Q1 não corresponde ao projeto descartável autorizado.");
  }

  let db: URL;
  try {
    db = new URL(dbUrl ?? "");
  } catch {
    throw new Error("URL do banco da fixture Q1 inválida.");
  }
  if (
    !["postgres:", "postgresql:"].includes(db.protocol) ||
    !["127.0.0.1", "localhost"].includes(db.hostname) ||
    db.port !== "57722" ||
    db.pathname !== "/postgres"
  ) {
    throw new Error("Banco da fixture Q1 não é o destino descartável autorizado.");
  }

  const bindings = (dbBinding ?? "").split(/\r?\n/).map((line) => line.trim());
  if (bindings.length !== 1 || !/^127\.0\.0\.1:57722$/.test(bindings[0])) {
    throw new Error("A porta do banco da fixture Q1 não está vinculada somente ao loopback.");
  }
}
