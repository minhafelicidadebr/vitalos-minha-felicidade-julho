// Orientação do Q2 para as telas Leitura e Ações: recorte client-safe do guia.
// O guia (enterprise-guide.ts) segue só no servidor; este recorte repete apenas a voz, a parte,
// o destino e os passos do Q2, e um teste confere que ele é idêntico ao guia (sem divergência).
import type { GuideMatrixCell, GuidePerspective } from "./guide-types";

export interface Q2OrientationCell {
  voice: string | null;
  mode: GuideMatrixCell["mode"];
  who: string;
  receives: string;
  labels?: { first: string; second: string };
}
export interface Q2OrientationData {
  perspectives: Record<GuidePerspective, Q2OrientationCell>;
  steps: { label: string; who: string }[];
  evidence: string;
}

export const Q2_ORIENTATION: Q2OrientationData = {
  "perspectives": {
    "rh": {
      "voice": "Escolha a prioridade da equipe e acompanhe a ação.",
      "mode": "atua",
      "who": "Consulte a leitura do grupo, escolha uma prática aprovada, ative o plano, designe a liderança e revise o andamento",
      "receives": "A liderança recebe a ação. A equipe acompanha a devolutiva coletiva."
    },
    "lideranca": {
      "voice": "Combine a prática com a equipe e registre o que aconteceu.",
      "mode": "atua",
      "who": "Mudar o estado e registrar a evidência de execução da própria ação, no plano ativo",
      "receives": "O RH, que usa o registro na revisão"
    },
    "colaborador": {
      "voice": "Veja o que a equipe decidiu fazer e acompanhe o retorno.",
      "mode": "acompanha",
      "who": "RH e liderança atuam",
      "receives": "A devolutiva coletiva: título (depois do aviso), setor, fator, estado, mês do prazo e “execução registrada”"
    },
    "sst": {
      "voice": "Acompanhe a devolutiva coletiva como membro da organização.",
      "mode": "acompanha",
      "who": "RH e liderança atuam",
      "receives": "A devolutiva coletiva, como membro"
    },
    "direcao": {
      "voice": "O RH conduz o plano. A direção acompanha o que foi executado e decidido pelo relatório.",
      "mode": "dependencia",
      "who": "O RH atua",
      "receives": "O relatório (Q5)"
    },
    "plataforma": {
      "voice": "A habilitação do Q2 e o primeiro acesso de RH são feitos aqui.",
      "mode": "atua",
      "who": "Habilitar o Q2 e criar o primeiro acesso de RH",
      "receives": "A empresa"
    }
  },
  "steps": [
    {
      "label": "Leitura agregada",
      "who": "RH"
    },
    {
      "label": "Atividade aprovada",
      "who": "RH"
    },
    {
      "label": "Plano",
      "who": "RH"
    },
    {
      "label": "Execução",
      "who": "Liderança"
    },
    {
      "label": "Aprendizagem e revisão",
      "who": "RH"
    },
    {
      "label": "Devolutiva coletiva",
      "who": "Equipe"
    }
  ],
  "evidence": "A execução foi registrada. A melhora ainda não foi avaliada."
};
