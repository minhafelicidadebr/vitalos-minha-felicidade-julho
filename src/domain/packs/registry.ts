// Registro de Domain Packs — a fonte ÚNICA de quais setores existem e como o
// PackProvider os resolve em runtime. Adicionar um setor = registrar um pack aqui,
// sem tocar no Engine. Isto torna real a opcionalidade multissetorial provada em
// `/setores` e `multipack.test.ts`: o mesmo motor, qualquer pack.
//
// Camadas: este arquivo vive em domain/ (é configuração de domínio). O Engine
// (PackProvider) LÊ o registro — nunca o contrário. Engine ≠ Domínio preservado.

import type { DomainPack, GamificationEconomy, ProprietaryIndex } from "@/engine/pack/pack-types";

import enterprisePack from "./enterprise/enterprise.pack.json";
import enterpriseIndex from "./enterprise/ivo-framework.json";
import enterpriseGamification from "./enterprise/gamification-economy.json";

import schoolPack from "./school/school.pack.json";
import schoolIndex from "./school/iev-framework.json";

export interface PackBundle {
  /** Vocabulário institucional usado no switcher (não vem do JSON do pack). */
  sectorLabel: string;
  /** Ícone semântico (lucide id) para o switcher. */
  sectorIcon: "building-2" | "graduation-cap";
  pack: DomainPack;
  index: ProprietaryIndex | null;
  gamification: GamificationEconomy | null;
}

// Ordem de registro = ordem de exibição no switcher. Enterprise é o pack default.
export const PACK_REGISTRY: Record<string, PackBundle> = {
  enterprise: {
    sectorLabel: "Empresa",
    sectorIcon: "building-2",
    pack: enterprisePack as unknown as DomainPack,
    index: enterpriseIndex as unknown as ProprietaryIndex,
    gamification: enterpriseGamification as unknown as GamificationEconomy,
  },
  school: {
    sectorLabel: "Escola",
    sectorIcon: "graduation-cap",
    pack: schoolPack as unknown as DomainPack,
    index: schoolIndex as unknown as ProprietaryIndex,
    gamification: null,
  },
};

export const DEFAULT_PACK_ID = "enterprise";

export const REGISTERED_PACK_IDS = Object.keys(PACK_REGISTRY);

/** Resolve um pack registrado, caindo para o default quando o id é desconhecido. */
export function resolvePackBundle(packId: string): PackBundle {
  return PACK_REGISTRY[packId] ?? PACK_REGISTRY[DEFAULT_PACK_ID]!;
}

/** Metadados leves para a UI do switcher, sem expor o JSON inteiro. */
export interface PackChoice {
  id: string;
  sectorLabel: string;
  sectorIcon: PackBundle["sectorIcon"];
  packName: string;
  /** Frase-promessa curta do setor (vem de pack.promise). */
  promise: string;
  indexLabel: string;
  accent: string;
  /** Papel default ao ativar o setor (mantém a navegação coerente). */
  defaultRole: string;
}

export const PACK_CHOICES: PackChoice[] = REGISTERED_PACK_IDS.map((id) => {
  const b = PACK_REGISTRY[id]!;
  const branding = b.pack.branding as { accent?: string } | undefined;
  const defaultRole =
    (b.pack.defaultRole as string | undefined) ?? b.pack.roles?.[0]?.id ?? "COLABORADOR";
  return {
    id,
    sectorLabel: b.sectorLabel,
    sectorIcon: b.sectorIcon,
    packName: b.pack.packName,
    promise: (b.pack.promise as string | undefined) ?? "",
    indexLabel: (b.pack.labels?.index as string) ?? "—",
    accent: branding?.accent ?? "#C9A227",
    defaultRole,
  };
});
