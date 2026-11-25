import { Compass, GraduationCap, Layers3, UsersRound, type LucideIcon } from "lucide-react";
import logoIsg from "@/assets/logo-isg.svg";
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
 * No slide a versão é enxuta (só o essencial); a página traz o detalhe.
 */
export function IsgInfographic({ map, slide = false }: { map: IsgMap; slide?: boolean }) {
  return (
    <figure className={"proposal-isgmap" + (slide ? " is-slide" : "")} aria-label="O que a ISG comunica e faz, e o que o Instituto soma">
      <div className="proposal-isgmap-side">
        <div className="proposal-isgmap-brand">
          <span className="proposal-isgmap-logo"><img src={logoIsg} alt="ISG Participações" width={174} height={20} /></span>
          <span className="proposal-isgmap-kicker">O que a ISG comunica e faz</span>
        </div>
        <ul className="proposal-isgmap-fronts" data-reveal-group>
          {map.fronts.map((f) => {
            const Icon = FRONT_ICONS[f.name] ?? Layers3;
            return (
              <li key={f.name} data-reveal className={f.touches ? "is-touch" : undefined}>
                <Icon aria-hidden size={18} />
                <strong>{f.name}</strong>
                {slide ? null : <span>{f.detail}</span>}
              </li>
            );
          })}
        </ul>
        <p className="proposal-isgmap-brands">
          <span>{map.brands.length} unidades de negócio</span>
          {slide ? null : map.brands.join(" · ")}
        </p>
        {slide ? null : <p className="proposal-isgmap-values"><span>Valores declarados</span>{map.values.join(" · ")}</p>}
      </div>
      <div className="proposal-isgmap-bridge" aria-hidden>
        <i />
        <span>+</span>
        <i />
      </div>
      <div className="proposal-isgmap-side proposal-isgmap-adds">
        <p className="proposal-isgmap-kicker">O que o Instituto soma</p>
        <ul data-reveal-group>
          {map.adds.map((a) => (
            <li key={a.title} data-reveal>
              <strong>{a.title}</strong>
              {slide ? null : <span>{a.body}</span>}
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="proposal-isgmap-source">
        Fonte: <a href={map.source.href} target="_blank" rel="noopener noreferrer">{map.source.label}</a> · {map.checked}.{slide ? "" : " " + map.note}
      </figcaption>
    </figure>
  );
}
