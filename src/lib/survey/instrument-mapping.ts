// Mapeia o código de instrumento armazenado em waves.instrument (banco) para a
// chave de registro usada por survey-mock (rótulo descritivo de exibição).
// Banco usa códigos simples e estáveis (compatível com enum SQL); o registro de
// surveys usa rótulos como "PERMA+V / IVO" e "VIA-T". Função pura — sem I/O.

const DB_INSTRUMENT_TO_SURVEY_KEY: Record<string, string> = {
  COPSOQ: "COPSOQ",
  PERMA: "PERMA+V / IVO",
  VIA_T: "VIA-T",
  FIB_T: "FIB-T",
};

export function dbInstrumentToSurveyKey(dbInstrument: string): string {
  return DB_INSTRUMENT_TO_SURVEY_KEY[dbInstrument] ?? dbInstrument;
}
