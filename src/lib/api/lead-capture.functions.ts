import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const leadSubmitSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  role: z.string().max(200).default(""),
  email: z.string().min(1).max(200),
  whatsapp: z.string().max(200).default(""),
  interest: z.string().min(1).max(200),
  sourcePage: z.string().min(1).max(200),
  consent: z.boolean(),
  consentVersion: z.string().min(1).max(20),
  utm: z.object({
    source: z.string().nullable(),
    medium: z.string().nullable(),
    campaign: z.string().nullable(),
    term: z.string().nullable(),
    content: z.string().nullable(),
  }),
});

/** Submissão pública do formulário executivo — visitante anônimo, sem sessão. */
export const submitLeadForm = createServerFn({ method: "POST" })
  .inputValidator(leadSubmitSchema)
  .handler(async ({ data }) => {
    const { submitLead } = await import("@/lib/growth/lead-capture.server");
    return submitLead(
      {
        name: data.name,
        company: data.company,
        role: data.role,
        email: data.email,
        whatsapp: data.whatsapp,
        interest: data.interest,
        sourcePage: data.sourcePage,
        consent: data.consent,
        consentVersion: data.consentVersion,
      },
      data.utm,
    );
  });

/** Últimos leads — só para o admin da plataforma (mesma allowlist de /plataforma). */
export const adminListLeads = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accessToken: z.string().min(10) }))
  .handler(async ({ data }) => {
    const { verifyPlatformAdmin } = await import("@/lib/api/org-invite.server");
    const auth = await verifyPlatformAdmin(data.accessToken);
    if (!auth.authorized) return { leads: [] };

    const { listLeads } = await import("@/lib/growth/lead-capture.server");
    return { leads: await listLeads() };
  });

/** Saúde das contas (Customer Health v1, E4) — só admin da plataforma. */
export const adminListAccountHealth = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accessToken: z.string().min(10) }))
  .handler(async ({ data }) => {
    const { verifyPlatformAdmin } = await import("@/lib/api/org-invite.server");
    const auth = await verifyPlatformAdmin(data.accessToken);
    if (!auth.authorized) return { accounts: [] };

    const { listAccountHealth } = await import("@/lib/growth/customer-health.server");
    return { accounts: await listAccountHealth() };
  });
