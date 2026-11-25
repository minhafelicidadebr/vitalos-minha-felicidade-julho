// Modo apresentação: slides horizontais derivados do MESMO conteúdo da página (paridade:
// nenhum texto nasce aqui). Camada 1 no slide; camada 2 nas janelas "Entenda", abertas por cima
// do slide (também em tela cheia). Teclado: ← → PageUp PageDown Espaço Home End, G capítulos,
// F tela cheia, Esc sai (ou fecha a janela aberta). Em tela estreita ou em pé, empilha na vertical.
import { useMemo } from "react";
import { CheckCircle2, CircleDashed, Flag, ShieldAlert } from "lucide-react";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import { CONTINUITY_IMAGE, BAND_IMAGES, HERO_IMAGE, TEAM_PHOTOS } from "./media";
import { ActionRehearsal, BrasiliaContinuation, BrasiliaTransition, Q5NextYearPlan, EconomicScenario, EvidencePanels, IvoOverview, LensToAction, InstituteTrajectory, InstrumentSlide, proposalLensCodes } from "./ProposalContinuity";
import { MetricValue } from "./ProposalSections";
import {
  IftBadge,
  InstitutoMark,
  PriceDetail,
  StageDetail,
  StatusMark,
  Understand,
  ValueBridge,
} from "./ProposalV3";
import { IsgInfographic } from "./IsgInfographic";
import { IFT_ICON, IFT_ORDER, brl } from "./proposal-shared";
import type { ProposalContent } from "./types";
import { SlideDeck, type DeckSlide } from "./SlideDeck";
import "./proposal.css";

type Slide = DeckSlide;

const Title = ({ children }: { children: React.ReactNode }) => (
  <h2 className="slide-title">{children}</h2>
);

