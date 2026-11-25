import { Compass, GraduationCap, Layers3, UsersRound, type LucideIcon } from "lucide-react";
import type { ProposalContent } from "./types";

type IsgMap = ProposalContent["why"]["isgMap"];
const FRONT_ICONS: Record<string, LucideIcon> = {
  Tecnologia: Layers3,
  Gestão: Compass,
  Educação: GraduationCap,
  Pessoas: UsersRound,
};

/**
 * Infográfico "o que a ISG comunica e faz" × "o que o Instituto soma".
 * Só usa o que o site institucional declara; sem números de porte da empresa.
 */
export function IsgInfographic({ map, slide = false }: { map: IsgMap; slide?: boolean }) {
  const Heading = slide ? "h3" : "h3";
  return (
    <figure className="proposal-isgmap" aria-label="O que a ISG comunica e faz, e o que o Instituto soma">
      <div className="proposal-isgmap-side">
        <p className="proposal-isgmap-kicker">O que a ISG comunica e faz</p>
        <Heading className="proposal-isgmap-title">Uma holding de tecnologia, gestão, educação e pessoas</Heading>
        <ul className="proposal-isgmap-fronts" data-reveal-group>
          {map.fronts.map((f) => {
            const Icon = FRONT_ICONS[f.name] ?? Layers3;
            return (
              <li key={f.name} data-reveal className={f.touches ? "is-touch" : undefined}>
                <Icon aria-hidden size={18} />
                <strong>{f.name}</strong>
                <span>{f.detail}</span>
              </li>
            );
          })}
        </ul>
        <p className="proposal-isgmap-brands">
          <span>{map.brands.length} unidades de negócio</span>
          {map.brands.join(" · ")}
        </p>
        <p className="proposal-isgmap-values"><span>Valores declarados</span>{map.values.join(" · ")}</p>
      </div>
      <div className="proposal-isgmap-bridge" aria-hidden>
        <span>Pessoas e Educação</span>
        <i />
        <span>tocam o programa</span>
      </div>
      <div className="proposal-isgmap-side proposal-isgmap-adds">
        <p className="proposal-isgmap-kicker">O que o Instituto soma</p>
        <ul data-reveal-group>
          {map.adds.map((a) => (
            <li key={a.title} data-reveal>
              <strong>{a.title}</strong>
              <span>{a.body}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="proposal-isgmap-source">
        Fonte: <a href={map.source.href} target="_blank" rel="noopener noreferrer">{map.source.label}</a> · {map.checked}. {map.note}
      </figcaption>
    </figure>
  );
}
