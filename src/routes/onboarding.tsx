// /onboarding SEM token — self-serve fechado. Ninguém cria organização por
// aqui sozinho; o fluxo real é /ativar/:token, com um convite gerado por um
// admin da plataforma em /plataforma. Esta tela só orienta quem chegou aqui
// sem convite (link antigo, digitação manual, etc.).

import { createFileRoute, Link } from "@tanstack/react-router";
import { MailQuestion } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Configurar organização — VitalOS™" }] }),
  component: OnboardingGatePage,
});

function OnboardingGatePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-dashed border-border/70 bg-card p-8 text-center">
        <MailQuestion className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-4 font-serif text-xl text-foreground">Você precisa de um convite</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          A criação de uma nova organização no VitalOS™ só acontece por convite do
          administrador. Se você contratou o serviço, peça o link de acesso a
          quem fez a venda.
        </p>
        <Link
          to="/entrar"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Já tenho uma conta
        </Link>
      </div>
    </div>
  );
}
