import { useState, useMemo } from "react";
import { buildDriverMindMap, type MindMapNode, type MindMapEdge } from "@/engine/nr1/mindmap-engine";
import type { CrosswalkRegistry, DimensionExposure } from "@/engine/nr1/crosswalk-engine";

interface Props {
  registry: CrosswalkRegistry;
  driverId: string;
  exposures?: DimensionExposure[];
  pillarLabels: Record<string, string>;
}

function curvePath(sx: number, sy: number, tx: number, ty: number): string {
  const dx = tx - sx;
  const dy = ty - sy;
  if (Math.abs(dx) > Math.abs(dy)) {
    return `M${sx},${sy} C${sx + dx * 0.35},${sy} ${tx - dx * 0.35},${ty} ${tx},${ty}`;
  }
  return `M${sx},${sy} C${sx},${sy + dy * 0.35} ${tx},${ty - dy * 0.35} ${tx},${ty}`;
}

function dimFill(n: MindMapNode): string {
  const s = n.strength ?? 0.5;
  if (n.instrument === "copsoq") {
    return `oklch(${(0.88 - s * 0.28).toFixed(2)} ${(0.04 + s * 0.16).toFixed(3)} 25)`;
  }
  return `oklch(${(0.88 - s * 0.23).toFixed(2)} ${(0.04 + s * 0.14).toFixed(3)} 155)`;
}

function edgeStroke(e: MindMapEdge, tgt: MindMapNode): string {
  if (e.priority) return PRIO_CLR[e.priority];
  if (tgt.instrument === "copsoq") return "oklch(0.72 0.08 25)";
  if (tgt.type === "pillar") return "oklch(0.72 0.04 155)";
  return "oklch(0.72 0.08 155)";
}

const PRIO_CLR: Record<string, string> = {
  P0: "oklch(0.63 0.22 25)",
  P1: "oklch(0.75 0.16 70)",
  P2: "oklch(0.72 0.14 230)",
};

const PRIO_BG: Record<string, string> = {
  P0: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  P1: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  P2: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
};

