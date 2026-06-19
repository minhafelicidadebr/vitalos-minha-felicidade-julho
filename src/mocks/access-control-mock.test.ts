import { describe, expect, test } from "bun:test";
import { authorizeResources } from "@/engine/identity/authorization-engine";
import enterprisePack from "@/domain/packs/enterprise/enterprise.pack.json";
import schoolPack from "@/domain/packs/school/school.pack.json";
import type { DomainPack } from "@/engine/pack";
import { buildDemoAccessStory } from "./access-control-mock";

function decisions(pack: DomainPack, packId: string, roleId: string) {
  const story = buildDemoAccessStory(pack, packId, roleId);
  return new Map(
    authorizeResources(story.identity, story.resources).map((decision) => [
      decision.resourceId,
      decision,
    ]),
  );
}

describe("access control mock — enterprise", () => {
  const pack = enterprisePack as unknown as DomainPack;

  test("collaborator can act on self but cannot read aggregates or raw responses", () => {
    const result = decisions(pack, "enterprise", "COLABORADOR");

    expect(result.get("own-profile")?.allowed).toBe(true);
    expect(result.get("own-response-submit")?.allowed).toBe(true);
    expect(result.get("own-scope-aggregate")?.reason).toBe("permission_missing");
    expect(result.get("individual-response")?.reason).toBe("individual_response_read_forbidden");
    expect(result.get("domain-b-dossier")?.allowed).toBe(false);
  });

  test("RH receives organization aggregate and explicit Domain B access", () => {
    const result = decisions(pack, "enterprise", "RH_ADMIN");

    expect(result.get("own-scope-aggregate")?.allowed).toBe(true);
    expect(result.get("domain-b-dossier")?.allowed).toBe(true);
    expect(result.get("other-tenant-aggregate")?.reason).toBe("tenant_mismatch");
  });

  test("read-only executive cannot submit a response", () => {
    const result = decisions(pack, "enterprise", "C_LEVEL");

    expect(result.get("own-scope-aggregate")?.allowed).toBe(true);
    expect(result.get("own-response-submit")?.allowed).toBe(false);
  });
});

describe("access control mock — school", () => {
  const pack = schoolPack as unknown as DomainPack;

  test("student remains self-scoped", () => {
    const result = decisions(pack, "school", "ESTUDANTE");

    expect(result.get("own-profile")?.allowed).toBe(true);
    expect(result.get("own-scope-aggregate")?.allowed).toBe(false);
    expect(result.has("domain-b-dossier")).toBe(false);
  });

  test("educator receives only the bound class aggregate", () => {
    const result = decisions(pack, "school", "EDUCADOR");

    expect(result.get("own-scope-aggregate")?.allowed).toBe(true);
    expect(result.get("other-tenant-aggregate")?.allowed).toBe(false);
  });
});
