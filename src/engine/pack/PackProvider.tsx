import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DomainPack, PackStatus } from "./pack-types";

/**
 * PackProvider — carrega e valida o Domain Pack no boot.
 *
 * Por enquanto: stub que tenta carregar src/domain/packs/enterprise/enterprise.pack.json
 * via import dinâmico. Os arquivos reais (enterprise.pack.json, ivo-framework.json,
 * gamification-economy.json, domain-pack.schema.json) serão fornecidos no próximo passo.
 *
 * Quando o schema chegar, a validação acontece aqui antes de marcar como "ready".
 */

interface PackContextValue {
  status: PackStatus;
  pack: DomainPack | null;
  t: (token: string, fallback?: string) => string;
  hasModule: (key: string) => boolean;
  reload: () => void;
}

const PackContext = createContext<PackContextValue | null>(null);

interface PackProviderProps {
  children: ReactNode;
  packId?: string;
}

async function loadPackStub(packId: string): Promise<DomainPack> {
  try {
    const mod = await import(`../../domain/packs/${packId}/${packId}.pack.json`);
    return (mod.default ?? mod) as DomainPack;
  } catch {
    // Stub mínimo enquanto o JSON real não foi fornecido
    return {
      meta: {
        id: packId,
        name: "Enterprise (stub)",
        version: "0.0.0-stub",
        sector: "enterprise",
        locale: "pt-BR",
        description: "Pack placeholder. O JSON oficial será carregado no próximo bloco.",
      },
      vocabulary: {},
      modules: {},
    };
  }
}

export function PackProvider({ children, packId = "enterprise" }: PackProviderProps) {
  const [status, setStatus] = useState<PackStatus>({ state: "idle" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus({ state: "loading" });
    loadPackStub(packId)
      .then((pack) => {
        if (cancelled) return;
        // TODO: validar contra domain-pack.schema.json quando disponível
        setStatus({ state: "ready", pack });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus({
          state: "error",
          error: {
            code: "unknown",
            message: err instanceof Error ? err.message : "Falha ao carregar pack",
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [packId, reloadKey]);

  const value = useMemo<PackContextValue>(() => {
    const pack = status.state === "ready" ? status.pack : null;
    return {
      status,
      pack,
      t: (token, fallback) => pack?.vocabulary?.[token] ?? fallback ?? token,
      hasModule: (key) => Boolean(pack?.modules?.[key]),
      reload: () => setReloadKey((k) => k + 1),
    };
  }, [status]);

  return <PackContext.Provider value={value}>{children}</PackContext.Provider>;
}

export function usePack() {
  const ctx = useContext(PackContext);
  if (!ctx) throw new Error("usePack deve ser usado dentro de <PackProvider>.");
  return ctx;
}