export function DriverMindMapSvg({ registry, driverId, exposures, pillarLabels }: Props) {
  const map = useMemo(
    () => buildDriverMindMap(registry, driverId, exposures),
    [registry, driverId, exposures],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  if (!map) return null;

  const selected = selectedId ? map.nodes.find((n) => n.id === selectedId) ?? null : null;
  const nodeMap = new Map(map.nodes.map((n) => [n.id, n]));
  const cx = map.viewBox.width / 2;

  return (
    <div>
      <svg
        viewBox={`0 0 ${map.viewBox.width} ${map.viewBox.height}`}
        className="w-full"
        role="img"
        aria-label={`Mapa mental do driver ${map.driverLabel}`}
      >
        {/* Group labels */}
        <text
          x={cx * 0.56}
          y={38}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          letterSpacing="0.1em"
          fill="currentColor"
          opacity={0.35}
        >
          COPSOQ II · RISCO
        </text>
        <text
          x={cx * 1.44}
          y={38}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          letterSpacing="0.1em"
          fill="currentColor"
          opacity={0.35}
        >
          FIB-T · ECOSSISTEMA
        </text>
        <text
          x={cx}
          y={map.viewBox.height - 12}
          textAnchor="middle"
          fontSize={9}
          fontWeight={600}
          letterSpacing="0.08em"
          fill="currentColor"
          opacity={0.3}
        >
          PILARES IVO · RECONCILIAÇÃO
        </text>

        {/* Edges */}
        {map.edges.map((e) => {
          const src = nodeMap.get(e.sourceId)!;
          const tgt = nodeMap.get(e.targetId)!;
          return (
            <path
              key={`${e.sourceId}-${e.targetId}`}
              d={curvePath(src.x, src.y, tgt.x, tgt.y)}
              fill="none"
              stroke={edgeStroke(e, tgt)}
              strokeWidth={1 + e.strength * 2.5}
              strokeOpacity={0.3 + e.strength * 0.4}
            />
          );
        })}

        {/* Dimension nodes */}
        {map.nodes
          .filter((n) => n.type === "dimension")
          .map((node) => {
            const isLeft = node.x < cx;
            const isSelected = selectedId === node.id;
            const isFocused = focusedId === node.id;
            const toggle = () => setSelectedId(isSelected ? null : node.id);
            return (
              <g
                key={node.id}
                className="cursor-pointer outline-none"
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                    // Espaço rola a página por padrão em elementos focáveis — nunca aqui.
                    e.preventDefault();
                    toggle();
                  }
                }}
                onFocus={() => setFocusedId(node.id)}
                onBlur={() => setFocusedId((current) => (current === node.id ? null : current))}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${node.label}: força ${Math.round((node.strength ?? 0) * 100)}%`}
              >
                {isFocused && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size + 4}
                    fill="none"
                    stroke="oklch(0.55 0.2 250)"
                    strokeWidth={2}
                    strokeDasharray="2 2"
                    data-testid="focus-ring"
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size}
                  fill={dimFill(node)}
                  stroke={isSelected ? "oklch(0.45 0.18 155)" : "none"}
                  strokeWidth={2}
                />
                {node.priority && (
                  <circle
                    cx={node.x + (isLeft ? node.size + 5 : -node.size - 5)}
                    cy={node.y - node.size + 2}
                    r={4.5}
                    fill={PRIO_CLR[node.priority]}
                  />
                )}
                {node.exposure !== undefined && (
                  <>
                    <rect
                      x={node.x - node.size}
                      y={node.y + node.size + 4}
                      width={node.size * 2}
                      height={3}
                      rx={1.5}
                      fill="currentColor"
                      opacity={0.08}
                    />
                    <rect
                      x={node.x - node.size}
                      y={node.y + node.size + 4}
                      width={node.size * 2 * (node.exposure / 100)}
                      height={3}
                      rx={1.5}
                      fill={
                        node.exposure >= 60
                          ? "oklch(0.65 0.2 25)"
                          : node.exposure >= 34
                            ? "oklch(0.75 0.15 70)"
                            : "oklch(0.7 0.15 155)"
                      }
                    />
                  </>
                )}
                <text
                  x={isLeft ? node.x - node.size - 7 : node.x + node.size + 7}
                  y={node.y + 4}
                  textAnchor={isLeft ? "end" : "start"}
                  fontSize={11}
                  fill="currentColor"
                  opacity={0.75}
                >
                  {node.label}
                </text>
              </g>
            );
          })}

        {/* Pillar nodes */}
        {map.nodes
          .filter((n) => n.type === "pillar")
          .map((node) => (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={node.size} fill="currentColor" opacity={0.1} />
              <text
                x={node.x}
                y={node.y + node.size + 14}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                opacity={0.5}
              >
                {pillarLabels[node.label] ?? node.label}
              </text>
            </g>
          ))}

        {/* Center driver node */}
        {map.nodes
          .filter((n) => n.type === "driver")
          .map((node) => (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={node.size} fill="oklch(0.35 0.08 155)" />
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size - 3}
                fill="none"
                stroke="oklch(0.55 0.1 155)"
                strokeWidth={1}
                opacity={0.5}
              />
              <text
                x={node.x}
                y={node.y - node.size - 10}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill="currentColor"
              >
                {node.label}
              </text>
            </g>
          ))}
      </svg>

      {/* Detail panel */}
      {selected && selected.type === "dimension" && (
        <div className="mt-3 rounded-2xl border border-border/60 bg-card/80 p-4 text-sm animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{selected.label}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {selected.instrument === "copsoq" ? "COPSOQ II" : "FIB-T"} ·{" "}
              {Math.round((selected.strength ?? 0) * 100)}%
            </span>
            {selected.priority && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${PRIO_BG[selected.priority]}`}
              >
                {selected.priority}
                {selected.critical ? " · crítico" : ""}
              </span>
            )}
            {selected.exposure !== undefined && (
              <span className="text-[10px] text-muted-foreground">
                Exposição: {selected.exposure}/100
              </span>
            )}
          </div>
          {selected.contextNote && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {selected.contextNote}
            </p>
          )}
          {selected.hypothesis && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {selected.hypothesis}
            </p>
          )}
          {(selected.interventionId || selected.evidence) && (
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {selected.interventionId && (
                <span>
                  Intervenção:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                    {selected.interventionId}
                  </code>
                </span>
              )}
              {selected.evidence && <span className="italic">Fonte: {selected.evidence}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
