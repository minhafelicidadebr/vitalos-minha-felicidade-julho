// Regressão do vazamento de mock.module que fez capsule-aggregator.server.test.ts
// falhar deterministicamente no CI (sempre devolvendo
// {capsuleId:"capsule-1", participantCount:12, triggered:true}, não importa
// o cenário) — causa raiz: wave-admin.server.test.ts mockava
// "./capsule-aggregator.server" no nível do módulo e nunca restaurava.
// mock.module() troca a resolução do especificador para TODO o processo de
// teste, não só para o arquivo que chamou — sem restauração, qualquer
// arquivo que importe o mesmo especificador DEPOIS (na mesma rodada de
// `bun test src`) pode receber o fake em vez da implementação real.
//
// Este teste prova o MECANISMO genérico (mock sem restauração vaza; mock
// restaurado via mock.module(spec, () => real) volta ao original) usando um
// módulo descartável (__fixtures__/dummy-module-for-mock-isolation.ts) —
// nunca o especificador real "./capsule-aggregator.server", para não correr
// o risco de este próprio teste contaminar capsule-aggregator.server.test.ts
// (interação observada durante o desenvolvimento desta correção: mockar e
// restaurar o especificador real dentro de um `test()", mesmo com
// mock.module(spec, () => real) ao final, mudou o resultado de
// capsule-aggregator.server.test.ts quando os três arquivos rodaram juntos —
// evidência de que o agendamento de testes do bun pode intercalar execução
// entre arquivos de formas não totalmente síncronas por arquivo. Registrado
// como risco residual no dossiê de entrega, não resolvido aqui).
//
// A correção real (wave-admin.server.test.ts capturar o módulo real ANTES
// de mockar e devolvê-lo num afterAll) permanece a melhoria correta: hoje
// wave-admin.server.test.ts nunca deixa "./capsule-aggregator.server"
// mockado sem tentativa de restauração — antes desta correção, não havia
// NENHUMA restauração, o que é estritamente pior.

import { describe, expect, test, mock } from "bun:test";

const DUMMY_SPECIFIER = "./__fixtures__/dummy-module-for-mock-isolation";

describe("isolamento de módulo — mock.module não pode vazar entre arquivos de teste", () => {
  test("mock.module sem restauração contamina uma reimportação subsequente (prova da causa raiz)", async () => {
    const real = await import(DUMMY_SPECIFIER);
    expect(real.identify()).toBe("real");

    // Simula exatamente o padrão que wave-admin.server.test.ts usava ANTES
    // da correção: mock.module sem nenhuma restauração.
    mock.module(DUMMY_SPECIFIER, () => ({ identify: () => "fake" }));

    const contaminated = await import(DUMMY_SPECIFIER);
    // Prova que o vazamento é real e não hipotético: uma reimportação do
    // MESMO especificador, depois do mock, recebe o fake — exatamente a
    // mecânica que fez capsule-aggregator.server.test.ts receber
    // {capsuleId:"capsule-1", participantCount:12, triggered:true} no CI,
    // não importa o cenário testado.
    expect(contaminated.identify()).toBe("fake");

    // Restaura para não deixar o processo de teste com o dummy mockado.
    mock.module(DUMMY_SPECIFIER, () => real);
  });
});

// A prova de que isto resolve o incidente real (não só o mecanismo genérico
// acima) é empírica, não pode ser um único assert isolado: com a correção em
// wave-admin.server.test.ts (captura do módulo real + afterAll restaurando),
// `bun test src/lib/api/wave-admin.server.test.ts src/lib/api/capsule-aggregator.server.test.ts`
// (nesta ordem, a mesma em que o CI expôs o vazamento) passa 14/14 — as 9
// asserções de capsule-aggregator.server.test.ts continuam corretas mesmo
// depois de wave-admin.server.test.ts mockar e liberar
// "./capsule-aggregator.server". Documentado no dossiê de entrega desta
// correção, reproduzido a cada execução do gate.
