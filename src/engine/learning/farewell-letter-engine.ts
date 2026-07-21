// Farewell Letter Engine — carta-poema pedagógica DETERMINÍSTICA (LD-007,
// LDX-2 Fatia E).
//
// Doutrina (LD-007): composição determinística e local a partir de blocos
// AUTORAIS revisados — SEM LLM, SEM inferência sobre a pessoa. Nome é opcional;
// setor nunca entra; nada é enviado a gestor. Classificação: expressão
// artístico-educacional, NÃO evidência — por isso a carta não cita estudo nem
// faz claim científico; carrega disclaimer explícito. Persistência: NONE (o
// PDF é gerado no cliente, nada é gravado). Engine puro: sem React, sem I/O.

export interface FarewellLetterBlocks {
  title: string;
  /** Saudação com o marcador {nome} — substituído só se um nome for dado. */
  greetingWithName: string;
  /** Saudação neutra, usada quando não há nome (nunca inferimos um). */
  greetingNeutral: string;
  /** Estrofes autorais revisadas, na ordem de leitura. */
  stanzas: readonly string[];
  closingLine: string;
  signature: string;
  /** Disclaimer obrigatório (expressão, não evidência; sem IA; sem persistência). */
  disclaimer: string;
}

export interface ComposedLetter {
  title: string;
  greeting: string;
  stanzas: readonly string[];
  closingLine: string;
  signature: string;
  disclaimer: string;
}

/** Limpa o nome opcional: aparado, sem quebras, teto de tamanho. Vazio → sem
 * nome (a carta usa a saudação neutra — nunca inventamos um nome). */
export function sanitizeName(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, " ").trim().slice(0, 40);
  return cleaned.length > 0 ? cleaned : null;
}

/** Compõe a carta de forma determinística: mesmos blocos + mesmo nome →
 * exatamente a mesma carta. A única variação é a saudação (com/sem nome). */
export function composeFarewellLetter(
  blocks: FarewellLetterBlocks,
  options: { name?: string } = {},
): ComposedLetter {
  const name = sanitizeName(options.name);
  const greeting = name
    ? blocks.greetingWithName.replace("{nome}", name)
    : blocks.greetingNeutral;

  return {
    title: blocks.title,
    greeting,
    stanzas: [...blocks.stanzas],
    closingLine: blocks.closingLine,
    signature: blocks.signature,
    disclaimer: blocks.disclaimer,
  };
}

/** Nome de arquivo determinístico e seguro para o PDF local. O NFD + o filtro
 * [^a-z0-9] removem acentos e qualquer caractere não-ASCII. */
export function farewellLetterFilename(name: string | null): string {
  const slug = name
    ? name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") // remove os acentos combinantes do NFD
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "";
  return slug ? `carta-voz-segura-${slug}.pdf` : "carta-voz-segura.pdf";
}
