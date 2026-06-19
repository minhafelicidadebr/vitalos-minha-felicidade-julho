import {
  authorizeResource,
  type AuthorizationReason,
  type IdentityContext,
  type ProtectedResource,
} from "../identity/authorization-engine";
import {
  planResponsePersistence,
  type CommittedSubmission,
  type PersistenceEnvelope,
  type PersistencePlanReason,
  type PersistenceSession,
} from "../persistence/response-persistence-engine";

export type IsolationCategory =
  | "tenant"
  | "scope"
  | "domain"
  | "data_class"
  | "grant_lifecycle"
  | "blind_write"
  | "idempotency";

interface IsolationScenarioBase {
  id: string;
  label: string;
  category: IsolationCategory;
}

export interface AuthorizationIsolationScenario extends IsolationScenarioBase {
  kind: "authorization";
  identity: IdentityContext;
  resource: ProtectedResource;
  expectedReason: AuthorizationReason;
}

export interface PersistenceIsolationScenario extends IsolationScenarioBase {
  kind: "persistence";
  session: PersistenceSession;
  envelope: PersistenceEnvelope;
  existing: CommittedSubmission | null;
  expectedReason: PersistencePlanReason;
}

export type IsolationScenario = AuthorizationIsolationScenario | PersistenceIsolationScenario;

export interface IsolationCaseResult {
  id: string;
  label: string;
  category: IsolationCategory;
  expectedReason: string;
  actualReason: string;
  passed: boolean;
}

export interface IsolationCategoryResult {
  category: IsolationCategory;
  caseCount: number;
  passedCaseCount: number;
  passed: boolean;
}

export interface IsolationAuditResult {
  status: "verified" | "failed";
  caseCount: number;
  passedCaseCount: number;
  categories: IsolationCategoryResult[];
  cases: IsolationCaseResult[];
}

function evaluateScenario(scenario: IsolationScenario): IsolationCaseResult {
  const actualReason =
    scenario.kind === "authorization"
      ? authorizeResource(scenario.identity, scenario.resource).reason
      : planResponsePersistence(scenario.session, scenario.envelope, scenario.existing).reason;

  return {
    id: scenario.id,
    label: scenario.label,
    category: scenario.category,
    expectedReason: scenario.expectedReason,
    actualReason,
    passed: actualReason === scenario.expectedReason,
  };
}

/** Executes synthetic attacks without retaining identity or resource payloads. */
export function runIsolationAudit(scenarios: readonly IsolationScenario[]): IsolationAuditResult {
  const cases = scenarios.map(evaluateScenario);
  const categoryIds = [...new Set(cases.map((item) => item.category))];
  const categories = categoryIds.map((category) => {
    const categoryCases = cases.filter((item) => item.category === category);
    const passedCaseCount = categoryCases.filter((item) => item.passed).length;
    return {
      category,
      caseCount: categoryCases.length,
      passedCaseCount,
      passed: passedCaseCount === categoryCases.length,
    };
  });
  const passedCaseCount = cases.filter((item) => item.passed).length;

  return {
    status: passedCaseCount === cases.length && cases.length > 0 ? "verified" : "failed",
    caseCount: cases.length,
    passedCaseCount,
    categories,
    cases,
  };
}
