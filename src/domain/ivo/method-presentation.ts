// Version of the explanation and public demo contract, independent of instrument approval.
export const IVO_METHOD_VERSION = "1.0.0";
export const IVO_METHOD_ANCHOR = `metodo-ivo-${IVO_METHOD_VERSION.replaceAll(".", "-")}`;

export const IVO_METHOD_NOTES = {
  coverage: "A Visão IVO apresenta Eu, Nós, Liderança e Organização. Cada leitura depende da lente, do recorte publicado e das decisões de mapeamento. O composto institucional depende de aprovação metodológica.",
  demo: "O painel histórico usa dados sintéticos, normalização linear e pesos do pack. Valores neutros usados no exemplo legado não representam dados da sua organização.",
  trajectory: "A Trajetória usa dados sintéticos e hipóteses internas. A referência mantém o último valor do exemplo. O cenário alternativo mostra o que varia com as hipóteses escolhidas.",
  pnl: "O P&L simula um desfecho por vez. A diferença entre as quantidades de referência e de cenário é multiplicada pelo custo evitável por unidade. O resultado líquido desconta o custo da ação.",
} as const;

export const IVO_METHOD_LINKS = {
  coverage: {
    title: "JRC · Guia de indicadores compostos",
    url: "https://knowledge-for-policy.ec.europa.eu/composite-indicators/toolkit_en/navigation-page/10-step-guide_en",
    locator: "Etapas 1–8 · coerência, agregação e sensibilidade",
    limit: "Referência para estruturar e revisar índices. A validação do IVO depende de evidência própria.",
  },
  trajectory: {
    title: "Hyndman e Athanasopoulos · Forecasting: Principles and Practice",
    url: "https://otexts.com/fpp3/judgmental.html#scenario-forecasting",
    locator: "Seção 6.5 · Scenario forecasting",
    limit: "Referência sobre cenários. Os parâmetros demonstrativos do VitalOS são hipóteses internas.",
  },
  pnl: {
    title: "Watts et al. · PLOS Mental Health, 2026",
    url: "https://journals.plos.org/mentalhealth/article?id=10.1371/journal.pmen.0000601",
    locator: "Model inputs e Sensitivity analysis",
    limit: "Modelo de custo e consequência com exemplo hipotético britânico. Os parâmetros da tela vêm do usuário ou da demonstração.",
  },
} as const;
