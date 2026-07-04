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
  lastInsert: Record<string, unknown> | null;
  lastUpsert: Record<string, unknown> | null;
  insertError: { code: string; message: string } | null;
} = {
  cardRows: {},
  eventRows: {},
  lastInsert: null,
  lastUpsert: null,
  insertError: null,
};

export const fakeSupabase = {
  from: (table: string) => ({
    select: (_cols: string) => ({
      eq: async (_col: string, userId: string) => {
        if (table === "sm2_card_state") return { data: fakeSupabaseState.cardRows[userId] ?? [] };
        if (table === "participation_events") return { data: fakeSupabaseState.eventRows[userId] ?? [] };
        return { data: [] };
      },
    }),
    upsert: (payload: Record<string, unknown>, _opts: unknown) => {
      fakeSupabaseState.lastUpsert = payload;
      return Promise.resolve({ data: null, error: null });
    },
    insert: (payload: Record<string, unknown>) => {
      fakeSupabaseState.lastInsert = payload;
      return Promise.resolve({ data: null, error: fakeSupabaseState.insertError });
    },
  }),
};
