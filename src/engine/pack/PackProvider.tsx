import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";

import type {
  DomainPack,
  GamificationEconomy,
  PackStatus,
  ProprietaryIndex,
} from "./pack-types";

// Pack oficial + framework IVO + economia de gamificação — bundled estático.
// Mantém a regra arquitetural: engine/ apenas LÊ o pack; nada de lógica de domínio.
import enterprisePack from "@/domain/packs/enterprise/enterprise.pack.json";
import ivoFramework from "@/domain/packs/enterprise/ivo-framework.json";
import gamificationEconomy from "@/domain/packs/enterprise/gamification-economy.json";
import packSchema from "@/domain/packs/enterprise/domain-pack.schema.json";

interface PackContextValue {
  status: PackStatus;
  pack: DomainPack | null;
  index: ProprietaryIndex | null;
  gamification: GamificationEconomy | null;
  t: (token: string, fallback?: string) => string;
  hasRole: (roleId: string) => boolean;
  reload: () => void;
}

const PackContext = createContext<PackContextValue | null>(null);

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

function logValidation(pack: DomainPack, result: ValidationResult) {
  const tag = "[Pack:enterprise]";
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
  packId = "enterprise",
}: {
  children: ReactNode;
  packId?: string;
}) {
  const [status, setStatus] = useState<PackStatus>({ state: "idle" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setStatus({ state: "loading" });
    try {
      const pack = enterprisePack as unknown as DomainPack;
      const index = ivoFramework as unknown as ProprietaryIndex;
      const gamification = gamificationEconomy as unknown as GamificationEconomy;

      const validation = validatePack(pack);
      logValidation(pack, validation);

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
      console.error("[Pack:enterprise] erro de carregamento", err);
      setStatus({ state: "error", error });
    }
    // packId reservado para multi-pack futuro
  }, [packId, reloadKey]);

  const value = useMemo<PackContextValue>(() => {
    const pack = status.state === "ready" ? status.pack : null;
    const index = status.state === "ready" ? status.index : null;
    const gamification = status.state === "ready" ? status.gamification : null;
    return {
      status,
      pack,
      index,
      gamification,
      t: (token, fallback) => pack?.labels?.[token] ?? fallback ?? token,
      hasRole: (roleId) => Boolean(pack?.roles?.some((r) => r.id === roleId)),
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
