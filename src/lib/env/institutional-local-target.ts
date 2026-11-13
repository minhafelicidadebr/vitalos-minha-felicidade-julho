// Fronteira exclusiva da prova institucional. Nenhum host/porta é configurável.
export function requireInstitutionalLocalTarget(apiUrl: string | undefined, dbUrl: string | undefined, container: string) {
  if (apiUrl !== "http://127.0.0.1:57621" || container !== "supabase_db_vitalos-institutional-first-admin") throw new Error("Alvo institucional local divergente.");
  const db = new URL(dbUrl ?? "");
  if (!['postgres:', 'postgresql:'].includes(db.protocol) || !['127.0.0.1', 'localhost'].includes(db.hostname) || db.port !== '57622' || db.pathname !== '/postgres') throw new Error("Banco institucional não é o descartável autorizado.");
}
