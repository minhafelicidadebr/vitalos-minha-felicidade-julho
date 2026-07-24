// Módulo descartável, usado SÓ por capsule-aggregator-module-isolation.test.ts
// para provar o mecanismo de vazamento/restauração de mock.module() sem
// nunca tocar no especificador real "./capsule-aggregator.server" — testar
// o mecanismo genérico não deveria arriscar contaminar o módulo real que
// outros arquivos de teste também importam.

export function identify(): string {
  return "real";
}
