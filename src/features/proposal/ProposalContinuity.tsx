import formationPhoto from "@/assets/presentation/v4-compreender.jpg";
import youthPhoto from "@/assets/educational-innovations-hollywood-learning.jpg";
import schoolPhoto from "@/assets/methodology-human-innovation-cycle.jpg";
import preventionPhoto from "@/assets/nr1-hero-people.jpg";
import { useId, useState } from "react";
import { Building2, Compass, HeartHandshake, Layers3, ShieldCheck, Sparkles, UserRound, UsersRound } from "lucide-react";
import { calculateOutcomeScenario } from "@/engine/pnl/outcome-scenario";
import { Understand } from "./ProposalV3";

const dimensions = [
  { name: "Eu", question: "Como vivencio meu trabalho?", icon: UserRound },
  { name: "Nós", question: "Como colaboramos e nos apoiamos?", icon: UsersRound },
  { name: "Liderança", question: "Como a gestão dá clareza e suporte?", icon: Compass },
  { name: "Organização", question: "Que condições sustentam o bem-estar?", icon: Building2 },
];

const lenses = [
  {
    id: "Q1", name: "COPSOQ", focus: "Riscos psicossociais", icon: ShieldCheck,
    reading: "Que condições de trabalho pedem investigação ou prevenção?",
    action: "Revisar a distribuição de demandas com a equipe e com SST.",
    evidence: "Registrar a medida acordada e revisar sua aplicação com SST.",
  },
  {
    id: "Q2", name: "FIB-T", focus: "Bem-estar coletivo", icon: UsersRound,
    reading: "Onde a equipe percebe espaço para melhorar comunicação, voz ou apoio?",
    action: "Priorizar um tema da devolutiva, criar um plano no Agir e definir responsável, prazo e indicador.",
    evidence: "Acompanhar a execução, registrar aprendizados e preparar a devolutiva coletiva.",
  },
  {
    id: "Q3", name: "PERMA+V", focus: "Florescimento e vitalidade", icon: Sparkles,
    reading: "Que experiências de engajamento, sentido ou vitalidade vale investigar?",
    action: "Facilitar uma oficina com práticas de emoções positivas, flow, apoio entre colegas, sentido, realizações e recuperação.",
    evidence: "Registrar participação e utilidade percebida. Mensuração exige escopo próprio.",
  },
  {
    id: "Q4", name: "VIA-T", focus: "Forças de caráter", icon: HeartHandshake,
    reading: "Que forças a pessoa reconhece e gostaria de aplicar no trabalho?",
    action: "Criar um roteiro individual para experimentar uma força em uma atividade.",
    evidence: "Refletir sobre a experiência, com compartilhamento voluntário.",
  },
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function IvoOverview({ slide = false }: { slide?: boolean }) {
  const Heading = slide ? "h2" : "h3";
  return (
    <div className="proposal-ivo-block">
      <div>
        <p className="proposal-ivo-kicker"><Layers3 aria-hidden size={16} /> Estrutura metodológica</p>
        <Heading className={slide ? "slide-title" : "proposal-ivo-heading"}>Como o IVO lê a vitalidade</Heading>
        <p>O Índice de Vitalidade Organizacional organiza a leitura em quatro dimensões. Cada uma ajuda a formular uma pergunta sobre o trabalho.</p>
      </div>
      <ul className="proposal-ivo-grid">
        {dimensions.map(({ name, question, icon: Icon }) => (
          <li className="proposal-ivo-card proposal-ift-color" key={name}>
            <Icon aria-hidden size={21} />
            <strong>{name}</strong>
            <span>{question}</span>
          </li>
        ))}
      </ul>
      <ol className="proposal-ivo-grid">
        {["Ler o indicador da lente", "Escolher uma dimensão-alvo", "Registrar o que foi feito", "Reavaliar com dados comparáveis"].map((step) => <li key={step} className="proposal-ivo-card"><strong>{step}</strong></li>)}
      </ol>
      <p className="proposal-ivo-note">A execução fica registrada no Agir. A mudança em vitalidade depende de uma nova leitura comparável. O cenário econômico estima custos sob hipóteses.</p>
      <div>
        <Understand label="Como o IVO é lido?" title="Como o IVO é lido"
          description="Dimensões, instrumentos e origem das leituras." variant="button">
          <p>Cada instrumento tem sua própria escala, versão, finalidade e regra de publicação. Os resultados mantêm sua origem e o contexto de leitura.</p>
          <ul className="proposal-perma-grid proposal-ift-modal-grid">
            {dimensions.map(({ name, question, icon: Icon }) => <li key={name} className="proposal-ivo-card proposal-ift-color"><Icon aria-hidden size={20} /><strong>{name}</strong><span>{question}</span></li>)}
          </ul>
          <ol className="proposal-perma-grid">
            <li className="proposal-ivo-card"><strong>Ler</strong><span>Cada lente tem escala própria. Vitalidade Comunitária é um domínio da FIB-T.</span></li>
            <li className="proposal-ivo-card"><strong>Agir</strong><span>A equipe pactua ação, responsável, evidência e indicador.</span></li>
            <li className="proposal-ivo-card"><strong>Comparar</strong><span>A Trajetória simula hipóteses com dados sintéticos. Para medir mudança, é preciso nova leitura comparável.</span></li>
          </ol>
          <p>Organização inclui decisões, políticas e governança. Na demonstração, o motor combina escores e pesos de pilares. Na leitura institucional, as medidas ficam ligadas às suas fontes. Registrar a execução não altera automaticamente um escore real.</p>
        </Understand>
      </div>
    </div>
  );
}

export function LensToAction({ slide = false }: { slide?: boolean }) {
  const [active, setActive] = useState("Q2");
  const uid = useId();
  const lens = lenses.find((entry) => entry.id === active) ?? lenses[1];
  const Heading = slide ? "h2" : "h3";
  return (
    <div className="proposal-ivo-block">
      <div>
        <p className="proposal-ivo-kicker"><Compass aria-hidden size={16} /> Da leitura ao plano</p>
        <Heading className={slide ? "slide-title" : "proposal-ivo-heading"}>Quatro lentes, quatro perguntas para agir</Heading>
        <p>A lente orienta a conversa. A equipe confirma a prioridade, combina uma ação e define como vai revisá-la. Explore um exemplo por lente.</p>
      </div>
      <div role="group" aria-label="Selecionar lente" className="proposal-ivo-grid proposal-no-print">
        {lenses.map(({ id, name, focus, icon: Icon }) => (
          <button type="button" key={id} className="proposal-ivo-card proposal-ift-color"
            aria-pressed={id === active} aria-controls={uid} onClick={() => setActive(id)}>
            <Icon aria-hidden size={21} />
            <strong>{id} · {name}</strong>
            <span>{focus}</span>
          </button>
        ))}
      </div>
      <div id={uid} aria-live="polite" className={"proposal-ivo-panel proposal-lens-panel proposal-no-print proposal-lens-" + lens.id.toLowerCase()}>
        <strong>{lens.id} · {lens.name} · Exemplo para pactuação</strong>
        <dl>
          <div><dt>Leitura</dt><dd>{lens.reading}</dd></div>
          <div><dt>Agir</dt><dd>{lens.action}</dd></div>
          <div><dt>Revisar e devolver</dt><dd>{lens.evidence}</dd></div>
        </dl>
      </div>
      <div className="proposal-ivo-print">
        {lenses.map(({ id, name, reading, action, evidence }) => (
          <p key={id}><strong>{id} · {name}.</strong> {reading} {action} {evidence}</p>
        ))}
      </div>
      <p className="proposal-ivo-note">Q5 reúne os registros e decisões na síntese executiva. A disponibilidade de cada fluxo segue o escopo da implantação.</p>
    </div>
  );
}

export function EconomicScenario({ slide = false }: { slide?: boolean }) {
  const [days, setDays] = useState(90);
  const [staff, setStaff] = useState(100);
  const [unitCost, setUnitCost] = useState(300);
  const estimate = calculateOutcomeScenario({ reference: 100, alternative: days, unitValue: unitCost, actionCost: 0 });
  const uid = useId();
  const Heading = slide ? "h2" : "h3";
  return (
    <div className="proposal-ivo-block">
      <div>
        <p className="proposal-ivo-kicker">Cenário econômico ilustrativo</p>
        <Heading className={slide ? "slide-title" : "proposal-ivo-heading"}>Quanto uma mudança poderia representar?</Heading>
        <p>Compare dias de ausência no mesmo período e informe o custo unitário. Todos os valores iniciais são ilustrativos.</p>
      </div>
      <div className="proposal-ivo-panel">
        <div className="proposal-perma-grid proposal-no-print">
          <label>Pessoas no grupo
            <input type="number" min={1} max={1000000} value={staff} onChange={(e) => setStaff(Math.max(1, Math.min(1000000, Number(e.target.value))))} />
          </label>
          <label>Custo por dia (R$)
            <input type="number" min={0} max={10000000} value={unitCost} onChange={(e) => setUnitCost(Math.max(0, Math.min(10000000, Number(e.target.value))))} />
          </label>
        </div>
        <label htmlFor={uid} className="proposal-no-print">Dias de ausência no cenário</label>
        <select id={uid} className="proposal-no-print" value={days} onChange={(event) => setDays(Number(event.target.value))}>
          {[80, 90, 100, 110].map((value) => <option key={value} value={value}>{value} dias</option>)}
        </select>
        <dl aria-live="polite">
          <div><dt>Referência · 100 dias</dt><dd>{money.format(100 * unitCost)}</dd></div>
          <div><dt>Cenário · {days} dias</dt><dd>{money.format(days * unitCost)}</dd></div>
          <div><dt>Variação estimada</dt><dd>{money.format(estimate?.avoidedValue ? -estimate.avoidedValue : 0)}</dd></div>
        </dl>
        <p className="proposal-ivo-note">Dias de ausência por pessoa no período: {(100 / staff).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} → {(days / staff).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}.</p>
      </div>
      <div className="proposal-ivo-links">
        <Understand label="Trajetória, custos e NR-28" title="Três leituras para três decisões" description="Escolha o que deseja explorar." variant="button">
          <div className="proposal-perma-grid">
            <article className="proposal-ivo-card proposal-ift-color"><strong>Trajetória do IVO</strong><span>Compara hipóteses de ação, intensidade e horizonte com uma base sintética. A leitura institucional continua ligada à fonte de mensuração.</span></article>
            <article className="proposal-ivo-card proposal-ift-color"><strong>Custo operacional</strong><span>Compara uma referência e uma hipótese em reais, com valores e unidades declarados.</span></article>
            <article className="proposal-ivo-card proposal-ift-color"><strong>Exposição regulatória</strong><span>Para discutir penalidades, consulte o enquadramento aplicável com SST e jurídico. Porte, tipo e gradação da infração são dados próprios da análise.</span></article>
          </div>
          <div className="proposal-ivo-links">
            <a href="/trajetoria" target="_blank" rel="noreferrer">Trajetória · requer acesso ao app</a>
            <a href="https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/norma-regulamentadora-no-28-nr-28" target="_blank" rel="noreferrer">Consultar a NR-28 no MTE</a>
          </div>
        </Understand>
        <Understand label="De onde vem esta estimativa?" title="Premissas do cenário"
          description="Compare a referência e a hipótese com o mesmo custo por dia." variant="button">
          <p>Multiplique dias pelo custo unitário em ambos os cenários e subtraia o custo da referência do custo do cenário. Um valor negativo indica custo menor na hipótese.</p>
          <p>Os valores são fictícios. Relacionar a variação a uma ação ou à evolução da vitalidade exige dados comparáveis e avaliação própria.</p>
          <a className="underline" href="/pnl" target="_blank" rel="noreferrer">Abrir o simulador de cenários da VitalOS</a>
        </Understand>
      </div>
    </div>
  );
}

export function ActionRehearsal({ slide = false }: { slide?: boolean }) {
  const [step, setStep] = useState(0);
  const Heading = slide ? "h2" : "h3";
  const steps = [
    { title: "Pactuar", body: "RH e equipe escolhem comunicação e voz. Como exemplo, a liderança testa uma cadência quinzenal de comunicação com canal de retorno. O prazo inicial serve para observar se a rotina é viável." },
    { title: "Registrar", body: "A liderança registra a publicação do primeiro resumo e anota se o canal de retorno foi comunicado." },
    { title: "Revisar", body: "No prazo pactuado, RH e equipe revisam execução, contribuições recebidas e ajustes necessários." },
    { title: "Devolver", body: "A equipe vê o que foi feito, o que ficou pendente e a data do próximo retorno." },
  ];
  return (
    <div className="proposal-ivo-block">
      <div>
        <p className="proposal-ivo-kicker">Percurso ilustrativo do Q2</p>
        <Heading className={slide ? "slide-title" : "proposal-ivo-heading"}>Como acompanhar uma ação</Heading>
        <p>Exemplo a pactuar a partir da escuta FIB-T já realizada. O primeiro recorte proposto é de 90 dias, com revisões e devolutiva.</p>
      </div>
      <div className="proposal-ivo-grid proposal-role-grid">
        <article className="proposal-ivo-card proposal-ift-color"><strong>RH · Prioridades e Plano de Ação</strong><span>Facilita a escolha, define responsáveis e prazos, acompanha a execução e prepara a devolutiva.</span></article>
        <article className="proposal-ivo-card proposal-ift-color"><strong>Liderança · Plano e execução</strong><span>Conduz as ações atribuídas, registra o que foi feito e leva obstáculos para a revisão.</span></article>
        <article className="proposal-ivo-card proposal-ift-color"><strong>Equipe · Devolutiva da Onda</strong><span>Acompanha o retorno coletivo. Missões e Embaixadorias são opções de engajamento conforme o perfil e o ambiente.</span></article>
      </div>
      <div className="proposal-ivo-links">
        <a href="https://pesquisadefelicidade.com.br/isg/apresentacao" target="_blank" rel="noreferrer">Abrir devolutiva FIB-T da ISG</a>
        <Understand label="Acesso ao dashboard institucional" title="Como abrir as telas reais" description="Use uma conta autorizada na organização." variant="button">
          <p>A senha da proposta abre apenas a apresentação. O aplicativo exige uma sessão própria. Para mostrar os resultados da ISG no Q2, a leitura precisa estar publicada e vinculada à organização.</p>
          <div className="proposal-ivo-links">
            <a href="/ivo-integral/q2" target="_blank" rel="noreferrer">Abrir Q2 com sessão institucional</a>
            <a href="/ivo-integral/acoes" target="_blank" rel="noreferrer">Abrir Agir com sessão institucional</a>
          </div>
        </Understand>
      </div>
      <div className="proposal-ivo-grid proposal-no-print" role="group" aria-label="Etapas da ação">
        {steps.map(({ title }, index) => <button type="button" key={title} className="proposal-ivo-card"
          aria-pressed={step === index} onClick={() => setStep(index)}><strong>{title}</strong></button>)}
      </div>
      <div className="proposal-ivo-panel proposal-no-print" aria-live="polite">
        <strong>{steps[step].title}</strong>
        <p>{steps[step].body}</p>
      </div>
      <ol className="proposal-ivo-print">
        {steps.map(({ title, body }) => <li key={title}><strong>{title}.</strong> {body}</li>)}
      </ol>
      <p className="proposal-ivo-note">Um registro de execução mostra o que foi feito. Para avaliar mudança, combine antes o indicador e a próxima leitura comparável.</p>
    </div>
  );
}

const evidenceGroups = [
  { name: "Saúde e presença", cards: [
    ["−78%", "Absenteísmo", "Diferença mediana entre unidades nos quartis superior e inferior de engajamento."],
    ["−63%", "Incidentes de segurança", "Mesma comparação entre unidades de trabalho."],
    ["Burnout", "Tema para acompanhar", "Investigar condições de trabalho, demandas e recursos com medidas próprias."],
  ] },
  { name: "Desempenho e retenção", cards: [
    ["+18%", "Produtividade medida por vendas", "Diferença mediana entre quartis de engajamento."],
    ["−51%", "Rotatividade", "Comparação em organizações de baixa rotatividade, conforme a classificação do estudo."],
  ] },
  { name: "Adaptação e inovação", cards: [
    ["Adaptabilidade", "Pergunta para a gestão", "Como as equipes experimentam, aprendem e ajustam a forma de trabalhar?"],
    ["Inovação", "Pergunta para a gestão", "Como as equipes transformam sugestões e aprendizados em melhorias?"],
  ] },
];
const evidenceSource = "https://www.gallup.com/workplace/321725/gallup-q12-meta-analysis.aspx";

export function EvidencePanels({ slide = false }: { slide?: boolean }) {
  const [active, setActive] = useState(0);
  const Heading = slide ? "h2" : "h3";
  const uid = useId();
  const group = evidenceGroups[active];
  return (
    <div className="proposal-ivo-block">
      <div>
        <p className="proposal-ivo-kicker">Referências para decidir</p>
        <Heading className={slide ? "slide-title" : "proposal-ivo-heading"}>Por que vale agir e o que acompanhar</Heading>
        <p>A OMS e a OIT estimam que a depressão e a ansiedade estejam associadas a 12 bilhões de dias de trabalho perdidos por ano e a cerca de US$ 1 trilhão em perdas de produtividade no mundo.</p>
        <a className="underline" href="https://www.who.int/europe/news/item/28-09-2022-who-and-ilo-call-for-new-measures-to-tackle-mental-health-issues-at-work">Fonte: OMS e OIT</a>
      </div>
      <div className="proposal-ivo-grid proposal-no-print" role="group" aria-label="Temas de evidência">
        {evidenceGroups.map(({ name }, i) => <button key={name} type="button" className="proposal-ivo-card"
          aria-pressed={active === i} aria-controls={uid} onClick={() => setActive(i)}><strong>{name}</strong></button>)}
      </div>
      <div id={uid} className="proposal-ivo-grid proposal-no-print" aria-live="polite">
        {group.cards.map(([value, label, detail]) => <div key={value} className="proposal-ivo-card"><strong>{value}</strong><span>{label}</span><span>{detail}</span></div>)}
      </div>
      <div className="proposal-ivo-print">
        {evidenceGroups.map(({ name, cards }) => <div key={name}><strong>{name}</strong>{cards.map(([value, label, detail]) => <p key={value}>{value} · {label}. {detail}</p>)}</div>)}
      </div>
      <p className="proposal-ivo-note">As diferenças do Gallup são associações agregadas ao engajamento de unidades. Servem como contexto externo para a conversa.</p>
      <a className="underline" href={evidenceSource}>Fonte: meta-análise Gallup, 2024</a>
    </div>
  );
}

export function BrasiliaContinuation({ slide = false }: { slide?: boolean }) {
  const Heading = slide ? "h2" : "h3";
  return (
    <div className="proposal-ivo-block">
      <div>
        <p className="proposal-ivo-kicker">Cooperação institucional</p>
        <Heading className={slide ? "slide-title" : "proposal-ivo-heading"}>O próximo passo para Brasília</Heading>
        <p>Da pesquisa FIB apoiada pela ISG à possibilidade de levar educação para o bem-estar à população, com tecnologia acessível.</p>
      </div>
      <ol className="proposal-ivo-grid">
        <li className="proposal-ivo-card"><strong>Pesquisa</strong><span>Apoio histórico da ISG à pesquisa FIB de Brasília em 2025.</span></li>
        <li className="proposal-ivo-card"><strong>Devolutiva</strong><span>Conhecimento reunido e compartilhado pelo Instituto.</span></li>
        <li className="proposal-ivo-card"><strong>Próxima fase</strong><span>Oportunidade para desenhar educação, acesso e cooperação técnica.</span></li>
      </ol>
      <div>
        <Understand label="Onde podemos cooperar?" title="Possibilidades de cooperação"
          description="Uma conversa própria sobre a fase educativa de Brasília." variant="button">
          <ul className="list-disc space-y-2 pl-5">
            <li>Formação em Ciência da Felicidade para preparar multiplicadores.</li>
            <li>Bem-Estar Educacional para Jovens e Game da Felicidade para explorar experiências educativas. O Game segue em desenvolvimento.</li>
            <li>Playbook de Bem-Estar no Trabalho para apoiar oficinas com organizações.</li>
          </ul>
          <p>A ISG pode avaliar apoio em acessibilidade, revisão técnica ou implantação. O acesso gratuito é uma intenção do Instituto. Solução, público, custeio, operação e reconhecimento da participação futura serão definidos com as partes.</p>
        </Understand>
      </div>
    </div>
  );
}

const permaPractice = [
  ["P", "Emoções positivas", "Reconhecer o que ajudou a ter um bom dia de trabalho."],
  ["E", "Engajamento e flow", "Combinar um desafio possível, tempo de foco e retorno sobre o progresso."],
  ["R", "Relações positivas", "Praticar apoio entre colegas e reconhecer contribuições específicas."],
  ["M", "Sentido", "Conectar uma tarefa a quem se beneficia dela."],
  ["A", "Realizações", "Definir um marco alcançável e tornar o progresso visível."],
  ["V", "Vitalidade", "Discutir pausas, recuperação e condições para sustentá-las."],
] as const;

export const proposalLensCodes = ["Q1", "Q2", "Q3", "Q4"] as const;

export function InstrumentSlide({ code, slide = false }: { code: typeof proposalLensCodes[number]; slide?: boolean }) {
  const lens = lenses.find((entry) => entry.id === code)!;
  const Heading = slide ? "h2" : "h3";
  const meanings: Record<typeof code, string> = {
    Q1: "Copenhagen Psychosocial Questionnaire. Ajuda a investigar demandas, autonomia e apoio no trabalho, em diálogo com RH e SST.",
    Q2: "Felicidade Interna Bruta no Trabalho. Organiza a escuta coletiva em fatores e domínios. A devolutiva da ISG é o ponto de partida desta proposta.",
    Q3: "O PERMA descreve cinco dimensões do florescimento. A vitalidade amplia a conversa sobre energia e recuperação.",
    Q4: "A lente explora forças de caráter percebidas no trabalho para apoiar a reflexão individual e a prática voluntária.",
  };
  const Icon = lens.icon;
  return (
    <div className={"proposal-ivo-block proposal-instrument proposal-lens-" + code.toLowerCase()}>
      <p className="proposal-ivo-kicker"><Icon aria-hidden size={20} /> Lente {code}</p>
      <Heading className={slide ? "slide-title" : "proposal-ivo-heading"}>{lens.name} · {lens.focus}</Heading>
      <p>{meanings[code]}</p>
      {code === "Q3" ? <>
        <ul className="proposal-perma-grid">
          {permaPractice.map(([letter, name, practice]) => (
            <li className="proposal-ivo-card proposal-ift-color" key={letter}>
              <strong className="proposal-letter">{letter}</strong>
              <strong>{name}</strong><span>{practice}</span>
            </li>
          ))}
        </ul>
        <a className="underline" href="https://ppc.sas.upenn.edu/learn-more/perma-theory-well-being-and-perma-workshops">Fonte dos cinco elementos do PERMA · Universidade da Pensilvânia</a>
      </> : code === "Q4" ? <>
        <ul className="proposal-perma-grid">
          {["Curiosidade", "Coragem", "Gentileza", "Trabalho em equipe", "Autorregulação", "Gratidão"].map((strength) => (
            <li className="proposal-ivo-card proposal-ift-color" key={strength}><HeartHandshake aria-hidden size={18} /><strong>{strength}</strong></li>
          ))}
        </ul>
        <p>Exemplo: experimentar a curiosidade usando perguntas abertas numa reunião de revisão e refletir sobre a experiência.</p>
        <div><Understand label="Ver as 24 forças de caráter" title="As 24 forças de caráter" description="Classificação de referência do VIA Institute. A leitura do VIA-T é exploratória." variant="button">
          <ul className="proposal-perma-grid">
            {[
              ["Sabedoria", "Criatividade, curiosidade, julgamento, amor ao aprendizado, perspectiva"],
              ["Coragem", "Bravura, perseverança, honestidade, entusiasmo"],
              ["Humanidade", "Amor, gentileza, inteligência social"],
              ["Justiça", "Trabalho em equipe, imparcialidade, liderança"],
              ["Temperança", "Perdão, humildade, prudência, autorregulação"],
              ["Transcendência", "Apreciação da beleza e da excelência, gratidão, esperança, humor, espiritualidade"],
            ].map(([name, list]) => <li className="proposal-ivo-card proposal-ift-color" key={name}><strong>{name}</strong><span>{list}</span></li>)}
          </ul>
          <a className="underline" href="https://www.viacharacter.org/character-strengths" target="_blank" rel="noreferrer">Fonte: VIA Institute</a>
        </Understand></div>
      </> : <dl className="proposal-ivo-panel proposal-method-cards">
        <div><dt>O que investigar</dt><dd>{lens.reading}</dd></div>
        <div><dt>Como usar no Agir</dt><dd>{lens.action}</dd></div>
        <div><dt>O que acompanhar</dt><dd>{lens.evidence}</dd></div>
      </dl>}
    </div>
  );
}

export function InstituteTrajectory({ slide = false }: { slide?: boolean }) {
  const Heading = slide ? "h2" : "h3";
  return (
    <div className={slide ? "proposal-ivo-block proposal-institute-slide" : "proposal-ivo-block"}>
      <p className="proposal-ivo-kicker">Instituto Felicidade para Todos</p>
      <Heading className={slide ? "slide-title" : "proposal-ivo-heading"}>Da pesquisa em Brasília a novas formas de aprender</Heading>
      <ol className="proposal-perma-grid">
        <li className="proposal-ivo-card proposal-ift-color"><strong>Pesquisa FIB de Brasília</strong><span>Escuta sobre bem-estar no território, com apoio da ISG.</span></li>
        <li className="proposal-ivo-card proposal-ift-color"><strong>Transforma-DF</strong><span>Lançamento do primeiro Relatório FIB de Brasília, conforme registro do Instituto.</span></li>
        <li className="proposal-ivo-card proposal-ift-color"><strong>Conferência de Felicidade de Brasília</strong><span>A trajetória institucional registra a conferência como espaço de diálogo público.</span></li>
      </ol>
      <ul className="proposal-ivo-grid proposal-projects">
        {[
          [formationPhoto, "Formação em Ciência da Felicidade", "Formação aplicada em bem-estar."],
          [youthPhoto, "Bem-Estar Educacional para Jovens", "Atividades educativas para o cotidiano."],
          [schoolPhoto, "Game da Felicidade", "Jornada escolar por perfil, em desenvolvimento."],
          [preventionPhoto, "NR-1 e bem-estar no trabalho", "Playbook e educação para RH, liderança e SST."],
        ].map(([image, title, body]) => <li key={title} className="proposal-ivo-card proposal-project-card">
          <img src={image} alt="" loading="lazy" decoding="async" />
          <div><strong>{title}</strong><p>{body}</p></div>
        </li>)}
      </ul>
      <p className="proposal-ivo-note">Imagens ilustrativas. Fontes institucionais: atuação do IFT em 2025–2026 e material da parceria IFT e ISG.</p>
    </div>
  );
}
