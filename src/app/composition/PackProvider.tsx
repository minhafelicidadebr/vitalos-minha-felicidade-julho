// Composition root do pack ativo — a METADE DE DOMÍNIO da fronteira
// Engine↔Domínio (P1-07). Este é o ÚNICO lugar do app (fora de domain/ e
// testes) autorizado a importar o registro de packs: carrega o bundle do
// setor ativo, valida com Ajv contra o schema versionado e publica o
// resultado no PackContext (engine/pack/pack-context — puro, sem domain).
// Engine faz conta; ESTA camada injeta o significado.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";

import { PackContext, type PackContextValue } from "@/engine/pack/pack-context";
import type { DomainPack, PackStatus } from "@/engine/pack/pack-types";
import { resolvePackBundle, DEFAULT_PACK_ID } from "@/domain/packs/registry";
import packSchema from "@/domain/packs/enterprise/domain-pack.schema.json";

// ─── Store do pack ativo (persistido) ─────────────────────────────────────────
// Igual ao seletor de persona: a escolha de setor sobrevive ao reload. Trocar de
// pack é uma capacidade de runtime, não um rebuild.
interface PackState {
  packId: string;
  setPackId: (packId: string) => void;
}

export const usePackStore = create<PackState>()(
  persist(
    (set) => ({
      packId: DEFAULT_PACK_ID,
      setPackId: (packId) => set({ packId }),
    }),
    { name: "vita-pack" },
  ),
);

interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null;
}

function validatePack(pack: unknown): ValidationResult {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  // Schema externo é referenciado via $id absoluto; Ajv compila por valor.
  const validate = ajv.compile(packSchema as object);
  const valid = validate(pack);
  return { valid: Boolean(valid), errors: validate.errors ?? null };
}

function logValidation(packId: string, pack: DomainPack, result: ValidationResult) {
  const tag = `[Pack:${packId}]`;
  if (result.valid) {
    // eslint-disable-next-line no-console
    console.log(
      `%c${tag} ✅ válido%c — ${pack.packName} v${pack.version}`,
      "color:#0B3D2E;font-weight:600",
      "color:inherit",
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `%c${tag} ⚠️ inválido%c — ${result.errors?.length ?? 0} erro(s) contra domain-pack.schema.json`,
      "color:#C0392B;font-weight:600",
      "color:inherit",
    );
    // eslint-disable-next-line no-console
    console.warn(tag, result.errors);
  }
}

export function PackProvider({
  children,
  packId: seedPackId,
}: {
  children: ReactNode;
  /** Setor inicial. Só semeia o store quando ainda não há escolha persistida. */
  packId?: string;
}) {
  const activePackId = usePackStore((s) => s.packId);
  const setActivePackId = usePackStore((s) => s.setPackId);
  const [status, setStatus] = useState<PackStatus>({ state: "idle" });
  const [reloadKey, setReloadKey] = useState(0);

  // Semeia o setor inicial uma única vez (ex.: testes/forçar pack), sem sobrepor
  // a escolha do usuário em reloads subsequentes.
  useEffect(() => {
    if (seedPackId && seedPackId !== DEFAULT_PACK_ID && activePackId === DEFAULT_PACK_ID) {
      setActivePackId(seedPackId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setStatus({ state: "loading" });
    try {
      const bundle = resolvePackBundle(activePackId);
      const pack = bundle.pack;
      const index = bundle.index;
      const gamification = bundle.gamification;

      const validation = validatePack(pack);
      logValidation(activePackId, pack, validation);

      // Marca o setor no DOM — hook leve para theming/QA sem reescrever tokens.
      if (typeof document !== "undefined") {
        document.documentElement.dataset.pack = activePackId;
      }

      setStatus({
        state: "ready",
        pack,
        index,
        gamification,
        validation: { valid: validation.valid, errors: validation.errors },
      });
    } catch (err) {
      const error = {
        code: "parse_error" as const,
        message: err instanceof Error ? err.message : "Falha ao carregar pack",
      };
      // eslint-disable-next-line no-console
      console.error(`[Pack:${activePackId}] erro de carregamento`, err);
      setStatus({ state: "error", error });
    }
  }, [activePackId, reloadKey]);

  const value = useMemo<PackContextValue>(() => {
    const pack = status.state === "ready" ? status.pack : null;
    const index = status.state === "ready" ? status.index : null;
    const gamification = status.state === "ready" ? status.gamification : null;
    return {
      status,
      pack,
      index,
      gamification,
      packId: activePackId,
      sectorLabel: resolvePackBundle(activePackId).sectorLabel,
      setPackId: setActivePackId,
      t: (token, fallback) => pack?.labels?.[token] ?? fallback ?? token,
      hasRole: (roleId) => Boolean(pack?.roles?.some((r) => r.id === roleId)),
      reload: () => setReloadKey((k) => k + 1),
    };
  }, [status, activePackId, setActivePackId]);

  return <PackContext.Provider value={value}>{children}</PackContext.Provider>;
}
