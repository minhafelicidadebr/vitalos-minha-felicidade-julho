import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EDUCATIONAL_INNOVATIONS,
  type CtaAction,
  type LandingModalType,
} from "../data/landing-copy";
import { TONE_CLASS } from "./icons";
import educationalInnovationsImage from "@/assets/educational-innovations-hollywood-learning.jpg";

export function EducationalInnovationsSection({
  onAction,
}: {
  onAction: (action: CtaAction) => void;
}) {
  const d = EDUCATIONAL_INNOVATIONS;

  return (
    <section className="relative isolate overflow-hidden border-y border-white/10 bg-[#061615] py-16 text-white sm:py-20">
      <img
        src={educationalInnovationsImage}
        alt=""
        aria-hidden
        loading="lazy"
        width={1536}
        height={864}
        className="absolute inset-0 h-full w-full object-cover object-center opacity-55 blur-[0.6px] [filter:saturate(1.08)_contrast(1.06)_brightness(0.72)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,12,11,0.96)_0%,rgba(3,25,22,0.88)_42%,rgba(5,32,29,0.54)_72%,rgba(2,12,11,0.76)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:72px_72px] opacity-45 [mask-image:linear-gradient(90deg,black_0%,black_72%,transparent_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent"
      />
      <div
        aria-hidden
        className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <span className="sr-only">{d.imageAlt}</span>
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-300">
            {d.eyebrow}
          </p>
          <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight text-white sm:text-4xl">
            {d.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">{d.lead}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {d.highlights.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-white/75 shadow-sm backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden />
              {item}
            </span>
          ))}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {d.items.map((item) => {
            const tone = TONE_CLASS[item.tone] ?? TONE_CLASS.sky!;
            return (
              <article
                key={item.modal}
                className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.045)_52%,rgba(201,162,39,0.08)_100%)] p-6 text-white shadow-2xl shadow-black/15 backdrop-blur-2xl ring-1 ring-inset ${tone.ring} transition-all hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.095] hover:shadow-black/25`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-1 ${tone.dot} opacity-90`}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:auto,34px_34px,34px_34px] opacity-80"
                />
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-mono text-sm font-semibold ${tone.bg} ${tone.text} ring-1 ring-inset ${tone.ring}`}
                  >
                    {item.q}
                  </span>
                  <span className="relative rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur">
                    EdTech
                  </span>
                </div>
                <h3 className="relative mt-5 font-serif text-2xl leading-tight text-white">
                  {item.title}
                </h3>
                {"subtitleLines" in item ? (
                  <div className="relative mt-3 flex flex-wrap gap-1.5">
                    {item.subtitleLines.map((line) => (
                      <span
                        key={line}
                        className={`rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75 backdrop-blur ring-1 ring-inset ${tone.ring}`}
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p
                    className={`relative mt-2 text-xs font-semibold uppercase tracking-[0.14em] ${tone.text}`}
                  >
                    {item.subtitle}
                  </p>
                )}
                <p className="relative mt-3 flex-1 text-sm leading-relaxed text-white/76">
                  {item.text}
                </p>
                <p className="relative mt-4 rounded-2xl border border-white/15 bg-white/[0.06] p-4 text-xs leading-relaxed text-white/80 backdrop-blur">
                  {item.signal}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="relative mt-5 w-full justify-between gap-3 border-white/18 bg-white/[0.065] text-white backdrop-blur hover:bg-white/15 hover:text-white"
                  onClick={() => onAction({ kind: "modal", modal: item.modal as LandingModalType })}
                >
                  Ver inovação educacional
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
