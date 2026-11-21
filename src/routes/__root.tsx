import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { A11yProvider } from "../app/shell/A11yProvider";
import { MockDataProvider } from "../app/shell/MockDataProvider";
import { PackProvider } from "../app/composition/PackProvider";
import { AuthGate } from "../app/auth/AuthGate";
import { SplashScreen } from "../components/SplashScreen";
import { ConciergeWidget } from "../components/concierge/ConciergeWidget";
import { usesPresentationShell } from "../features/presentation/path";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Erro 404</p>
        <h1 className="mt-3 font-serif text-4xl text-foreground">Página não encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A rota acessada não existe ou ainda não foi construída nesta fundação.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: import("@tanstack/react-router").ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl text-foreground">Esta página não pôde carregar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Você pode tentar novamente ou voltar ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0B3D2E" },
      { title: "Programa VitalOS™ — Felicidade e Crescimento para Todos" },
      {
        name: "description",
        content:
          "VitalOS™ — Sistema Operacional da Vitalidade Organizacional. Transforme bem-estar, riscos psicossociais, cultura e performance em dados, ações e evidências.",
      },
      { name: "author", content: "4 Lentes VitalOS™" },
      {
        property: "og:title",
        content: "Programa VitalOS™ — Felicidade e Crescimento para Todos",
      },
      {
        property: "og:description",
        content:
          "VitalOS™ — Sistema Operacional da Vitalidade Organizacional. Transforme bem-estar, riscos psicossociais, cultura e performance em dados, ações e evidências.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Programa VitalOS™ — Felicidade e Crescimento para Todos",
      },
      {
        name: "twitter:description",
        content:
          "VitalOS™ — Sistema Operacional da Vitalidade Organizacional. Transforme bem-estar, riscos psicossociais, cultura e performance em dados, ações e evidências.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/af93e811-644d-46bc-98b3-d017d7d1313d",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/af93e811-644d-46bc-98b3-d017d7d1313d",
      },
      { property: "og:title", content: "Programa VitalOS™ — Felicidade e Crescimento para Todos" },
      { name: "twitter:title", content: "Programa VitalOS™ — Felicidade e Crescimento para Todos" },
      { name: "description", content: "VitalOS™ — Sistema Operacional da Vitalidade Organizacional. Transforme bem-estar, riscos psicossociais, cultura e performance em dados, ações e evidências." },
      { property: "og:description", content: "VitalOS™ — Sistema Operacional da Vitalidade Organizacional. Transforme bem-estar, riscos psicossociais, cultura e performance em dados, ações e evidências." },
      { name: "twitter:description", content: "VitalOS™ — Sistema Operacional da Vitalidade Organizacional. Transforme bem-estar, riscos psicossociais, cultura e performance em dados, ações e evidências." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/af93e811-644d-46bc-98b3-d017d7d1313d" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/af93e811-644d-46bc-98b3-d017d7d1313d" },
    ],
    links: [{ rel: "stylesheet", href: appCss },],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useLocation({ select: (location) => location.pathname });

  // The presentation has its own server gate and never starts company/demo providers.
  if (usesPresentationShell(pathname)) {
    return <A11yProvider><Outlet /></A11yProvider>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <A11yProvider>
        <PackProvider packId="enterprise">
          <MockDataProvider>
            <AuthGate>
              <Outlet />
              <ConciergeWidget />
              <SplashScreen />
            </AuthGate>
          </MockDataProvider>
        </PackProvider>
      </A11yProvider>
    </QueryClientProvider>
  );
}
