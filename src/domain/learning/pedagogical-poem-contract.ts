// Contrato futuro da Carta-poema (LD-007) — Onda LDX-1 cria SÓ o contrato,
// sem geração. Ver docs/learning/REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_V1.md §7.
//
// Regras futuras obrigatórias quando este contrato ganhar implementação
// (LDX-2, runtimeEvidence do LD-007 no registro de dinâmicas):
// - composição determinística com versos autorais revisados, sem LLM;
// - geração local, sem persistência;
// - nome opcional; setor real desativado por padrão;
// - PDF via jsPDF/pdf-kit já existente (src/lib/pdf/pdf-kit.ts);
// - disclaimer artístico-educacional; nenhum acesso pelo gestor;
// - nenhuma telemetria com texto ou nome.

export type PedagogicalPoemTheme =
  | "falar"
  | "escutar"
  | "aprender_com_erros"
  | "respeito"
  | "coragem"
  | "cuidado"
  | "responsabilidade";

export interface PedagogicalPoemRequest {
  displayName?: string;
  teamLabel?: "minha equipe" | "minha área" | "nossa organização";
  selectedThemes: PedagogicalPoemTheme[];
}
