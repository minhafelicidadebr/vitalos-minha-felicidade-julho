// Trust Ledger — engine types. Sector-agnostic: labels come from callers.

export interface VisibilityRule {
  audienceId: string;
  audienceLabel: string;
  canSee: string[];
  cannotSee: string[];
}

export interface ConsentItem {
  id: string;
  label: string;
  description: string;
  granted: boolean;
  policyVersion: string;
  required?: boolean; // required consents cannot be toggled off (e.g., aggregate IVO)
}

export interface DataRight {
  id: "export" | "delete" | "review";
  label: string;
  description: string;
}
