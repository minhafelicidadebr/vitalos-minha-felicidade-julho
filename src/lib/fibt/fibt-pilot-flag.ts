// Feature gate do piloto FIB-T.
//
// O painel /fibt-piloto lê persistência REAL e depende de três migrations
// (wave_cohorts, aggregate_cohort_responses com contrato endurecido,
// count_cohort_participation) que estão aplicadas no staging e NÃO em
// produção. Publicar o código sem o gate significa que a rota chamaria RPCs
// inexistentes contra o banco produtivo.
//
// O gate é fail-closed por desenho: ausente, vazio, "1", "yes" ou qualquer
// outra coisa que não seja exatamente "true" mantém o piloto desligado.
// Um flag que aceita variações "por conveniência" acaba ligado por acidente.
//
// Desligado, a rota NÃO chama o Supabase — e também não cai para mock. Mostrar
// um agregado fictício onde deveria haver dado real é o modo de falha que a
// FIBT-1 inteira foi construída para impedir.

export interface FibtPilotEnv {
  VITE_FIBT_PILOT_ENABLED?: string | undefined;
  /**
   * Assinatura de índice necessária para aceitar `import.meta.env`: sem ela,
   * a detecção de "weak type" do TypeScript recusa um tipo cujas propriedades
   * são todas opcionais e não têm sobreposição declarada com o alvo.
   */
  [key: string]: unknown;
}

/**
 * `env` é injetável para teste. O default lê o ambiente que o Vite embute no
 * bundle em build time — ou seja, a decisão é tomada na compilação daquele
 * artefato, não em runtime pelo navegador.
 */
export function isFibtPilotEnabled(env: FibtPilotEnv = import.meta.env): boolean {
  const valor = env.VITE_FIBT_PILOT_ENABLED;
  return typeof valor === "string" && valor.trim().toLowerCase() === "true";
}

/** Texto único do estado bloqueado — a rota e a camada de dados usam o mesmo. */
export const FIBT_PILOT_DISABLED_REASON =
  "O piloto FIB-T está desabilitado neste ambiente. Ele depende de migrations " +
  "que ainda não foram aplicadas aqui, e nenhum dado de demonstração é exibido " +
  "no lugar do resultado real.";

/**
 * Decisão de produto (TASK 10.1): o piloto FIB-T é um gate de INSTRUMENTO,
 * não de modelo de distribuição do link. Qualquer onda com
 * `instrument === "FIB_T"` exige o piloto ligado — INDEPENDENTE de
 * `linkModel` ser "SECTOR", "INDIVIDUAL" ou qualquer outro valor futuro.
 *
 * A assinatura desta função é a própria prova estrutural do contrato: ela
 * não recebe `linkModel` (nem qualquer outro parâmetro de forma de
 * distribuição), então não existe COMO o modelo de link influenciar o
 * resultado — não é uma convenção de chamada a manter, é impossível pela
 * forma da função. Isso fecha a lacuna anterior, em que só
 * `linkModel === "SECTOR"` disparava a checagem e uma onda FIB_T com
 * `linkModel` "INDIVIDUAL" (ou omitido) passava direto.
 *
 * Contrato lógico exigido:
 *   instrument !== "FIB_T"                    → true  (comportamento de sempre)
 *   instrument === "FIB_T" && pilotEnabled=false → false (FAIL_CLOSED)
 *   instrument === "FIB_T" && pilotEnabled=true  → true  (segue o caminho válido)
 *
 * `pilotEnabled` é injetado (em vez de ler `isFibtPilotEnabled()` aqui
 * dentro) para manter esta função pura e testável sem mockar
 * `import.meta.env` — o chamador real passa `isFibtPilotEnabled()`.
 */
export function isFibtInstrumentGateOpen(instrument: string, pilotEnabled: boolean): boolean {
  if (instrument !== "FIB_T") return true;
  return pilotEnabled;
}
