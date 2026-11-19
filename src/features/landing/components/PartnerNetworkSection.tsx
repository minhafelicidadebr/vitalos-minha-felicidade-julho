import { useState } from "react";
import { ArrowRight, HeartHandshake, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartnerInterestForm } from "./PartnerInterestForm";
import { PartnerPhotoPreview } from "./PartnerPhotoPreview";

type Track = "sst" | "development";

const services = {
  sst: {
    title: "SST e riscos psicossociais",
    example: "Apoiar a avaliação das condições de trabalho e o planejamento da prevenção.",
  },
  development: {
    title: "Bem-estar e desenvolvimento organizacional",
    example: "Formar lideranças e apoiar intervenções de bem-estar baseadas em evidências.",
  },
};

export function PartnerNetworkSection() {
  const [track, setTrack] = useState<Track>("sst");
  const [sample, setSample] = useState<Track | null>(null);
  const [request, setRequest] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  return (
    <section
      id="rede-vitalos"
      aria-labelledby="partner-network-title"
      className="scroll-mt-24 border-y bg-primary/5 px-4 py-12 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="max-w-3xl space-y-3">
          <p className="flex items-center gap-2 font-semibold text-primary">
            <HeartHandshake aria-hidden className="size-5" />
            Rede VitalOS · Prévia
          </p>
          <h2 id="partner-network-title" className="font-serif text-3xl sm:text-5xl">
            Leve sua experiência a empresas que querem melhorar a forma de trabalhar
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Conheça uma proposta de parceria para profissionais e consultorias. A empresa explica de
            que precisa, a curadoria considera a experiência de cada profissional e a indicação
            acontece quando os escopos são compatíveis.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(services).map(([key, service]) => {
            const Icon = key === "sst" ? ShieldCheck : HeartHandshake;
            return (
              <div key={key} className="space-y-3 rounded-2xl border bg-card p-5">
                <Icon aria-hidden className="size-6 text-primary" />
                <h3 className="font-serif text-xl">{service.title}</h3>
                <p className="text-muted-foreground">{service.example}</p>
              </div>
            );
          })}
        </div>
        <PartnerInterestForm />
        <details className="rounded-2xl border bg-card p-5">
          <summary className="min-h-11 cursor-pointer rounded-md pt-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-ring">
            Experimentar uma indicação fictícia
          </summary>
          <div className="space-y-5 pt-3">
            <p className="text-sm text-muted-foreground">
              Prévia com dados fictícios. O exercício não envia dados nem gera candidatura,
              indicação ou acesso a uma avaliação real.
            </p>
            <ol className="grid gap-4 sm:grid-cols-3 [&>li]:space-y-3">
              <li>
                <h3 className="font-semibold">1. Empresa pede apoio</h3>
                <p className="text-sm">A Empresa Alfa precisa de apoio com riscos psicossociais.</p>
                <Button type="button" variant="outline" onClick={() => setRequest(true)}>
                  Simular pedido
                </Button>
                {request && <p role="status">Pedido fictício registrado na prévia.</p>}
              </li>
              <li>
                <h3 className="font-semibold">2. Profissional apresenta sua atuação</h3>
                <label className="grid gap-2 text-sm">
                  Área de atuação fictícia
                  <select
                    className="min-h-11 w-full rounded-md border bg-background px-2"
                    value={track}
                    onChange={(event) =>
                      setTrack(event.target.value === "sst" ? "sst" : "development")
                    }
                  >
                    <option value="sst">SST e riscos psicossociais</option>
                    <option value="development">Bem-estar e desenvolvimento</option>
                  </select>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSample(track);
                    setReviewed(false);
                  }}
                >
                  Simular candidatura
                </Button>
                {sample && <p role="status">Em análise: {services[sample].title}.</p>}
              </li>
              <li>
                <h3 className="font-semibold">3. Curadoria verifica a compatibilidade</h3>
                <p className="text-sm">Compare o serviço oferecido com o pedido da Alfa.</p>
                <Button
                  type="button"
                  disabled={!request || !sample}
                  onClick={() => setReviewed(true)}
                >
                  Conferir escopo <ArrowRight aria-hidden />
                </Button>
                {reviewed && (
                  <p role="status">
                    {sample === "sst"
                      ? "Escopo compatível. A curadoria pode apresentar a opção à empresa após verificar a experiência e as credenciais aplicáveis."
                      : "Esse serviço pode apoiar uma etapa futura de formação. A Alfa ainda precisa de apoio para a avaliação técnica."}
                  </p>
                )}
              </li>
            </ol>
            <PartnerPhotoPreview />
          </div>
        </details>
      </div>
    </section>
  );
}