function buildSlides(p: ProposalContent): Slide[] {
  const inv = p.investment;
  const parcel = inv.total / inv.installments;
  const stages = p.journey.stages;
  const caption = p.hero.imageCaption;
  const slides: Slide[] = [];
  const add = (s: Slide) => slides.push(s);

  // ── Abertura ──
  add({
    id: "capa",
    chapter: "Abertura",
    title: p.cover.brandLine,
    dark: true,
    image: HERO_IMAGE,
    body: (
      <div className="flex h-full flex-col justify-end gap-[0.9em]">
        <VitalOSBrand
          variant="horizontal"
          surface="dark"
          decorative={false}
          alt="VitalOS"
          className="slide-cover-logo"
        />
        <h2 className="slide-cover-title">{p.cover.brandLine}</h2>
        <p className="slide-lead max-w-[54ch]">{p.cover.valueLine}</p>
        <ul className="flex flex-wrap gap-[0.5em]">
          {p.cover.chips.map((c) => (
            <li key={c.label} className="slide-chip">
              <strong>{c.label}</strong> · {c.detail}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-[0.8em]">
          <span className="slide-small">Proposta à ISG Participações</span>
          <InstitutoMark surface="dark" className="slide-institute-logo" />
          <span className="slide-caption">{caption}</span>
        </div>
      </div>
    ),
  });
  add({
    id: "isg-mapa",
    chapter: "Abertura",
    title: "O que a ISG comunica e faz",
    body: (
      <div className="grid h-full content-center gap-[0.9em]">
        <Title>“{p.opening.question}”</Title>
        <IsgInfographic map={p.why.isgMap} slide />
      </div>
    ),
  });

  // ── Por que ──
  add({
    id: "por-que",
    chapter: "Por que nós",
    title: "Por que o Instituto e a ISG",
    body: (
      <div className="grid h-full content-center gap-[1.2em]">
        <Title>Por que o Instituto e a ISG</Title>
        <ul className="grid gap-[0.8em] md:grid-cols-3">
          {p.why.parties.map((x) => (
            <li key={x.name} className="slide-card slide-brand-top">
              <h3 className="slide-h3">{x.name}</h3>
              <p className="slide-small proposal-accent-text font-semibold">{x.role}</p>
              <p className="slide-small">{x.body}</p>
            </li>
          ))}
        </ul>
        <p className="slide-lead max-w-[75ch]">{p.why.affinity.body}</p>
        <p className="slide-small">
          Fonte: {p.why.affinity.source.label} · {p.why.affinity.checked}. {p.why.window}
        </p>
      </div>
    ),
  });
  if (p.track) {
    const t = p.track;
    add({
      id: "numeros",
      chapter: "Por que nós",
      title: t.title,
      body: (
        <div className="grid h-full content-center gap-[1.2em]">
          <Title>{t.title}</Title>
          <p className="slide-lead max-w-[70ch]">{t.intro}</p>
          <ul className="grid grid-cols-2 gap-[1em] lg:grid-cols-4">
            {t.items.map((m) => (
              <li key={m.label} className="proposal-track-item border-l-4 pl-[0.8em]">
                <MetricValue metric={m} className="slide-metric" />
                <span className="slide-small block font-semibold">{m.label}</span>
                <span className="slide-small block">{m.detail}</span>
              </li>
            ))}
          </ul>
          <p className="slide-lead">{t.record}</p>
          <p className="slide-small">
            {t.source} {t.scope}
          </p>
        </div>
      ),
    });
  }
  add({
    id: "instituto", chapter: "Por que nós", title: "Da pesquisa em Brasília a novas formas de aprender",
    body: <InstituteTrajectory slide />,
  });
  add({
    id: "ciencia",
    chapter: "Por que nós",
    title: p.science.title,
    body: (
      <div className="grid h-full content-center gap-[1em]">
        <Title>{p.science.title}</Title>
        {p.science.playbook ? (
          <div className="proposal-playbook flex flex-wrap items-center gap-[1.2em] rounded-[0.9em] p-[1em]">
            <p className="slide-metric proposal-on-dark-accent">
              +{p.science.playbook.studies.toLocaleString("pt-BR")}
            </p>
            <div className="min-w-0 flex-1">
              <p className="slide-lead">{p.science.playbook.statement}</p>
              <p className="slide-small">
                {p.science.playbook.edition} · {p.science.playbook.attribution}
              </p>
            </div>
          </div>
        ) : null}
        <ul className="grid gap-[0.6em] md:grid-cols-5">
          {p.science.anchors.map((a) => (
            <li key={a.id} className="slide-card">
              <h3 className="slide-h3">{a.name}</h3>
              <p className="slide-small">{a.inProposal}</p>
              <p className="slide-small proposal-accent-text font-semibold">{a.statusLabel}</p>
            </li>
          ))}
        </ul>
        <p className="slide-small">{p.science.principle}</p>
      </div>
    ),
  });
  add({
    id: "contexto",
    chapter: "Por que nós",
    title: "O que a literatura e um caso mostram",
    body: (
      <div className="grid h-full content-center gap-[1.2em] lg:grid-cols-2">
        <div className="space-y-[0.8em]">
          <Title>{p.literature?.title ?? "O que a literatura mostra"}</Title>
          {p.literature ? (
            <>
              <ul className="grid gap-[0.8em] sm:grid-cols-2">
                {p.literature.items.map((m) => (
                  <li key={m.label} className="slide-card">
                    <MetricValue metric={m} className="slide-metric proposal-accent-text" />
                    <p className="slide-small font-semibold">{m.label}</p>
                    <p className="slide-small">{m.detail}</p>
                  </li>
                ))}
              </ul>
              <p className="slide-small">{p.literature.note}</p>
            </>
          ) : null}
        </div>
        <div className="slide-card space-y-[0.5em]">
          <p className="slide-kicker">Caso externo</p>
          <h3 className="slide-h3">{p.externalCase.title}</h3>
          <p className="slide-small">{p.externalCase.summary}</p>
          <ul className="space-y-[0.3em]">
            {p.externalCase.practices.map((x) => (
              <li key={x.label} className="slide-small">
                <strong>{x.label}.</strong> {x.body}
              </li>
            ))}
          </ul>
          <p className="slide-small">{p.externalCase.note}</p>
        </div>
      </div>
    ),
  });


  add({
    id: "evidencias", chapter: "Por que nós", title: "Por que vale agir e o que acompanhar",
    body: <EvidencePanels slide />,
  });

  // ── Como funciona ──
  add({
    id: "cap-como",
    chapter: "Como funciona",
    title: "Como funciona",
    dark: true,
    divider: true,
    image: CONTINUITY_IMAGE,
    body: (
      <div className="flex h-full flex-col justify-end gap-[0.6em]">
        <p className="slide-kicker">Capítulo</p>
        <h2 className="slide-cover-title">Como funciona</h2>
        <p className="slide-lead max-w-[52ch]">
          Da escuta FIB-T às escolhas que a equipe consegue acompanhar.
        </p>
        <span className="slide-caption">{caption}</span>
      </div>
    ),
  });
  add({
    id: "matriz-ift",
    chapter: "Como funciona",
    title: p.ift.title,
    body: (
      <div className="grid h-full content-center gap-[1.2em]">
        <Title>{p.ift.title}</Title>
        <p className="slide-lead max-w-[70ch]">{p.ift.intro}</p>
        <ol className="grid gap-[0.8em] md:grid-cols-4">
          {p.ift.movements.map((m, i) => {
            const Icon = IFT_ICON[m.id];
            return (
              <li key={m.id} className={`slide-card proposal-ift-move proposal-ift-${m.id}`}>
                <span aria-hidden className="proposal-ift-icon slide-icon">
                  <Icon />
                </span>
                <p className="slide-small">{i + 1}</p>
                <h3 className="slide-h3">{m.name}</h3>
                <p className="slide-small">{m.description}</p>
              </li>
            );
          })}
        </ol>
        <p className="slide-small flex gap-[0.4em]">
          <ShieldAlert aria-hidden className="slide-inline-icon" />
          {p.ift.domainNote}
        </p>
      </div>
    ),
  });
  add({
    id: "ivo", chapter: "Como funciona", title: "Como o IVO lê a vitalidade",
    body: <IvoOverview slide />,
  });
  add({
    id: "cenario-economico", chapter: "Como funciona", title: "Quanto uma mudança poderia representar?",
    body: <EconomicScenario slide />,
  });
  add({
    id: "lentes", chapter: "Como funciona", title: "Quatro lentes, quatro perguntas para agir",
    body: <LensToAction slide />,
  });
  proposalLensCodes.forEach((code) => add({
    id: "instrumento-" + code.toLowerCase(), chapter: "Como funciona", title: code + " · Ferramenta e prática",
    body: <InstrumentSlide code={code} slide />,
  }));
  add({
    id: "exemplo", chapter: "Como funciona", title: "Como acompanhar uma ação",
    body: <ActionRehearsal slide />,
  });


  // ── Jornada ──
  add({
    id: "cap-jornada",
    chapter: "Jornada",
    title: "A jornada",
    dark: true,
    divider: true,
    image: BAND_IMAGES.agir,
    body: (
      <div className="flex h-full flex-col justify-end gap-[0.6em]">
        <p className="slide-kicker">Capítulo</p>
        <h2 className="slide-cover-title">A jornada</h2>
        <p className="slide-lead max-w-[52ch]">
          Cinco etapas de três meses, cinco lentes, um marco de aceite em cada uma.
        </p>
        <span className="slide-caption">{caption}</span>
      </div>
    ),
  });
  add({
    id: "jornada",
    chapter: "Jornada",
    title: "Cinco etapas, cinco lentes",
    body: (
      <div className="grid h-full content-center gap-[1em]">
        <Title>Cinco etapas, cinco lentes</Title>
        <ol className="grid gap-[0.6em] md:grid-cols-5">
          {stages.map((s) => (
            <li key={s.id} className={`slide-card proposal-schedule-stage proposal-stage-${s.id}`}>
              <p className="slide-num">{s.code}</p>
              <h3 className="slide-h3">
                {s.verb} · {s.framework.lens}
              </h3>
              <p className="slide-small italic">“{s.framework.question}”</p>
              <p className="slide-small">{s.deliverable}</p>
            </li>
          ))}
        </ol>
        <p className="slide-small flex gap-[0.4em]">
          <CircleDashed aria-hidden className="slide-inline-icon" />
          {p.journey.sharedCondition}
        </p>
      </div>
    ),
  });
  for (const s of stages) {
    if (s.id === "q5")
      add({
        id: "q5-plano",
        chapter: "Jornada",
        title: "Do primeiro ciclo ao plano do próximo ano",
        body: <Q5NextYearPlan slide />,
      });
    const f = s.framework;
    add({
      id: `etapa-${s.id}`,
      chapter: "Jornada",
      title: `${s.code} · ${s.verb} · ${f.lens}`,
      body: (
        <div className={`grid h-full content-center gap-[0.9em] proposal-stage-${s.id}`}>
          <div className="flex flex-wrap items-end justify-between gap-[0.6em]">
            <div>
              <p className="slide-kicker">
                {s.code} · Lente {f.lens}
                {f.domain === "B" ? " · risco psicossocial, educativo" : ""}
              </p>
              <Title>{s.verb}</Title>
              <p className="slide-lead italic">“{f.question}”</p>
            </div>
            <Understand
              label={`Entenda o ${s.code}`}
              title={`${s.code} · ${s.verb} · ${f.lens}`}
              description={s.deliverable}
              variant="button"
            >
              <StageDetail p={p} stage={s} />
            </Understand>
          </div>
          <ol className="grid gap-[0.6em] md:grid-cols-4">
            {IFT_ORDER.map((m) => (
              <li key={m} className={`slide-card proposal-ift-cell proposal-ift-${m}`}>
                <IftBadge m={m} />
                <p className="slide-small slide-ink mt-[0.4em]">{f.ift[m].text}</p>
                {m === "mensurar" && (s.id === "q1" || s.id === "q3") ? <span className="slide-small">Referência metodológica</span> : <StatusMark a={f.ift[m].availability} />}
              </li>
            ))}
          </ol>
          <dl className="grid gap-[0.5em] md:grid-cols-4">
            {(Object.keys(p.ift.roleLabels) as (keyof typeof p.ift.roleLabels)[]).map((k) => (
              <div key={k} className={`proposal-role proposal-role-${k} rounded-[0.6em] p-[0.6em]`}>
                <dt className="slide-small font-semibold">{p.ift.roleLabels[k]}</dt>
                <dd className="slide-small slide-ink">{f.roles[k]}</dd>
              </div>
            ))}
          </dl>
          <p className="slide-small">{p.ift.rolesNote}</p>
        </div>
      ),
    });
  }
  add({
    id: "cronograma",
    chapter: "Jornada",
    title: p.schedule.title,
    body: (
      <div className="grid h-full content-center gap-[1em]">
        <Title>{p.schedule.title}</Title>
        <ol className="grid gap-[0.6em] md:grid-cols-5">
          {p.schedule.stages.map((st) => {
            const stage = stages.find((s) => s.id === st.id)!;
            return (
              <li
                key={st.id}
                className={`slide-card proposal-schedule-stage proposal-stage-${st.id}`}
              >
                <h3 className="slide-h3">
                  {stage.code} · {stage.verb}
                </h3>
                <ul className="mt-[0.4em] space-y-[0.2em]">
                  {st.months.map((m) => (
                    <li key={m.label} className="slide-small">
                      <span className="font-semibold">{m.label}</span> · {m.focus}
                      {m.conditioned ? (
                        <CircleDashed
                          aria-label="com etapa condicionada"
                          className="slide-inline-icon ml-[0.3em] inline"
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="slide-small mt-[0.4em] flex items-center gap-[0.3em] font-semibold">
                  <Flag aria-hidden className="slide-inline-icon proposal-accent-icon" /> Marco de
                  aceite
                </p>
                <Understand
                  label="Entenda"
                  title={`${stage.code} · ${stage.verb} · ${stage.framework.lens}`}
                  description={stage.deliverable}
                >
                  <StageDetail p={p} stage={stage} />
                </Understand>
              </li>
            );
          })}
        </ol>
        <p className="slide-small">{p.schedule.note}</p>
      </div>
    ),
  });
  add({
    id: "funcionou",
    chapter: "Jornada",
    title: "Como decidir se funcionou",
    body: (
      <div className="grid h-full content-center gap-[1em]">
        <Title>Como decidir se funcionou</Title>
        <ul className="grid gap-[0.7em] md:grid-cols-4">
          {p.indicators.operational.map((k) => (
            <li key={k.title} className="slide-card slide-brand-top">
              <CheckCircle2 aria-hidden className="slide-inline-icon proposal-accent-text" />
              <h3 className="slide-h3">{k.title}</h3>
              <p className="slide-small">{k.body}</p>
            </li>
          ))}
        </ul>
        <div className="slide-card">
          <h3 className="slide-h3">Avaliação de efeito: separada</h3>
          <p className="slide-small">{p.indicators.effect}</p>
        </div>
      </div>
    ),
  });

  // ── Investimento ──
  add({
    id: "cap-brasilia", chapter: "Brasília", title: "Mensurar, educar e transformar Brasília",
    dark: true, divider: true, mesh: true,
    body: <BrasiliaTransition slide />,
  });
  add({
    id: "brasilia", chapter: "Brasília", title: "O próximo passo para Brasília",
    body: <BrasiliaContinuation slide />,
  });
  add({
    id: "cap-investimento",
    chapter: "Investimento",
    title: "Investimento e condição de implantação",
    dark: true,
    divider: true,
    image: BAND_IMAGES.evoluir,
    body: (
      <div className="flex h-full flex-col justify-end gap-[0.6em]">
        <p className="slide-kicker">Capítulo</p>
        <h2 className="slide-cover-title">Investimento e condição de implantação</h2>
        <p className="slide-lead max-w-[52ch]">
          Uma conta aberta: o valor de referência, o que a ISG contribui e o que o Instituto
          investe.
        </p>
        <span className="slide-caption">{caption}</span>
      </div>
    ),
  });
  add({
    id: "conta",
    chapter: "Investimento",
    title: p.pricing.title,
    body: (
      <div className="grid h-full content-center gap-[1em]">
        <Title>{p.pricing.title}</Title>
        <p className="slide-lead max-w-[72ch]">{p.pricing.intro}</p>
        <div className="slide-card slide-bridge">
          <ValueBridge p={p} large />
        </div>
        <div className="flex flex-wrap items-center gap-[0.8em]">
          <Understand
            label="Entenda a conta"
            title="Como chegamos ao valor de referência"
            description="Composição, horas por etapa, parâmetros e o que a licença inclui."
            variant="button"
          >
            <PriceDetail p={p} />
          </Understand>
          <p className="slide-small">{p.pricing.notes[0]}</p>
        </div>
      </div>
    ),
  });
  add({
    id: "investimento",
    chapter: "Investimento",
    title: "Investimento e colaboração técnica",
    body: (
      <div className="grid h-full content-center gap-[1.2em] lg:grid-cols-2">
        <div className="slide-card slide-brand-top space-y-[0.6em]">
          <p className="slide-kicker">Investimento da ISG</p>
          <p className="slide-metric">
            {brl(parcel)} <span className="slide-lead">por etapa</span>
          </p>
          <p className="slide-small">
            Valor de referência: {brl(p.pricing.referencePerStage)} por etapa.
          </p>
          <p className="slide-lead">
            Cerca de{" "}
            <strong className="proposal-accent-text">
              {brl(parcel / inv.monthsPerStage)} por mês
            </strong>
            , equivalente nos {inv.monthsPerStage} meses de cada etapa.
          </p>
          <p className="proposal-total slide-small rounded-[0.6em] px-[0.8em] py-[0.5em]">
            Total do programa: <strong>{brl(inv.total)}</strong> em {inv.installments} parcelas, uma
            por marco aceito (referência: {brl(p.pricing.referenceTotal)}).
          </p>
        </div>
        <div className="slide-card slide-brand-top space-y-[0.6em]">
          <p className="slide-kicker">Colaboração técnica da ISG</p>
          <p className="slide-metric">{p.counterpart.hours} horas</p>
          <ul className="space-y-[0.3em]">
            {p.counterpart.deliverables.map((d) => (
              <li key={d.title} className="slide-small">
                <strong>{d.title}.</strong> {d.body}
              </li>
            ))}
          </ul>
          <p className="slide-small"><strong>Brasília · Cooperação futura.</strong> Avaliar desempenho, acessibilidade e implantação do Game da Felicidade e da formação introdutória para a população. Escopo e horas próprios, a combinar.</p>
        </div>
      </div>
    ),
  });

  // ── Pessoas e próximos passos ──
  add({
    id: "responsabilidades",
    chapter: "Próximos passos",
    title: "O que cada parte faz",
    body: (
      <div className="grid h-full content-center gap-[1em]">
        <Title>O que cada parte faz</Title>
        <ul className="grid gap-[0.6em] md:grid-cols-3">
          {p.responsibilities.map((r) => (
            <li key={r.party} className="slide-card">
              <h3 className="slide-h3">
                {r.party}{" "}
                <span className="slide-small">· {r.group === "isg" ? "ISG" : "Instituto"}</span>
              </h3>
              <p className="slide-small slide-ink">{r.does}</p>
              <p className="slide-small">{r.effort}</p>
            </li>
          ))}
        </ul>
        <p className="slide-small">
          Esforço interno estimado como proposta, para confirmar na reunião de implantação.
        </p>
      </div>
    ),
  });
  add({
    id: "equipe",
    chapter: "Próximos passos",
    title: p.team.title,
    body: (
      <div className="grid h-full content-center gap-[1.2em]">
        <Title>{p.team.title}</Title>
        <ul className="grid gap-[1em] md:grid-cols-3">
          {p.team.members.map((m) => (
            <li
              key={m.name}
              className="slide-card slide-brand-top flex flex-col items-center text-center"
            >
              <img
                src={TEAM_PHOTOS[m.photo]}
                width={360}
                height={360}
                alt={`Retrato de ${m.name}`}
                className="slide-portrait rounded-full object-cover ring-4 proposal-photo-ring"
              />
              <h3 className="slide-h3 mt-[0.6em]">{m.name}</h3>
              <p className="slide-small proposal-accent-text">{m.label}</p>
              <p className="slide-small mt-[0.3em]">{m.bio}</p>
              <p className="slide-small mt-[0.4em] font-semibold">{m.role}</p>
            </li>
          ))}
        </ul>
        <p className="slide-small">{p.team.note}</p>
      </div>
    ),
  });
  add({
    id: "proxima",
    chapter: "Próximos passos",
    title: p.nextSession.title,
    dark: true,
    image: HERO_IMAGE,
    body: (
      <div className="grid h-full content-end gap-[1em] lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div className="space-y-[0.6em]">
          <p className="slide-kicker">Próxima conversa</p>
          <h2 className="slide-cover-title">{p.nextSession.title}</h2>
          <p className="slide-lead">{p.nextSession.howTo}</p>
          <p className="slide-small">{p.nextSession.note}</p>
        </div>
        <ol className="slide-card slide-card-glass space-y-[0.3em]">
          {p.nextSession.agenda.map((a, i) => (
            <li key={a} className="slide-small">
              {i + 1}. {a}
            </li>
          ))}
        </ol>
      </div>
    ),
  });
  add({
    id: "fontes",
    chapter: "Próximos passos",
    title: "Fontes e classificação",
    body: (
      <div className="grid h-full content-center gap-[0.8em]">
        <Title>Fontes e classificação</Title>
        <ul className="grid gap-[0.4em] md:grid-cols-2">
          {p.sources.map((s) => (
            <li key={s.claim} className="slide-small">
              <strong className="slide-ink">{s.claim}.</strong> {s.source}
            </li>
          ))}
        </ul>
        <p className="slide-small">Proposta para conversa, não é contrato. {p.version}.</p>
      </div>
    ),
  });
  return slides;
}

export function ProposalSlides({ p, onExit }: { p: ProposalContent; onExit: () => void }) {
  const slides = useMemo(() => buildSlides(p), [p]);
  return <SlideDeck slides={slides} onExit={onExit} />;
}

/** Ids dos slides, na ordem (para o teste de paridade com a página). */
export const slideIds = (p: ProposalContent) => buildSlides(p).map((s) => s.id);
