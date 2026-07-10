// Fake do cliente Supabase (anon, RLS-scoped) compartilhado entre
// learning-adapter.test.ts e participation-store.test.ts.
//
// Por quê um único fake compartilhado: bun:test mantém o registro de
// mock.module() global ao processo, e learning-adapter.ts é um módulo
// singleton — a PRIMEIRA vez que qualquer arquivo de teste dispara sua
// avaliação (import estático ou dinâmico), o `supabase` importado ali dentro
// fica permanentemente vinculado ao mock que estava ativo naquele instante.
// Se cada arquivo de teste registrasse seu PRÓPRIO fake via mock.module,
// qualquer um que "perdesse a corrida" ficaria com um fake incompatível
// (ex.: só com `.insert`, sem `.select`/`.upsert`) preso no módulo já
// carregado. Com um único objeto compartilhado, não importa qual arquivo
// dispara a primeira avaliação — o binding é sempre o mesmo fake completo.
export const fakeSupabaseState: {
  cardRows: Record<string, unknown[]>;
  eventRows: Record<string, unknown[]>;
  /** Registros do Diário de Prática por userId (practice_entries, I7 real). */
  practiceRows: Record<string, unknown[]>;
  /** Diretório de colegas (I6 real): chave "__org__" = pool geral (para o
   * caminho .neq()), chave userId = a própria linha (para o caminho .eq()). */
  directoryRows: Record<string, unknown[]>;
  lastInsert: Record<string, unknown> | null;
  lastUpsert: Record<string, unknown> | null;
  lastUpdate: Record<string, unknown> | null;
  lastDelete: { table: string; filters: Array<[string, string]> } | null;
  insertError: { code: string; message: string } | null;
  /** Id que o fake devolve para insert().select("id").single() (linha nova). */
  nextInsertedId: string;
} = {
  cardRows: {},
  eventRows: {},
  practiceRows: {},
  directoryRows: {},
  lastInsert: null,
  lastUpsert: null,
  lastUpdate: null,
  lastDelete: null,
  insertError: null,
  nextInsertedId: "row-uuid-1",
};

function rowsFor(table: string, filters: Array<[string, unknown]>): unknown[] {
  const firstValue = filters[0]?.[1] as string | undefined;
  if (table === "sm2_card_state") return fakeSupabaseState.cardRows[firstValue ?? ""] ?? [];
  if (table === "participation_events") return fakeSupabaseState.eventRows[firstValue ?? ""] ?? [];
  if (table === "practice_entries") return fakeSupabaseState.practiceRows[firstValue ?? ""] ?? [];
  if (table === "pair_directory_entries") {
    // .eq("user_id", x) busca a própria linha; .neq(...) busca o pool geral.
    const userIdFilter = filters.find(([col]) => col === "user_id");
    return fakeSupabaseState.directoryRows[(userIdFilter?.[1] as string) ?? "__org__"] ?? [];
  }
  return [];
}

export const fakeSupabase = {
  from: (table: string) => ({
    select: (_cols: string) => {
      const filters: Array<[string, unknown]> = [];
      const chain: Record<string, unknown> = {
        // eq() é awaitable direto (consumidores S5) E encadeável com .order()/
        // outro .eq()/.maybeSingle() (practice-journal-adapter, pair-directory).
        eq: (col: string, value: unknown) => {
          filters.push([col, value]);
          const rows = rowsFor(table, filters);
          const result = { data: rows, error: null };
          return Object.assign(Promise.resolve(result), chain, {
            order: async (_o: string, _opts: unknown) => result,
            maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
          });
        },
        // neq() é awaitable direto (loadOrgDirectory nunca encadeia depois).
        neq: (_col: string, _value: unknown) => {
          const rows = rowsFor(table, filters);
          return Promise.resolve({ data: rows, error: null });
        },
      };
      return chain;
    },
    upsert: (payload: Record<string, unknown>, _opts: unknown) => {
      fakeSupabaseState.lastUpsert = payload;
      return Promise.resolve({ data: null, error: null });
    },
    insert: (payload: Record<string, unknown>) => {
      fakeSupabaseState.lastInsert = payload;
      const result = { data: null, error: fakeSupabaseState.insertError };
      // Awaitable direto (S5) E encadeável com .select().single() (I7 real).
      return Object.assign(Promise.resolve(result), {
        select: (_c: string) => ({
          single: async () =>
            fakeSupabaseState.insertError
              ? { data: null, error: fakeSupabaseState.insertError }
              : { data: { id: fakeSupabaseState.nextInsertedId }, error: null },
        }),
      });
    },
    update: (payload: Record<string, unknown>) => ({
      eq: (_col: string, _value: string) => {
        fakeSupabaseState.lastUpdate = payload;
        return Promise.resolve({ data: null, error: null });
      },
    }),
    delete: () => {
      const filters: Array<[string, string]> = [];
      const chain = {
        eq: (col: string, value: string) => {
          filters.push([col, value]);
          fakeSupabaseState.lastDelete = { table, filters };
          return Object.assign(Promise.resolve({ data: null, error: null }), chain);
        },
      };
      return chain;
    },
  }),
};
