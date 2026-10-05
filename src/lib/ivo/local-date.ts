// Data civil "de hoje" no fuso da organização (America/Sao_Paulo), em AAAA-MM-DD.
//
// `new Date().toISOString().slice(0, 10)` devolve a data em UTC: a partir das
// 21h de Brasília já é o dia seguinte, e a evidência era gravada com data
// futura (staging, 04/10/2026 21:29 → occurred_on 2026-10-05). A exibição do
// app já usa America/Sao_Paulo; a data padrão e o limite do formulário também.
export const IVO_DISPLAY_TIME_ZONE = "America/Sao_Paulo";

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

/**
 * Data civil armazenada (AAAA-MM-DD) por extenso: "11 de outubro de 2026".
 * Lê os componentes do texto — sem Date, sem fuso — e por isso nunca desloca o
 * dia nem troca dia e mês (11/10 × 10/11). Entrada fora do formato → "—".
 */
export function formatIsoDateLong(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) return "—";
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "—";
  return `${day} de ${MONTHS_PT[month - 1]} de ${Number(match[1])}`;
}

export function todayInSaoPaulo(now: Date = new Date()): string {
  // sv-SE formata como AAAA-MM-DD, sem depender do locale do navegador.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: IVO_DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
