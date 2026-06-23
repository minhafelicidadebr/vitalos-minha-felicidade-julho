// Catálogo de medidas de controle do PGR Psicossocial (mock de domínio, versionado). Fonte-da-
// verdade das ações que a rota /plano-nr1 exibe. O engine (`pgr-engine`) só RECEBE estas sementes
// e as sequencia na hierarquia NR-01 com prazo e status.
//
// DOUTRINA (Fable 5 §8 + NR-01 1.5.4.4.6): toda ação age sobre a ORGANIZAÇÃO DO TRABALHO — nunca
// sobre a pessoa exposta. Cada driver tem ao menos uma medida de FONTE (eliminação/organização)
// antes de qualquer medida administrativa. Não há medida individual culpabilizante (ex.: curso de
// resiliência como resposta a sobrecarga). Toda medida carrega responsável e, quando aplicável,
// embasamento citável (ecoa o gate G1 do copiloto: anti-alucinação por fonte).

import type { PgrMeasureSeed } from "@/engine/nr1/pgr-engine";

export const PGR_MEASURES: PgrMeasureSeed[] = [
  // ── Carga & Recuperação ────────────────────────────────────────────────────
  {
    driverId: "carga",
    tier: "eliminacao",
    action: "Redesenhar a distribuição de carga: redimensionar metas e equipe nos picos crônicos antes de exigir mais ritmo das pessoas.",
    responsible: "Alta Direção",
    evidence: "Bakker & Demerouti (2017); ISO 45003:2021",
  },
  {
    driverId: "carga",
    tier: "organizacao",
    action: "Instituir pausas e janelas de recuperação protegidas na jornada; revisar prazos e sobreposição de demandas por equipe.",
    responsible: "Liderança",
    evidence: "Karasek & Theorell (1990)",
  },
  {
    driverId: "carga",
    tier: "monitoramento",
    action: "Acompanhar exigências quantitativas e horas extras por equipe a cada ciclo, com gatilho de revisão acima do limite.",
    responsible: "SESMT",
  },

  // ── Autonomia & Flexibilidade ──────────────────────────────────────────────
  {
    driverId: "autonomia",
    tier: "organizacao",
    action: "Ampliar latitude de decisão sobre como, quando e em que ritmo o trabalho é feito (job redesign demanda-controle).",
    responsible: "Liderança",
    evidence: "Karasek (1979); Parker et al. (2019)",
  },
  {
    driverId: "autonomia",
    tier: "administrativa",
    action: "Formalizar política de flexibilidade (horário, local, micropausas) com critérios claros e aplicáveis a todas as funções.",
    responsible: "RH",
  },
  {
    driverId: "autonomia",
    tier: "monitoramento",
    action: "Medir percepção de influência a cada pulso e revisar onde o controle real continua baixo.",
    responsible: "RH",
  },

  // ── Clareza & Previsibilidade ──────────────────────────────────────────────
  {
    driverId: "clareza",
    tier: "organizacao",
    action: "Explicitar papéis, prioridades e fronteiras de responsabilidade por equipe, eliminando ambiguidade e retrabalho.",
    responsible: "Liderança",
    evidence: "Kahn et al. (1964); ISO 45003:2021",
  },
  {
    driverId: "clareza",
    tier: "administrativa",
    action: "Padronizar comunicação antecipada de mudanças (o que muda, quando, por quê e quem é afetado).",
    responsible: "RH",
  },
  {
    driverId: "clareza",
    tier: "monitoramento",
    action: "Verificar clareza de papel e previsibilidade nas devolutivas de equipe a cada ciclo.",
    responsible: "Gestão",
  },

  // ── Liderança Preventiva ───────────────────────────────────────────────────
  {
    driverId: "lideranca",
    tier: "organizacao",
    action: "Inserir a gestão de risco psicossocial nas responsabilidades da liderança: organizar, apoiar e proteger o trabalho, não só cobrar.",
    responsible: "Alta Direção",
    evidence: "Hammer et al. (2011)",
  },
  {
    driverId: "lideranca",
    tier: "administrativa",
    action: "Capacitar lideranças em liderança preventiva e reconhecimento de sinais de sobrecarga na equipe.",
    responsible: "RH",
  },
  {
    driverId: "lideranca",
    tier: "monitoramento",
    action: "Acompanhar qualidade de liderança percebida por equipe (sem expor indivíduos; k-anon ≥ 5).",
    responsible: "RH",
  },

  // ── Apoio & Comunidade ─────────────────────────────────────────────────────
  {
    driverId: "apoio",
    tier: "organizacao",
    action: "Reorganizar o trabalho para garantir suporte de pares e chefia nos momentos de maior exigência (cobertura, backups, escuta).",
    responsible: "Liderança",
    evidence: "Eurofound (2021)",
  },
  {
    driverId: "apoio",
    tier: "administrativa",
    action: "Criar rituais de apoio coletivo e canais de escuta ativa por equipe.",
    responsible: "RH",
  },
  {
    driverId: "apoio",
    tier: "monitoramento",
    action: "Monitorar apoio social e comunidade nos pulsos; agir onde o isolamento cresce.",
    responsible: "CIPA",
  },

  // ── Confiança & Voz ────────────────────────────────────────────────────────
  {
    driverId: "confianca",
    tier: "organizacao",
    action: "Construir segurança psicológica: garantir que falar, participar e discordar não traga retaliação (regras de reunião, resposta da liderança).",
    responsible: "Liderança",
    evidence: "Edmondson (1999)",
  },
  {
    driverId: "confianca",
    tier: "administrativa",
    action: "Abrir canais seguros de voz e fechar o ciclo: o que foi ouvido virou ação visível.",
    responsible: "RH",
  },
  {
    driverId: "confianca",
    tier: "monitoramento",
    action: "Acompanhar percepção de voz e confiança institucional a cada ciclo.",
    responsible: "RH",
  },

  // ── Justiça & Reconhecimento ───────────────────────────────────────────────
  {
    driverId: "justica",
    tier: "organizacao",
    action: "Tornar transparentes os critérios de distribuição de trabalho, reconhecimento e progressão; corrigir iniquidades detectadas.",
    responsible: "RH",
    evidence: "Stansfeld & Candy (2006)",
  },
  {
    driverId: "justica",
    tier: "administrativa",
    action: "Estruturar programa de reconhecimento por contribuição real, não por proximidade.",
    responsible: "Liderança",
  },
  {
    driverId: "justica",
    tier: "monitoramento",
    action: "Medir justiça percebida e revisar onde a percepção de iniquidade persiste.",
    responsible: "RH",
  },

  // ── Inclusão & Proteção ────────────────────────────────────────────────────
  {
    driverId: "inclusao",
    tier: "eliminacao",
    action: "Eliminar tolerância a comportamentos ofensivos: política antiassédio com resposta imediata e canal seguro de denúncia.",
    responsible: "Alta Direção",
    evidence: "OIT (2019), Convenção 190; CID-11",
  },
  {
    driverId: "inclusao",
    tier: "organizacao",
    action: "Garantir ambiente de dignidade e pertencimento para todas as pessoas (acessibilidade, equidade, prevenção coletiva).",
    responsible: "CIPA",
  },
  {
    driverId: "inclusao",
    tier: "monitoramento",
    action: "Acompanhar comunidade e proteção percebida; tratar qualquer sinal de violência como prioridade imediata.",
    responsible: "SESMT",
  },

  // ── Propósito & Contribuição ───────────────────────────────────────────────
  {
    driverId: "proposito",
    tier: "organizacao",
    action: "Conectar visivelmente tarefa → missão → beneficiário, sobretudo em funções repetitivas ou distantes do impacto.",
    responsible: "Liderança",
    evidence: "Grant (2008); Wrzesniewski et al. (2010)",
  },
  {
    driverId: "proposito",
    tier: "administrativa",
    action: "Incluir o sentido do trabalho nas devolutivas e rituais de equipe (sem substituir mudanças na organização do trabalho).",
    responsible: "RH",
  },
  {
    driverId: "proposito",
    tier: "monitoramento",
    action: "Medir sentido percebido nos pulsos e revisar onde o desengajamento cresce.",
    responsible: "RH",
  },

  // ── Aprendizagem & Desenvolvimento ─────────────────────────────────────────
  {
    driverId: "aprendizagem",
    tier: "organizacao",
    action: "Reservar tempo protegido para aprender e aplicar capacidades no próprio fluxo de trabalho.",
    responsible: "Liderança",
    evidence: "Dweck (2006)",
  },
  {
    driverId: "aprendizagem",
    tier: "administrativa",
    action: "Estruturar trilhas de desenvolvimento ligadas ao trabalho real, com acesso equitativo.",
    responsible: "RH",
  },
  {
    driverId: "aprendizagem",
    tier: "monitoramento",
    action: "Acompanhar oportunidades de aprendizado percebidas por equipe a cada ciclo.",
    responsible: "RH",
  },

  // ── Realização Coletiva ────────────────────────────────────────────────────
  {
    driverId: "realizacao",
    tier: "organizacao",
    action: "Definir metas claras, factíveis e reconhecidas coletivamente; remover metas inalcançáveis que produzem frustração crônica.",
    responsible: "Liderança",
    evidence: "Locke & Latham (2002)",
  },
  {
    driverId: "realizacao",
    tier: "administrativa",
    action: "Celebrar marcos coletivos e tornar visível o progresso real da equipe.",
    responsible: "Gestão",
  },
  {
    driverId: "realizacao",
    tier: "monitoramento",
    action: "Revisar realização percebida e ajuste de metas a cada ciclo.",
    responsible: "RH",
  },

  // ── Segurança de Futuro ────────────────────────────────────────────────────
  {
    driverId: "futuro",
    tier: "organizacao",
    action: "Reduzir insegurança em reestruturações: comunicar cedo, dar previsibilidade e proteger o equilíbrio trabalho-vida nas transições.",
    responsible: "Alta Direção",
    evidence: "Sverke et al. (2002); De Witte (2005)",
  },
  {
    driverId: "futuro",
    tier: "administrativa",
    action: "Estabelecer protocolo de comunicação de mudanças organizacionais com apoio às pessoas afetadas.",
    responsible: "RH",
  },
  {
    driverId: "futuro",
    tier: "monitoramento",
    action: "Acompanhar insegurança percebida durante e após períodos de mudança.",
    responsible: "RH",
  },
];

// ─── Cópia introdutória da rota (domínio, não engine) ──────────────────────────

export const PGR_INTRO = {
  eyebrow: "Transformar · Domínio B",
  title: "PGR Psicossocial",
  subtitle:
    "Da exposição medida ao plano de ação exigido pela NR-01. Cada risco prioritário recebe medidas de controle na organização do trabalho — com responsável, prazo e status.",
} as const;
