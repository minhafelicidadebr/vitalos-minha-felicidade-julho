// Papel da sessão → perspectiva do guia. Função pura, sem sessão, banco ou navegador:
// serve ao servidor (contexto de "Meu percurso") e às telas (orientação Q2) com o mesmo mapa.
import type { GuidePerspective } from "./guide-types";

const ROLE_PERSPECTIVE: Record<string, GuidePerspective> = {
  LIDER_EQUIPE: "lideranca",
  RH_ADMIN: "rh",
  DGP_RH: "rh",
  SST_PROFISSIONAL: "sst",
  SESMT_SAUDE: "sst",
  DIRETOR: "direcao",
  PLATFORM_ADMIN: "plataforma",
};

/** Papel desconhecido ou ausente cai em "colaborador", o perfil de menor alcance. */
export function perspectiveForRole(role: string | null | undefined): GuidePerspective {
  return (role ? ROLE_PERSPECTIVE[role] : undefined) ?? "colaborador";
}
