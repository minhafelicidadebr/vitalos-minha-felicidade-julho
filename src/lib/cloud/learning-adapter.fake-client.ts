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
  lastInsert: Record<string, unknown> | null;
  lastUpsert: Record<string, unknown> | null;
  lastDelete: { table: string; filters: Array<[string, string]> } | null;
  insertError: { code: string; message: string } | null;
  /** Id que o fake devolve para insert().select("id").single() (linha nova). */
  nextInsertedId: string;
} = {
  cardRows: {},
  eventRows: {},
  practiceRows: {},
  lastInsert: null,
  lastUpsert: null,
  lastDelete: null,
  insertError: null,
  nextInsertedId: "row-uuid-1",
};

function rowsFor(table: string, userId: string): unknown[] {
  if (table === "sm2_card_state") return fakeSupabaseState.cardRows[userId] ?? [];
  if (table === "participation_events") return fakeSupabaseState.eventRows[userId] ?? [];
  if (table === "practice_entries") return fakeSupabaseState.practiceRows[userId] ?? [];
  return [];
}

export const fakeSupabase = {
  from: (table: string) => ({
    select: (_cols: string) => ({
      // eq() é awaitable direto (consumidores S5) E encadeável com .order()
      // (practice-journal-adapter) — um único fake cobre os dois idiomas.
      eq: (_col: string, userId: string) => {
        const result = { data: rowsFor(table, userId), error: null };
        return Object.assign(Promise.resolve(result), {
          order: async (_o: string, _opts: unknown) => result,
        });
      },
    }),
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
