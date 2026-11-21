import { describe, expect, test } from "bun:test";
import { assertHmlDeploymentRequestAllowed } from "@/lib/fibt-hml/hml-deployment-boundary.server";

// Generalizar o produto não alarga o ambiente HML: as rotas e server functions
// IVO ficam FORA da allowlist e respondem 404 no deployment HML. A allowlist
// existente (incluindo /fibt-piloto) continua exatamente como estava.

const HML = { FIBT_HML_DEPLOYMENT_ENABLED: "true" };
const IVO_SERVER_FUNCTIONS = [
  { filename: "src/lib/api/ivo-q2-reading.functions.ts", name: "loadIvoQ2Reading" },
  { filename: "src/lib/api/ivo-action-loop.functions.ts", name: "loadFibtActionLoopFn" },
  { filename: "src/lib/api/ivo-action-loop.functions.ts", name: "createFibtPriorityActionsFn" },
  { filename: "src/lib/api/ivo-action-loop.functions.ts", name: "setFibtActionAccountabilityFn" },
  { filename: "src/lib/api/ivo-action-loop.functions.ts", name: "activateFibtActionPlanFn" },
  { filename: "src/lib/api/ivo-action-loop.functions.ts", name: "recordFibtActionStatusFn" },
  { filename: "src/lib/api/ivo-action-loop.functions.ts", name: "recordFibtActionEvidenceFn" },
];

describe("experiência IVO fora do deployment HML", () => {
  test("páginas IVO respondem 404 no HML", () => {
    for (const pathname of ["/ivo-integral", "/ivo-integral/", "/ivo-integral/q2", "/ivo-integral/acoes"]) {
      expect(assertHmlDeploymentRequestAllowed({ pathname, method: "GET", env: HML })).toEqual({
        allowed: false,
        status: 404,
        reason: "HML_ROUTE_NOT_ALLOWLISTED",
      });
    }
  });

  test("server functions IVO respondem 404 no HML", () => {
    for (const serverFnMeta of IVO_SERVER_FUNCTIONS) {
      expect(
        assertHmlDeploymentRequestAllowed({
          pathname: `/_serverFn/${"a".repeat(64)}`,
          method: "POST",
          serverFnMeta,
          env: HML,
        }),
      ).toMatchObject({ allowed: false, status: 404 });
    }
  });

  test("a allowlist HML existente continua intacta", () => {
    expect(assertHmlDeploymentRequestAllowed({ pathname: "/fibt-piloto", method: "GET", env: HML })).toEqual({ allowed: true });
    expect(
      assertHmlDeploymentRequestAllowed({
        pathname: `/_serverFn/${"b".repeat(64)}`,
        method: "GET",
        serverFnMeta: { filename: "src/lib/api/fibt-manager-control-center.functions.ts", name: "loadFibtManagerControlCenter" },
        env: HML,
      }),
    ).toEqual({ allowed: true });
  });

  test("fora do HML (modo comum) as rotas IVO seguem o fluxo normal", () => {
    expect(assertHmlDeploymentRequestAllowed({ pathname: "/ivo-integral/q2", method: "GET", env: {} })).toEqual({ allowed: true });
  });
});
