// 15 Embaixadorias do Florescimento — voluntary, mission-driven fronts

export interface Ambassadorship {
  id: string;
  name: string;
  emoji: string;
  pillarName: string;
  description: string;
  members: number;
  openMissions: number;
  joined?: boolean;
}

export const AMBASSADORSHIPS: Ambassadorship[] = [
  { id: "amb-energia", name: "Guardiões da Energia", emoji: "⚡", pillarName: "Energia & Vitalidade", description: "Pausas reais, rituais de recuperação e fim do glamour do cansaço.", members: 18, openMissions: 2 },
  { id: "amb-proposito", name: "Tecelões de Propósito", emoji: "🧭", pillarName: "Propósito & Significado", description: "Conectar o trabalho diário ao impacto que ele gera.", members: 12, openMissions: 1 },
  { id: "amb-aprendizagem", name: "Cultivadores de Maestria", emoji: "🌱", pillarName: "Crescimento & Maestria", description: "Comunidades de prática e trocas de conhecimento entre áreas.", members: 21, openMissions: 3 },
  { id: "amb-equilibrio", name: "Defensores do Equilíbrio", emoji: "⚖️", pillarName: "Equilíbrio & Autonomia", description: "Direito à desconexão e agendas humanas.", members: 15, openMissions: 2, joined: true },
  { id: "amb-seguranca", name: "Guardiões da Voz Segura", emoji: "🛡️", pillarName: "Segurança Psicológica", description: "Espaços onde errar ensina e discordar constrói.", members: 14, openMissions: 1 },
  { id: "amb-cooperacao", name: "Pontes de Confiança", emoji: "🤝", pillarName: "Cooperação & Confiança", description: "Quebrar silos com colaboração real entre equipes.", members: 9, openMissions: 1 },
  { id: "amb-reconhecimento", name: "Multiplicadores de Kudos", emoji: "✨", pillarName: "Reconhecimento entre Pares", description: "Cultura de reconhecimento específico e sincero.", members: 26, openMissions: 2 },
  { id: "amb-pertencimento", name: "Anfitriões da Comunidade", emoji: "🏠", pillarName: "Comunicação & Pertencimento", description: "Ninguém almoça sozinho se não quiser.", members: 17, openMissions: 2 },
  { id: "amb-clareza", name: "Tradutores de Clareza", emoji: "🔍", pillarName: "Clareza & Direção", description: "Comunicação que chega, prioridade que se entende.", members: 8, openMissions: 1 },
  { id: "amb-justica", name: "Sentinelas da Coerência", emoji: "📏", pillarName: "Justiça & Coerência", description: "Regras que valem para todos, decisões explicáveis.", members: 7, openMissions: 0 },
  { id: "amb-desenvolvimento", name: "Mentores do Caminho", emoji: "🗺️", pillarName: "Desenvolvimento de Pessoas", description: "Mentoria voluntária e conversas de carreira.", members: 13, openMissions: 2 },
  { id: "amb-cuidado", name: "Rede do Cuidado Ativo", emoji: "💚", pillarName: "Cuidado Ativo da Liderança", description: "Apoiar líderes a perceber e agir cedo.", members: 11, openMissions: 1 },
  { id: "amb-condicoes", name: "Vigias da Carga Justa", emoji: "🧰", pillarName: "Condições & Carga de Trabalho", description: "Termômetro de carga e repactuação sem medo.", members: 10, openMissions: 2 },
  { id: "amb-inclusao", name: "Construtores de Equidade", emoji: "🌈", pillarName: "Inclusão, Equidade & Diversidade", description: "Oportunidades iguais e respeito às identidades.", members: 19, openMissions: 1 },
  { id: "amb-sustentabilidade", name: "Agentes do Bem-Comum", emoji: "🌍", pillarName: "Sustentabilidade & Bem-Comum", description: "Voluntariado, impacto social e responsabilidade ambiental.", members: 16, openMissions: 2 },
];
