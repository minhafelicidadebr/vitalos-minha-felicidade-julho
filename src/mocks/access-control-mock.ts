import type { DomainPack, PackRole } from "@/engine/pack";
import {
  type AccessGrant,
  type AuthorizationReason,
  type IdentityContext,
  type ProtectedResource,
} from "@/engine/identity/authorization-engine";
import { canSeeNavItem, type NavItemDef } from "@/engine/rbac/rbac";

export const ACCESS_CONTROL_TODAY = "2026-06-18";

interface ScopeFixture {
  tenantId: string;
  holdingId: string;
  portfolioId: string;
  organizationId: string;
  teamId: string;
}

const FIXTURES: Record<string, ScopeFixture> = {
  enterprise: {
    tenantId: "tenant-vitalis",
    holdingId: "holding-grupo-vitalis",
    portfolioId: "portfolio-sudeste",
    organizationId: "org-vitalis",
    teamId: "team-produto",
  },
  school: {
    tenantId: "tenant-rede-aurora",
    holdingId: "network-aurora",
    portfolioId: "territory-centro",
    organizationId: "school-horizonte",
    teamId: "class-8a",
  },
};

export const AUTHORIZATION_REASON_COPY: Record<AuthorizationReason, string> = {
  allowed: "Acesso concedido pelo escopo e pela permissão.",
  anonymous: "Sem identidade autenticada.",
  invalid_identity: "Identidade incompleta; decisão fechada por segurança.",
  tenant_mismatch: "Outro tenant: isolamento obrigatório.",
  individual_response_read_forbidden: "Resposta individual nunca é liberada para leitura.",
  permission_missing: "O papel não recebeu esta permissão.",
  grant_expired: "A concessão temporária expirou.",
  domain_mismatch: "A concessão não inclui este domínio de dados.",
  scope_mismatch: "O recurso está fora do escopo atribuído.",
  read_only: "O papel possui acesso somente para leitura.",
};

export interface DemoAccessResource extends ProtectedResource {
  label: string;
  description: string;
}

export interface DemoAccessStory {
  identity: IdentityContext;
  role: PackRole | null;
  fixture: ScopeFixture;
  resources: DemoAccessResource[];
}

function roleCanSee(item: NavItemDef, roleId: string): boolean {
  return canSeeNavItem(item, roleId);
}

function fixtureFor(packId: string): ScopeFixture {
  return (
    FIXTURES[packId] ?? {
      tenantId: `tenant-${packId}`,
      holdingId: `holding-${packId}`,
      portfolioId: `portfolio-${packId}`,
      organizationId: `organization-${packId}`,
      teamId: `team-${packId}`,
    }
  );
}

function scopeRef(scope: string, subjectId: string, fixture: ScopeFixture): string {
  const refs: Record<string, string> = {
    platform: "*",
    holding: fixture.holdingId,
    portfolio: fixture.portfolioId,
    organization: fixture.organizationId,
    team: fixture.teamId,
    self: subjectId,
  };
  return refs[scope] ?? `${scope}-${fixture.organizationId}`;
}

export function buildDemoAccessStory(
  pack: DomainPack,
  packId: string,
  roleId: string,
): DemoAccessStory {
  const fixture = fixtureFor(packId);
  const role = pack.roles.find((candidate) => candidate.id === roleId) ?? null;
  const subjectId = `demo:${packId}:${roleId.toLowerCase()}`;
  const scope = role?.scope ?? "self";
  const navItems = (pack.navigation ?? []) as unknown as NavItemDef[];
  const visibleNav = navItems.filter((item) => roleCanSee(item, roleId));
  const hasDomainB = visibleNav.some((item) => item.domain === "B");
  const domains = role?.domain ? [role.domain] : hasDomainB ? ["A", "B"] : ["A"];
  const readOnly = Boolean(role?.readOnly);

  const grants: AccessGrant[] = [
    {
      roleId,
      tenantId: fixture.tenantId,
      permission: "profile.read",
      scope: { kind: "self", refId: subjectId },
      domains,
    },
    ...(!readOnly
      ? [
          {
            roleId,
            tenantId: fixture.tenantId,
            permission: "response.submit",
            scope: { kind: "self", refId: subjectId },
            domains,
          } satisfies AccessGrant,
        ]
      : []),
    ...(scope !== "self"
      ? [
          {
            roleId,
            tenantId: fixture.tenantId,
            permission: "aggregate.read",
            scope: { kind: scope, refId: scopeRef(scope, subjectId, fixture) },
            domains,
            readOnly,
          } satisfies AccessGrant,
        ]
      : []),
    ...visibleNav.map(
      (item): AccessGrant => ({
        roleId,
        tenantId: fixture.tenantId,
        permission: `nav:${item.id}:read`,
        scope: { kind: scope, refId: scopeRef(scope, subjectId, fixture) },
        domains: item.domain ? [item.domain] : domains,
        readOnly,
      }),
    ),
  ];

  const scopeRefs = {
    holding: fixture.holdingId,
    portfolio: fixture.portfolioId,
    organization: fixture.organizationId,
    team: fixture.teamId,
    self: subjectId,
  };

  const resources: DemoAccessResource[] = [
    {
      id: "own-profile",
      label: "Meu perfil",
      description: "Dado pessoal do próprio titular.",
      tenantId: fixture.tenantId,
      permission: "profile.read",
      action: "read",
      dataClass: "personal",
      ownerSubjectId: subjectId,
      scopeRefs,
    },
    {
      id: "own-scope-aggregate",
      label: "Agregado do meu escopo",
      description: "Visão coletiva limitada ao vínculo do papel ativo.",
      tenantId: fixture.tenantId,
      permission: "aggregate.read",
      action: "read",
      dataClass: "collective",
      domain: "A",
      scopeRefs,
    },
    {
      id: "other-tenant-aggregate",
      label: "Agregado de outro tenant",
      description: "Mesmo tipo de dado, pertencente a outra organização.",
      tenantId: `${fixture.tenantId}-other`,
      permission: "aggregate.read",
      action: "read",
      dataClass: "collective",
      domain: "A",
      scopeRefs,
    },
    {
      id: "individual-response",
      label: "Resposta individual",
      description: "Conteúdo bruto de uma resposta psicométrica.",
      tenantId: fixture.tenantId,
      permission: "profile.read",
      action: "read",
      dataClass: "individual_response",
      ownerSubjectId: subjectId,
      scopeRefs,
    },
    {
      id: "own-response-submit",
      label: "Enviar minha resposta",
      description: "Escrita cega: participa sem liberar leitura do conteúdo.",
      tenantId: fixture.tenantId,
      permission: "response.submit",
      action: "write",
      dataClass: "individual_response",
      ownerSubjectId: subjectId,
      scopeRefs,
    },
  ];

  const domainBNav = navItems.find((item) => item.domain === "B");
  if (domainBNav) {
    resources.push({
      id: "domain-b-dossier",
      label: domainBNav.label,
      description: "Recurso educativo separado do Domínio A.",
      tenantId: fixture.tenantId,
      permission: `nav:${domainBNav.id}:read`,
      action: "read",
      dataClass: "collective",
      domain: "B",
      scopeRefs,
    });
  }

  return {
    identity: {
      state: "authenticated",
      subjectId,
      activeTenantId: fixture.tenantId,
      grants,
      evaluatedOn: ACCESS_CONTROL_TODAY,
    },
    role,
    fixture,
    resources,
  };
}
