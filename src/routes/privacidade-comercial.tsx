// Rota pública · /privacidade-comercial — a política de dados do FORMULÁRIO
// COMERCIAL (modal "Receber apresentação executiva"), não confundir com
// /privacidade (consentimento de IA sobre dado de pesquisa, domínio
// diferente) nem /confianca (Trust Ledger interno da organização cliente).
// Honestidade Fable 5 §8: nenhum claim de blindagem jurídica ou conformidade
// automática — nr1-copsoq-defensibility-guard também vale para copy comercial.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Trash2, Clock, Ban } from "lucide-react";
import { PLAN_CATALOG } from "@/engine/billing/plan-engine";

export const Route = createFileRoute("/privacidade-comercial")({
  head: () => ({ meta: [{ title: "Privacidade Comercial — 4 Lentes VitalOS™" }] }),
  component: PrivacidadeComercialPage,
});

const pilot = PLAN_CATALOG.pilot;

function PrivacidadeComercialPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/60 px-4 py-4 sm:px-6">
        <Link to="/" className="text-sm font-semibold text-foreground">
          4 Lentes VitalOS™
        </Link>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Privacidade comercial
          </p>
          <h1 className="mt-2 font-serif text-3xl text-foreground">
            O que fazemos com os dados do formulário de contato
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Esta página cobre só o formulário "Receber apresentação executiva" da
            landing pública. Dado de pesquisa de colaboradores (COPSOQ/PERMA/VIA-T)
            segue uma política própria, muito mais restrita — nunca é o mesmo
            tratamento.
          </p>
        </div>

        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="font-medium text-card-foreground">O que coletamos</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Nome, empresa, cargo (opcional), e-mail, WhatsApp (opcional) e o
            interesse principal que você escolher — só o que o próprio formulário
            pede, nada além. Também registramos a página de origem e, se aplicável,
            os parâmetros de campanha (UTM) do link que você clicou, para entender
            que canal trouxe o contato.
          </p>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-primary" />
            <h2 className="font-medium text-card-foreground">O que nunca fazemos</h2>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            <li>Não vendemos nem compartilhamos seu contato com terceiros.</li>
            <li>Não usamos este dado para nada além de responder à sua solicitação.</li>
            <li>
              Não prometemos laudo automático, conformidade automática com a NR-1 ou
              blindagem jurídica — a responsabilidade técnica do PGR é sempre do
              profissional habilitado; o VitalOS mede, educa e evidencia.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-medium text-card-foreground">Quanto tempo guardamos</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Enquanto durar o relacionamento comercial (contato, avaliação, ou
            contrato). Se não houver resposta ou continuidade, o contato pode ser
            removido a pedido a qualquer momento.
          </p>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-primary" />
            <h2 className="font-medium text-card-foreground">Como pedir a remoção</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Escreva para o e-mail de contato informado na proposta recebida,
            pedindo a exclusão do seu contato — atendemos no menor prazo possível.
          </p>
        </section>

        <section className="rounded-2xl border border-primary/25 bg-primary/5 p-6">
          <h2 className="font-medium text-card-foreground">Oferta de piloto</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            O piloto institucional segue os limites reais do plano{" "}
            <strong>{pilot.label}</strong>: até {pilot.maxWavesPerMonth} onda de
            medição por mês, até {pilot.maxInvitesPerWave} convites por onda,{" "}
            {pilot.maxAdminSeats} assento administrativo, instrumento{" "}
            {pilot.allowedInstruments.join(", ")}. Duração comercial de referência:
            90 dias — condições finais confirmadas na proposta, nunca prometidas
            automaticamente por este formulário.
          </p>
        </section>

        <p className="text-center text-[11px] text-muted-foreground">
          Dúvidas sobre este tratamento de dados? Fale com o time VitalOS™ pelo
          canal indicado na sua proposta.
        </p>
      </main>
    </div>
  );
}
