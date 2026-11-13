import { z } from "zod";

const session = z.string().min(10);
const token = z.string().regex(/^[a-f0-9]{64}$/);
export const firstAdminSchemas = {
  list: z.object({ accessToken: session }).strict(),
  issue: z.object({ accessToken: session, requestId: z.string().uuid(), organizationId: z.string().uuid(), email: z.string().trim().email().max(254), token }).strict(),
  revoke: z.object({ accessToken: session, inviteId: z.string().uuid() }).strict(),
  accept: z.object({ accessToken: session, token }).strict(),
};
export const FIRST_ADMIN_MESSAGES: Record<string, string> = {
  forbidden: "Esta operação exige autoridade da plataforma.",
  invalid_session: "Sua sessão expirou. Entre novamente.",
  invalid_invite: "Convite inválido ou indisponível.",
  identity_mismatch: "Este convite pertence a outra identidade. Entre com o e-mail destinatário.",
  unverified_identity: "Confirme seu e-mail antes de aceitar o convite.",
  expired: "O convite expirou. Solicite uma nova emissão.",
  revoked: "O convite foi revogado. Solicite uma nova emissão.",
  profile_conflict: "Sua conta já tem outro vínculo ou papel. O vínculo existente foi preservado.",
  admin_exists: "A empresa já possui administrador. Use a gestão de membros da organização.",
  pending_invite: "A empresa já possui convite pendente. Revogue-o antes de emitir outro.",
  request_conflict: "Este pedido já foi usado com outro conteúdo. Confira o convite emitido antes de iniciar outro pedido.",
  organization_unavailable: "Empresa inexistente ou fora do núcleo empresarial.",
  unavailable: "Não foi possível concluir a operação. Tente novamente com o mesmo pedido.",
};
export interface FirstAdminInviteView {
  id: string; organizationId: string; email: string; role: "RH_ADMIN";
  expiresAt: string; acceptedAt: string | null; revokedAt: string | null;
}
export interface FirstAdminOrganization { id: string; name: string; slug: string }
export type FirstAdminResult<T> = { ok: true; value: T } | { ok: false; reason: string; message: string };
