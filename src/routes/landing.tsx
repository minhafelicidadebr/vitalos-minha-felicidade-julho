import { createFileRoute, redirect } from "@tanstack/react-router";

// A landing foi movida para "/" (rota raiz). Esta rota existe apenas para não quebrar
// links antigos que apontavam para /landing.
export const Route = createFileRoute("/landing")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: () => null,
});
