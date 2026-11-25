import formationPhoto from "@/assets/presentation/v4-compreender.jpg";
import youthPhoto from "@/assets/educational-innovations-hollywood-learning.jpg";
import schoolPhoto from "@/assets/methodology-human-innovation-cycle.jpg";
import preventionPhoto from "@/assets/nr1-hero-people.jpg";
import { useId, useState } from "react";
import reportCover from "@/assets/relatorio-global-esg-cover-3d.jpg";
import { Activity, Building2, Check, Compass, Globe2, HeartHandshake, Layers3, Lightbulb, ShieldCheck, Sparkles, TrendingUp, UserRound, UsersRound } from "lucide-react";
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
  const [unitCost, setUnitCost] = useState(180);
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

const demoFlow = [
  { title: "Leitura coletiva", screen: "Leitura Q2 da organização", who: "RH e liderança", body: "Fatores da FIB-T e escore bruto, como publicados, sempre em grupos com pelo menos 5 respostas." },
  { title: "Prioridade", screen: "Prioridades do ciclo", who: "RH, com a liderança", body: "A equipe escolhe um tema da leitura para trabalhar primeiro." },
  { title: "Ação", screen: "Plano de Ação", who: "Liderança", body: "Uma ação concreta e pequena, descrita em linguagem simples." },
  { title: "Responsável", screen: "Responsável, prazo e indicador", who: "RH define; liderança assume", body: "Quem conduz, até quando e como a equipe vai perceber o avanço." },
  { title: "Evidência", screen: "Evidência de execução", who: "Liderança registra", body: "O que foi feito fica registrado. Evidência mostra que a ação aconteceu, não que o indicador melhorou." },
  { title: "Reavaliação", screen: "Devolutiva da Onda", who: "RH, liderança e equipe", body: "A equipe vê o que foi feito e o que ficou pendente; a mudança só se avalia com nova leitura comparável." },
];

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
      <div className="proposal-ivo-links proposal-no-print">
        <Understand label="Ver demonstração" title="Da leitura coletiva à reavaliação" variant="primary"
          description="A sequência de uma ação, com o que RH, liderança e equipe fazem em cada ponto. Exemplo demonstrativo, com dados fictícios.">
          <ol className="proposal-demo-flow">
            {demoFlow.map(({ title, screen, who, body }, i) => (
              <li key={title} className="proposal-demo-step">
                <span aria-hidden className="proposal-demo-num">{i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <span className="proposal-demo-screen">{screen}</span>
                  <p>{body}</p>
                  <p className="proposal-demo-who"><em>Quem:</em> {who}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="proposal-demo-mock" role="img" aria-label="Exemplo sintético de duas telas do dashboard: leitura coletiva e ações do ciclo">
            <div>
              <strong>Leitura coletiva · exemplo</strong>
              {[["Apoio da liderança", 72], ["Clareza de papéis", 58], ["Recuperação", 46], ["Reconhecimento", 64]].map(([n, v]) => (
                <span key={n as string} className="proposal-demo-bar"><em>{n}</em><i style={{ width: v + "%" }} /><b>{v}</b></span>
              ))}
            </div>
            <div>
              <strong>Ações do ciclo · exemplo</strong>
              {[["Passagem de turno", "Em andamento"], ["Pausas entre reuniões", "Planejada"], ["Devolutiva às equipes", "Concluída"]].map(([n, s]) => (
                <span key={n} className="proposal-demo-row"><em>{n}</em><b>{s}</b></span>
              ))}
            </div>
          </div>
          <p>Exemplo sintético: valores e ações fictícios, identificados como tal; não representam resultados da ISG.</p>
          <p className="text-sm">Fonte: telas "Leitura Q2 da organização" e "Ações do ciclo a partir da FIB-T" do dashboard VitalOS.</p>
        </Understand>
        <Understand label="Entrar com conta autorizada" title="Abrir as telas do dashboard" variant="secondary"
          description="Para quem tem conta autorizada na organização.">
          <p>A senha da proposta abre a apresentação. O dashboard tem acesso próprio: peça ao Instituto uma conta autorizada para a organização e entre com ela. Depois do acesso, o retorno leva à tela escolhida.</p>
          <p>Pré-requisitos: conta autorizada, organização vinculada e leitura publicada. Sem eles, a tela informa o motivo e não mostra dados.</p>
          <div className="proposal-ivo-links">
            <a href="/ivo-integral/q2" target="_blank" rel="noreferrer">Leitura Q2 da organização</a>
            <a href="/ivo-integral/acoes" target="_blank" rel="noreferrer">Ações do ciclo a partir da FIB-T</a>
          </div>
        </Understand>
      </div>
      <p className="proposal-ivo-note proposal-ivo-print">Devolutiva FIB-T da ISG: material de acesso restrito, apresentado pelo Instituto à organização.</p>
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
  { name: "Saúde e presença", tone: "saude", icon: Activity, cards: [
    ["−78%", "Absenteísmo", "Diferença mediana entre unidades nos quartis superior e inferior de engajamento."],
    ["−63%", "Incidentes de segurança", "Mesma comparação entre unidades de trabalho."],
    ["Burnout", "Tema para acompanhar", "Investigar condições de trabalho, demandas e recursos com medidas próprias."],
  ] },
  { name: "Desempenho e retenção", tone: "desempenho", icon: TrendingUp, cards: [
    ["+18%", "Produtividade medida por vendas", "Diferença mediana entre quartis de engajamento."],
    ["−51%", "Rotatividade", "Comparação em organizações de baixa rotatividade, conforme a classificação do estudo."],
  ] },
  { name: "Adaptação e inovação", tone: "inovacao", icon: Lightbulb, cards: [
    ["Adaptabilidade", "Pergunta para a gestão", "Como as equipes experimentam, aprendem e ajustam a forma de trabalhar?"],
    ["Inovação", "Pergunta para a gestão", "Como as equipes transformam sugestões e aprendizados em melhorias?"],
  ] },
];
const evidenceSource = "https://www.gallup.com/workplace/321725/gallup-q12-meta-analysis.aspx";

/** Barras proporcionais à diferença declarada (ex.: −78%). Ilustração de proporção, não de medição da ISG. */
function RatioBars({ value }: { value: string }) {
  const m = /^([−+])(\d+)%$/.exec(value);
  if (!m) return null;
  const n = Number(m[2]);
  // Quartil inferior = referência (100); o superior difere em n%.
  const lowLen = 100, topLen = m[1] === "+" ? 100 + n : 100 - n;
  const scale = Math.max(lowLen, topLen);
  return (
    <span className="proposal-ratio" aria-hidden>
      <span className="proposal-ratio-row"><i style={{ width: (lowLen / scale) * 100 + "%" }} />Quartil inferior</span>
      <span className="proposal-ratio-row is-top"><i style={{ width: (topLen / scale) * 100 + "%" }} />Quartil superior</span>
    </span>
  );
}

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
        <p className="proposal-evidence-intro">Dois números globais ajudam a dimensionar o tema. Depois, três grupos de decisões de gestão para acompanhar.</p>
      </div>
      <div className="proposal-who-numbers" role="group" aria-label="Estimativa da OMS e da OIT">
        <div className="proposal-who-card">
          <Globe2 aria-hidden size={22} />
          <strong className="proposal-who-value">12 bilhões</strong>
          <span>de dias de trabalho perdidos por ano, associados à depressão e à ansiedade no mundo.</span>
          <span className="proposal-picto" role="img" aria-label="Doze blocos; cada bloco representa 1 bilhão de dias">
            {Array.from({ length: 12 }, (_, i) => <i key={i} />)}
          </span>
          <span className="proposal-picto-key">Cada bloco = 1 bilhão de dias</span>
        </div>
        <div className="proposal-who-card">
          <TrendingUp aria-hidden size={22} />
          <strong className="proposal-who-value">US$ 1 trilhão</strong>
          <span>em perdas de produtividade por ano, estimadas para o mesmo conjunto.</span>
        </div>
      </div>
      <p className="proposal-ivo-note">Estimativa global da OMS e da OIT, de alcance mundial; não é um dado da ISG. <a className="underline" href="https://www.who.int/europe/news/item/28-09-2022-who-and-ilo-call-for-new-measures-to-tackle-mental-health-issues-at-work" target="_blank" rel="noreferrer">Fonte: OMS e OIT</a></p>
      <div className="proposal-ivo-grid proposal-no-print" role="group" aria-label="Temas de decisão">
        {evidenceGroups.map(({ name, tone, icon: Icon }, i) => <button key={name} type="button" className={"proposal-ivo-card proposal-evidence-tab proposal-tone-" + tone}
          aria-pressed={active === i} aria-controls={uid} onClick={() => setActive(i)}>
          <Icon aria-hidden size={20} /><strong>{name}</strong>
          {active === i ? <span className="proposal-evidence-selected"><Check aria-hidden size={14} /> Selecionado</span> : null}
        </button>)}
      </div>
      <div id={uid} className={"proposal-ivo-grid proposal-no-print proposal-evidence-panel proposal-tone-" + group.tone} aria-live="polite">
        <p className="proposal-evidence-title"><group.icon aria-hidden size={18} /> {group.name}</p>
        {group.cards.map(([value, label, detail]) => <div key={value} className="proposal-ivo-card proposal-tone-card"><strong>{value}</strong><span>{label}</span><RatioBars value={value} /><span>{detail}</span></div>)}
      </div>
      <div className="proposal-ivo-print">
        {evidenceGroups.map(({ name, cards }) => <div key={name}><strong>{name}</strong>{cards.map(([value, label, detail]) => <p key={value}>{value} · {label}. {detail}</p>)}</div>)}
      </div>
      <p className="proposal-ivo-note">As diferenças do Gallup são associações agregadas ao engajamento de unidades. Servem como contexto externo para a conversa.</p>
      <a className="underline" href={evidenceSource}>Fonte: meta-análise Gallup, 2024</a>
    </div>
  );
}

const brasiliaMoves = [
  { id: "mensurar", name: "Mensurar novamente", icon: Activity,
    lead: "Uma segunda aplicação da pesquisa FIB em Brasília é o próximo passo proposto.",
    body: "Repetir a escuta permite comparar com a primeira leitura. O lançamento local acompanha o Dia Internacional da Felicidade, proclamado pela ONU em 20 de março. A data e o ano do lançamento em Brasília dependem de confirmação da agenda do Instituto." },
  { id: "educar", name: "Educar", icon: Lightbulb,
    lead: "Formação introdutória em Ciência da Felicidade para a população.",
    body: "Um exemplo concreto: uma oficina curta em que cada pessoa escolhe uma prática simples de bem-estar e a experimenta durante a semana. O Game da Felicidade complementa a experiência e segue em desenvolvimento." },
  { id: "transformar", name: "Transformar Brasília", icon: Compass,
    lead: "Dados e letramento orientam prioridades e a articulação de parceiros.",
    body: "Os resultados da pesquisa e o letramento em Ciência da Felicidade ajudam a escolher prioridades e a reunir parceiros para projetos no território. A ISG apoiou a pesquisa FIB de Brasília em 2025, e o Instituto reconhece esse patrocínio." },
] as const;

export function BrasiliaTransition({ slide = false }: { slide?: boolean }) {
  return (
    <div className={"proposal-brasilia-transition" + (slide ? " is-slide" : "")}>
      <p className="proposal-ivo-kicker proposal-on-mesh">Um segundo assunto, com escopo próprio</p>
      <p className={slide ? "slide-cover-title" : "proposal-transition-title"}>Mensurar, educar e transformar Brasília</p>
      <p className={slide ? "slide-lead" : "proposal-transition-lead"}>Fora da implantação do VitalOS na ISG: uma oportunidade institucional futura.</p>
      <ul className="proposal-transition-moves" aria-label="Três movimentos">
        {brasiliaMoves.map(({ id, name }) => <li key={id} className={"proposal-transition-chip proposal-tone-" + id}>{name}</li>)}
      </ul>
    </div>
  );
}

/** Silhueta vetorial estilizada do horizonte modernista de Brasília. Ilustração, não fotografia. */
function BrasiliaSkyline() {
  return (
    <svg className="proposal-skyline" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMax slice" aria-hidden focusable="false">
      <g fill="currentColor">
        <rect x="0" y="196" width="1200" height="24" />
        {/* Congresso: torres gêmeas, cúpulas e base horizontal */}
        <rect x="500" y="176" width="260" height="20" />
        <rect x="574" y="70" width="26" height="106" /><rect x="640" y="70" width="26" height="106" />
        <path d="M470 176 a62 40 0 0 1 124 0 Z" opacity="0.8" />
        <path d="M640 136 a62 40 0 0 0 124 0 Z" opacity="0.8" />
        {/* Catedral: hipérboles */}
        <path d="M900 196 L915 120 L930 100 L945 120 L960 196 L950 196 L938 128 L930 116 L922 128 L910 196 Z" />
        <path d="M884 196 L912 112 M976 196 L948 112" stroke="currentColor" strokeWidth="3" fill="none" />
        {/* Quadras e eixo */}
        <rect x="60" y="166" width="90" height="30" /><rect x="170" y="150" width="70" height="46" /><rect x="260" y="172" width="110" height="24" />
        <rect x="1010" y="158" width="80" height="38" /><rect x="1110" y="170" width="70" height="26" />
      </g>
    </svg>
  );
}

export function BrasiliaContinuation({ slide = false }: { slide?: boolean }) {
  const Heading = slide ? "h2" : "h3";
  return (
    <div className="proposal-ivo-block proposal-calm proposal-brasilia-scene">
      <BrasiliaSkyline />
      <span className="proposal-skyline-credit">Ilustração estilizada do horizonte de Brasília</span>
      <div>
        <p className="proposal-ivo-kicker">Cooperação institucional · escopo próprio</p>
        <Heading className={slide ? "slide-title" : "proposal-ivo-heading"}>O próximo passo para Brasília</Heading>
        <p>Da pesquisa FIB apoiada pela ISG a uma nova fase: medir de novo, educar e orientar projetos no território.</p>
      </div>
      <ol className="proposal-ivo-grid proposal-brasilia-moves">
        {brasiliaMoves.map(({ id, name, icon: Icon, lead, body }, i) => (
          <li key={id} className={"proposal-ivo-card proposal-brasilia-card proposal-tone-" + id}>
            <span className="proposal-brasilia-num" aria-hidden>{i + 1}</span>
            <Icon aria-hidden size={22} />
            <strong>{name}</strong>
            <span className="proposal-brasilia-lead">{lead}</span>
            <span>{body}</span>
          </li>
        ))}
      </ol>
      <div className="proposal-no-print">
        <Understand label="Como a ISG pode contribuir?" title="Como a ISG pode contribuir"
          description="Possibilidades para uma conversa própria. Não fazem parte da implantação do VitalOS." variant="button">
          <p className="proposal-short-answer"><strong>Em resumo:</strong> a ISG pode contribuir com tecnologia, e o Instituto traz o conteúdo e a articulação no território.</p>
          <h4>Exemplos de apoio</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>Desempenho: revisão técnica do tempo de carregamento e da estabilidade das soluções educativas.</li>
            <li>Acessibilidade: revisão da experiência para leitores de tela, teclado, contraste e celulares simples.</li>
            <li>Experiência de uso: percursos testados com pessoas de perfis variados.</li>
          </ul>
          <h4>Entregas possíveis</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>Parecer técnico com melhorias priorizadas.</li>
            <li>Plano de acessibilidade e desempenho para a formação e o Game da Felicidade.</li>
          </ul>
          <h4>O que dependeria de um novo acordo</h4>
          <p>Escopo, público, custeio, operação, calendário e a forma de reconhecer a participação da ISG. Esse assunto é tratado separadamente da implantação do VitalOS.</p>
          <p className="text-sm">Fonte do Dia Internacional da Felicidade: <a className="underline" href="https://mandates.un.org/mandate/A/RES/66/281" target="_blank" rel="noreferrer">ONU · A/RES/66/281</a>.</p>
        </Understand>
      </div>
      <ul className="proposal-ivo-print"><li>Como a ISG pode contribuir: apoio em desempenho, acessibilidade e experiência de uso, por meio de um novo acordo com escopo próprio.</li></ul>
    </div>
  );
}

export function Q5NextYearPlan({ slide = false }: { slide?: boolean }) {
  const Heading = slide ? "h2" : "h3";
  return (
    <div className="proposal-ivo-block proposal-q5-card">
      <div className="proposal-q5-copy">
        <p className="proposal-ivo-kicker">Q5 · Consolidar</p>
        <Heading className={slide ? "slide-title" : "proposal-ivo-heading"}>Do primeiro ciclo ao plano do próximo ano</Heading>
        <p className="proposal-short-answer">No mês 13, os registros se reúnem. No 14, a execução e os aprendizados viram uma síntese. No 15, a reunião executiva pactua o plano seguinte.</p>
        <dl className="proposal-q5-esg">
          <div><dt>Social</dt><dd>Bem-estar, condições de trabalho e participação ganham registro e devolutiva às equipes.</dd></div>
          <div><dt>Governança</dt><dd>Decisões, responsáveis, prazos e revisões ficam acompanhados pela liderança e pela direção.</dd></div>
        </dl>
        <p>O plano do próximo ano traz prioridades, responsáveis, prazos, indicadores e data de revisão. Dados ambientais entram só onde a metodologia prevê indicadores e registros.</p>
      </div>
      <figure className="proposal-q5-figure">
        <img src={reportCover} alt="Capa ilustrativa do Relatório Global ESG" loading="lazy" decoding="async" />
        <figcaption>Capa ilustrativa. O relatório mostrado é demonstrativo.</figcaption>
      </figure>
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

/** Alerta visual NR-1: sem valores de multa; o enquadramento é conferido na NR-28 com SST e jurídico. */
export function Nr1Alert() {
  return (
    <figure className="proposal-nr1alert" aria-label="NR-1: riscos psicossociais e fiscalização">
      <svg viewBox="0 0 120 140" role="img" aria-label="Escudo com balança e sinal de atenção" className="proposal-nr1alert-art">
        <path d="M60 8 L108 26 V68 C108 98 88 120 60 132 C32 120 12 98 12 68 V26 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <path d="M60 22 L96 35 V68 C96 91 81 108 60 118 C39 108 24 91 24 68 V35 Z" fill="currentColor" opacity="0.1" />
        <path d="M60 44 V92 M40 52 H80 M40 52 L30 74 H50 Z M80 52 L70 74 H90 Z M46 94 H74" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="94" cy="26" r="13" fill="var(--nr1-alert)" />
        <path d="M94 19 V28 M94 32 V33" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
      <div className="proposal-nr1alert-body">
        <p className="proposal-ivo-kicker">NR-1 · riscos psicossociais</p>
        <div className="proposal-nr1alert-cols">
          <p><strong>O que se espera.</strong> Identificar, avaliar e prevenir os riscos do trabalho, inclusive os psicossociais, com registro no PGR.</p>
          <p className="is-alert"><strong>O que está em jogo.</strong> A inspeção pode aplicar penalidades. A graduação depende do item, da gravidade e do porte (NR-28).</p>
        </div>
        <p className="proposal-nr1alert-note">Sem valores aqui de propósito: o enquadramento é conferido com SST e jurídico. Apoio educativo; não substitui o PGR.</p>
      </div>
    </figure>
  );
}

export function Nr1Enforcement() {
  return (
    <div className="proposal-no-print">
      <Understand label="Como funciona a fiscalização?" title="Como funciona a fiscalização"
        description="Resposta curta, critérios e fontes oficiais." variant="button">
        <p className="proposal-short-answer"><strong>Em resumo:</strong> a inspeção do trabalho verifica se a organização identifica, avalia e previne os riscos do trabalho, inclusive os psicossociais. A NR-1 não prescreve um questionário específico; o que importa é o processo de gestão e as evidências dele.</p>
        <h4>Como a gestão se organiza</h4>
        <ul className="list-disc space-y-1 pl-5">
          <li>Os fatores psicossociais entram na identificação de perigos e na avaliação de riscos do GRO, com registro no PGR.</li>
          <li>Instrumentos como o COPSOQ são uma forma de estruturar a escuta. Os resultados são analisados com RH e SST, junto de outras evidências das condições de trabalho.</li>
          <li>Quando há atuação da inspeção, ela considera os itens verificados e as circunstâncias de cada caso.</li>
        </ul>
        <h4>Como a penalidade é graduada</h4>
        <p>Pela NR-28, a penalidade depende do item infringido, da gravidade atribuída a ele e do número de empregados da organização. Um exemplo com item, código, graduação, faixa de empregados e vigência fica pendente de validação com a fonte oficial vigente, e não é apresentado aqui.</p>
        <p>Esta proposta não projeta penalidade para a ISG e não trata a ausência de um questionário como infração.</p>
        <p className="text-sm">Fontes oficiais: <a className="underline" href="https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/nr-1" target="_blank" rel="noreferrer">NR-1</a> · <a className="underline" href="https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/norma-regulamentadora-no-28-nr-28" target="_blank" rel="noreferrer">NR-28</a></p>
        <p className="text-sm">Apoio educativo à gestão de riscos psicossociais. Não substitui o PGR nem o profissional habilitado.</p>
      </Understand>
    </div>
  );
}

export function FibBackground() {
  return (
    <div className="proposal-fib-note">
      <p><strong>De onde vem o FIB.</strong> A Felicidade Interna Bruta é uma abordagem de desenvolvimento associada ao Butão. A ONU reconhece a felicidade como objetivo humano: em 2012, a Assembleia Geral proclamou 20 de março como Dia Internacional da Felicidade. O PNUD e o Centro de FIB do Butão mantêm um acordo de cooperação.</p>
      <p><strong>Na ISG.</strong> A FIB-T leva essa abordagem ao trabalho. Tem escopo e fonte próprios e não se confunde com as pesquisas de território do Instituto.</p>
      <p className="proposal-fib-sources">Fontes: <a className="underline" href="https://mandates.un.org/mandate/A/RES/66/281" target="_blank" rel="noreferrer">ONU · A/RES/66/281</a> · <a className="underline" href="https://www.undp.org/bhutan/news/gross-national-happiness-centre-bhutan-and-undp-sign-partnership-agreement" target="_blank" rel="noreferrer">PNUD e Centro de FIB do Butão</a></p>
    </div>
  );
}

export const proposalLensCodes = ["Q1", "Q2", "Q3", "Q4"] as const;

export function InstrumentSlide({ code, slide = false }: { code: typeof proposalLensCodes[number]; slide?: boolean }) {
  const lens = lenses.find((entry) => entry.id === code)!;
  const Heading = slide ? "h2" : "h3";
  const meanings: Record<typeof code, string> = {
    Q1: "O Copenhagen Psychosocial Questionnaire (COPSOQ) ajuda a investigar fatores de risco psicossociais relacionados ao trabalho, como demandas, autonomia e apoio. Seus resultados subsidiam a gestão de riscos no contexto do GRO/PGR, com RH e SST. A NR-1 não prescreve o COPSOQ como instrumento obrigatório. A coleta é a etapa seguinte da implantação.",
    Q2: "A FIB-T adapta ao trabalho a abordagem da Felicidade Interna Bruta. Organiza a escuta coletiva em fatores e domínios, com fonte e escopo próprios. A devolutiva da ISG é o ponto de partida desta proposta.",
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
      </> : <>
        <dl className="proposal-ivo-panel proposal-method-cards">
          <div><dt>O que investigar</dt><dd>{lens.reading}</dd></div>
          <div><dt>Como usar no Agir</dt><dd>{lens.action}</dd></div>
          <div><dt>O que acompanhar</dt><dd>{lens.evidence}</dd></div>
        </dl>
        {code === "Q1" ? <><Nr1Alert /><Nr1Enforcement /></> : <FibBackground />}
      </>}
    </div>
  );
}

export function InstituteTrajectory({ slide = false }: { slide?: boolean }) {
  const Heading = slide ? "h2" : "h3";
  return (
    <div className={slide ? "proposal-ivo-block proposal-institute-slide" : "proposal-ivo-block"}>
      <p className="proposal-ivo-kicker">Instituto Felicidade para Todos</p>
      <Heading className={slide ? "slide-title" : "proposal-ivo-heading"}>Da pesquisa em Brasília a novas formas de aprender</Heading>
      <div className="proposal-bento">
      <article className="proposal-bento-hero">
        <span className="proposal-bento-tag">Destaque</span>
        <strong>Pesquisa FIB de Brasília</strong>
        <span>Escuta sobre bem-estar no território, com apoio da ISG.</span>
      </article>
      <ol className="proposal-bento-side" data-reveal-group>
        <li><strong>Transforma-DF</strong><span>Lançamento do primeiro Relatório FIB de Brasília, conforme registro do Instituto.</span></li>
        <li><strong>Conferência de Felicidade de Brasília</strong><span>A trajetória institucional registra a conferência como espaço de diálogo público.</span></li>
      </ol>
      <ul className="proposal-ivo-grid proposal-projects" data-reveal-group>
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
      </div>
      <p className="proposal-ivo-note">Imagens ilustrativas. Fontes institucionais: atuação do IFT em 2025–2026 e material do Instituto e da ISG.</p>
    </div>
  );
}
