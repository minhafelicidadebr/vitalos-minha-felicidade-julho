// Mapa Mental do Driver — engine PURO de layout radial. Compõe driverProfile() (existente) →
// grafo posicionado para renderização SVG. Sem React, sem DOM, determinístico.
//
// Layout: driver ao centro, COPSOQ (risco) no hemisfério esquerdo, FIB-T (ecossistema) no
// direito, pilares IVO reconciliados embaixo. Posição é math pura (ângulos + raio); o
// componente só mapeia nós → SVG. Engine ≠ Domínio: recebe o registro como parâmetro.

import type {
  CrosswalkRegistry,
  DimensionExposure,
  Instrument,
  MeteAxis,
  Priority,
} from "./crosswalk-engine";
import { driverProfile } from "./crosswalk-engine";

export interface MindMapNode {
  id: string;
  type: "driver" | "dimension" | "pillar";
  label: string;
  x: number;
  y: number;
  size: number;
  instrument?: Instrument;
  strength?: number;
  priority?: Priority;
  critical?: boolean;
  exposure?: number;
  hypothesis?: string;
  evidence?: string;
  interventionId?: string;
  contextNote?: string;
}

export interface MindMapEdge {
  sourceId: string;
  targetId: string;
  strength: number;
  priority?: Priority;
  critical?: boolean;
}

export interface DriverMindMap {
  driverId: string;
  driverLabel: string;
  macroLayer: string;
  meteAxis: MeteAxis;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  viewBox: { width: number; height: number };
}

const VB = { width: 900, height: 520 } as const;
const CX = 450;
const CY = 230;
const LEAF_R = 200;
const PILLAR_R = 140;
const COPSOQ_ARC = { start: 140, end: 220 };
const FIBT_ARC = { start: 40, end: -40 };
const PILLAR_ARC = { start: -55, end: -125 };

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function nodeXY(deg: number, r: number): { x: number; y: number } {
  return {
    x: Math.round((CX + r * Math.cos(toRad(deg))) * 10) / 10,
    y: Math.round((CY - r * Math.sin(toRad(deg))) * 10) / 10,
  };
}

function fanAngles(count: number, arc: { start: number; end: number }): number[] {
  if (count === 0) return [];
  if (count === 1) return [(arc.start + arc.end) / 2];
  return Array.from(
    { length: count },
    (_, i) => arc.start + ((arc.end - arc.start) * i) / (count - 1),
  );
}

export function buildDriverMindMap(
  registry: CrosswalkRegistry,
  driverId: string,
  exposures?: DimensionExposure[],
): DriverMindMap | null {
  const profile = driverProfile(registry, driverId, exposures);
  if (!profile) return null;

  const { driver, copsoq, fibt, signals } = profile;
  const expMap = new Map(
    (exposures ?? []).filter((e) => e.visible !== false).map((e) => [e.dimensionId, e.load]),
  );
  const sigMap = new Map(signals.map((s) => [s.dimensionId, s]));

  const nodes: MindMapNode[] = [];
  const edges: MindMapEdge[] = [];

  nodes.push({
    id: `driver_${driver.id}`,
    type: "driver",
    label: driver.label,
    x: CX,
    y: CY,
    size: 28,
  });

  const cAngles = fanAngles(copsoq.length, COPSOQ_ARC);
  for (let i = 0; i < copsoq.length; i++) {
    const { dimension, cell } = copsoq[i];
    const { x, y } = nodeXY(cAngles[i], LEAF_R);
    const sig = sigMap.get(dimension.id);
    nodes.push({
      id: `dim_${dimension.id}`,
      type: "dimension",
      label: dimension.label,
      x,
      y,
      size: 10 + Math.round(cell.strength * 10),
      instrument: "copsoq",
      strength: cell.strength,
      priority: sig?.priority,
      critical: sig?.critical,
      exposure: expMap.get(dimension.id),
      hypothesis: cell.hypothesis,
      evidence: cell.evidence,
      interventionId: cell.interventionId,
      contextNote: dimension.contextNote,
    });
    edges.push({
      sourceId: `driver_${driver.id}`,
      targetId: `dim_${dimension.id}`,
      strength: cell.strength,
      priority: sig?.priority,
      critical: sig?.critical,
    });
  }

  const fAngles = fanAngles(fibt.length, FIBT_ARC);
  for (let i = 0; i < fibt.length; i++) {
    const { dimension, cell } = fibt[i];
    const { x, y } = nodeXY(fAngles[i], LEAF_R);
    nodes.push({
      id: `dim_${dimension.id}`,
      type: "dimension",
      label: dimension.label,
      x,
      y,
      size: 10 + Math.round(cell.strength * 10),
      instrument: "fibt",
      strength: cell.strength,
      contextNote: dimension.contextNote,
    });
    edges.push({
      sourceId: `driver_${driver.id}`,
      targetId: `dim_${dimension.id}`,
      strength: cell.strength,
    });
  }

  const pAngles = fanAngles(driver.pillarIds.length, PILLAR_ARC);
  for (let i = 0; i < driver.pillarIds.length; i++) {
    const pid = driver.pillarIds[i];
    const { x, y } = nodeXY(pAngles[i], PILLAR_R);
    nodes.push({
      id: `pillar_${pid}`,
      type: "pillar",
      label: pid,
      x,
      y,
      size: 8,
    });
    edges.push({
      sourceId: `driver_${driver.id}`,
      targetId: `pillar_${pid}`,
      strength: 0.5,
    });
  }

  return {
    driverId: driver.id,
    driverLabel: driver.label,
    macroLayer: driver.macroLayer,
    meteAxis: driver.meteAxis,
    nodes,
    edges,
    viewBox: VB,
  };
}
