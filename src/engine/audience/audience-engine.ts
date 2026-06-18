/**
 * Audience policy engine — resolves capabilities from injected role policies.
 *
 * The engine knows nothing about sectors, role names, routes or copy. When a
 * role is missing or ambiguously configured, it fails closed to the supplied
 * fallback policy instead of granting the first matching capability set.
 */

export interface AudiencePolicy<Capability extends string = string> {
  id: string;
  roleIds: readonly string[];
  capabilities: readonly Capability[];
}

export type AudienceResolutionReason = "matched" | "missing_role" | "ambiguous_role";

export interface AudienceResolution<Policy extends AudiencePolicy> {
  policy: Policy;
  reason: AudienceResolutionReason;
  matchedRoleId: string;
}

export interface AudiencePolicyAudit {
  valid: boolean;
  duplicateRoleIds: string[];
  missingRoleIds: string[];
  emptyPolicyIds: string[];
}

/**
 * Resolves exactly one policy for a role. Missing or duplicate mappings use
 * the least-privileged fallback supplied by the domain.
 */
export function resolveAudiencePolicy<Policy extends AudiencePolicy>(
  policies: readonly Policy[],
  roleId: string,
  fallback: Policy,
): AudienceResolution<Policy> {
  const matches = policies.filter((policy) => policy.roleIds.includes(roleId));

  if (matches.length === 1) {
    return { policy: matches[0]!, reason: "matched", matchedRoleId: roleId };
  }

  return {
    policy: fallback,
    reason: matches.length === 0 ? "missing_role" : "ambiguous_role",
    matchedRoleId: roleId,
  };
}

export function hasAudienceCapability<Capability extends string>(
  policy: AudiencePolicy<Capability>,
  capability: Capability,
): boolean {
  return policy.capabilities.includes(capability);
}

/** Audits policy coverage so configuration drift is caught before runtime. */
export function auditAudiencePolicies(
  policies: readonly AudiencePolicy[],
  expectedRoleIds: readonly string[],
): AudiencePolicyAudit {
  const roleCount = new Map<string, number>();

  for (const policy of policies) {
    for (const roleId of policy.roleIds) {
      roleCount.set(roleId, (roleCount.get(roleId) ?? 0) + 1);
    }
  }

  const duplicateRoleIds = [...roleCount.entries()]
    .filter(([, count]) => count > 1)
    .map(([roleId]) => roleId)
    .sort();
  const missingRoleIds = expectedRoleIds
    .filter((roleId) => !roleCount.has(roleId))
    .filter((roleId, index, all) => all.indexOf(roleId) === index)
    .sort();
  const emptyPolicyIds = policies
    .filter((policy) => policy.id.trim().length === 0 || policy.roleIds.length === 0)
    .map((policy) => policy.id)
    .sort();

  return {
    valid:
      duplicateRoleIds.length === 0 && missingRoleIds.length === 0 && emptyPolicyIds.length === 0,
    duplicateRoleIds,
    missingRoleIds,
    emptyPolicyIds,
  };
}
