// Culture Lab — engine types. Protocol content lives in mocks/domain.

export interface ProtocolDef {
  id: string;
  name: string;
  targetPillarId: string;
  targetPillarName: string;
  durationWeeks: number;
  expectedEffect: string; // e.g. "+8 a +15 pts"
  minTeamSize: number;
  scientificBasis: string;
  steps: string[];
}

export type ExperimentStatus = "rodando" | "concluído" | "planejado";

export interface ExperimentResult {
  before: number;
  after: number;
  comparisonDelta: number; // delta in non-pilot teams over same window
  n: number;
  confidenceNote: string;
}

export interface Experiment {
  id: string;
  protocolId: string;
  protocolName: string;
  pilotTeams: string[];
  startedLabel: string;
  weeksElapsed: number;
  durationWeeks: number;
  status: ExperimentStatus;
  result?: ExperimentResult;
}
