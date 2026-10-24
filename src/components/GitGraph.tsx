"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { GraphEdge, GraphLane, GraphNode, GraphScene, NodeState } from "@/lib/types";

const STEP_MS = 500;
const LANE_GAP = 64;
const PAD_TOP = 40; // room for the top lane's pill
const PAD_BOTTOM = 28; // room for node labels under main
const PAD_LEFT = 20;
const PAD_RIGHT = 36;
const MIN_SLOT = 32;
const MAX_SLOT = 72;
const LABEL_MIN_SLOT = 52; // below this, only conflict and warning nodes keep their label
const R = 7; // 14px ring

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(REDUCED_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

const STATE_WORD: Record<NodeState, string> = {
  commit: "Commit",
  future: "Planned work",
  merge: "Merge",
  conflict: "Conflict",
  warning: "Warning",
  ghost: "Lost commit",
  unknown: "Possible unpushed work",
};

type Props = {
  scene: GraphScene;
  /** Person.id to colorIndex (0..4). Branch lanes take their owner's graph colour. */
  colorByPerson?: Record<string, number>;
  /** Makes conflict nodes clickable, for example to show the clashing lines. */
  onConflictClick?: () => void;
};

export default function GitGraph({ scene, colorByPerson, onConflictClick }: Props) {
  const descId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [step, setStep] = useState(-1); // -1 means not started yet
  const [run, setRun] = useState(0); // bumped by Replay, restarts the timer and the CSS animations
  const reduced = usePrefersReducedMotion();

  // Measure the container so text stays at its real size from 360px to 700px.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Start playing once, when the scene first scrolls into view.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStep(0);
          setRun((r) => r + 1);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Advance one step every 500ms. No looping.
  useEffect(() => {
    if (run === 0 || reduced) return;
    let s = 0;
    const id = setInterval(() => {
      s += 1;
      setStep(s);
      if (s >= scene.steps) clearInterval(id);
    }, STEP_MS);
    return () => clearInterval(id);
  }, [run, reduced, scene.steps]);

  const current = reduced ? scene.steps : step;

  // Layout: branch lanes stacked on top in the given order, main at the bottom.
  const branches = scene.lanes.filter((l) => l.kind === "branch");
  const ordered = [...branches, ...scene.lanes.filter((l) => l.kind === "main")];
  const laneY = new Map(ordered.map((l, i) => [l.id, PAD_TOP + i * LANE_GAP]));
  const laneById = new Map(scene.lanes.map((l) => [l.id, l]));

  const laneColor = (lane: GraphLane | undefined) => {
    if (!lane || lane.kind === "main") return "var(--g-main)";
    const fromPerson = lane.personId ? colorByPerson?.[lane.personId] : undefined;
    const idx = fromPerson ?? branches.indexOf(lane);
    return `var(--g${Math.max(0, idx) % 5})`;
  };

  const maxSlot = Math.max(1, ...scene.nodes.map((n) => n.slot));
  const slotW = Math.min(MAX_SLOT, Math.max(MIN_SLOT, (width - PAD_LEFT - PAD_RIGHT) / maxSlot));
  const svgW = PAD_LEFT + maxSlot * slotW + PAD_RIGHT;
  const svgH = PAD_TOP + (ordered.length - 1) * LANE_GAP + PAD_BOTTOM;
  const showAllLabels = slotW >= LABEL_MIN_SLOT;

  const nodeById = new Map(scene.nodes.map((n) => [n.id, n]));
  const pos = (n: GraphNode) => ({ x: PAD_LEFT + n.slot * slotW, y: laneY.get(n.lane) ?? PAD_TOP });

  const edgePath = (e: GraphEdge) => {
    const a = nodeById.get(e.from);
    const b = nodeById.get(e.to);
    if (!a || !b) return null;
    const p = pos(a);
    const q = pos(b);
    if (p.y === q.y) return `M ${p.x} ${p.y} L ${q.x} ${q.y}`;
    // Curve over one slot only, like git-flow diagrams: a merge into main runs
    // flat and bends at the end; a branch-off bends at the start and runs flat.
    const w = Math.min(slotW, q.x - p.x);
    if (laneById.get(b.lane)?.kind === "main") {
      const sx = q.x - w;
      return `M ${p.x} ${p.y} L ${sx} ${p.y} C ${sx + w / 2} ${p.y}, ${sx + w / 2} ${q.y}, ${q.x} ${q.y}`;
    }
    const ex = p.x + w;
    return `M ${p.x} ${p.y} C ${p.x + w / 2} ${p.y}, ${p.x + w / 2} ${q.y}, ${ex} ${q.y} L ${q.x} ${q.y}`;
  };

  const edgeColor = (e: GraphEdge) => {
    if (e.state === "danger") return "var(--danger)";
    if (e.state === "dashed") return "var(--border-strong)";
    const a = laneById.get(nodeById.get(e.from)?.lane ?? "");
    const b = laneById.get(nodeById.get(e.to)?.lane ?? "");
    return laneColor(a?.kind === "branch" ? a : b);
  };

  // Plain-text description, in the order things happen, for screen readers.
  const description: string[] = [];
  for (let s = 0; s <= scene.steps; s++) {
    for (const n of scene.nodes.filter((x) => x.step === s)) {
      const lane = laneById.get(n.lane)?.label ?? n.lane;
      description.push(`${STATE_WORD[n.state]} on ${lane}${n.label ? `: ${n.label}` : ""}.`);
    }
    for (const e of scene.edges.filter((x) => x.step === s && x.state === "danger")) {
      const from = laneById.get(nodeById.get(e.from)?.lane ?? "")?.label ?? e.from;
      const to = laneById.get(nodeById.get(e.to)?.lane ?? "")?.label ?? e.to;
      description.push(`Merging ${from} into ${to} conflicts.`);
    }
  }

  return (
    <figure className="w-full max-w-[700px]">
      <div ref={wrapRef} className="w-full">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          role="img"
          aria-label={scene.caption}
          aria-describedby={descId}
          className="block max-w-full"
        >
          <g key={run}>
            {/* Lanes: a faint guide line and a pill with the branch name. */}
            {ordered.map((lane) => {
              const xs = scene.nodes.filter((n) => n.lane === lane.id).map((n) => pos(n).x);
              if (xs.length === 0) return null;
              const y = laneY.get(lane.id) ?? PAD_TOP;
              const x0 = Math.min(...xs);
              const x1 = Math.max(...xs);
              const pillW = lane.label.length * 7.2 + 14;
              const shown = current >= 0;
              return (
                <g key={lane.id}>
                  {x1 > x0 && (
                    <path
                      d={`M ${x0} ${y} L ${x1} ${y}`}
                      pathLength={1}
                      className="gg-draw"
                      strokeDashoffset={shown ? 0 : 1}
                      stroke={laneColor(lane)}
                      strokeOpacity={0.3}
                      strokeWidth={2}
                      fill="none"
                    />
                  )}
                  <g className="gg-fade" opacity={shown ? 1 : 0}>
                    <rect
                      x={x0 - R}
                      y={y - 30}
                      width={pillW}
                      height={18}
                      rx={9}
                      fill="var(--bg)"
                      stroke="var(--border-strong)"
                    />
                    <text
                      x={x0 - R + 7}
                      y={y - 17}
                      fontSize={12}
                      fill="var(--text-muted)"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {lane.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Edges draw along their path when their step arrives. */}
            {scene.edges.map((e) => {
              const d = edgePath(e);
              if (!d) return null;
              const shown = e.step <= current;
              if (e.state === "dashed") {
                return (
                  <path
                    key={`${e.from}-${e.to}`}
                    d={d}
                    className="gg-fade"
                    opacity={shown ? 1 : 0}
                    stroke={edgeColor(e)}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                );
              }
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={d}
                  pathLength={1}
                  className="gg-draw"
                  strokeDashoffset={shown ? 0 : 1}
                  stroke={edgeColor(e)}
                  strokeWidth={2}
                  fill="none"
                />
              );
            })}

            {/* Nodes on top of edges. */}
            {scene.nodes.map((n) => {
              const { x, y } = pos(n);
              const shown = n.step <= current;
              const color = laneColor(laneById.get(n.lane));
              const keepLabel = showAllLabels || n.state === "conflict" || n.state === "warning";
              const clickable = !!onConflictClick && n.state === "conflict" && shown;
              return (
                <g
                  key={n.id}
                  transform={`translate(${x} ${y})`}
                  className="gg-fade"
                  opacity={shown ? 1 : 0}
                  {...(clickable && {
                    role: "button",
                    tabIndex: 0,
                    "aria-label": "Show the clashing lines",
                    style: { cursor: "pointer" },
                    onClick: onConflictClick,
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onConflictClick!();
                      }
                    },
                  })}
                >
                  {/* A soft ring tells the reader this node can be clicked. */}
                  {clickable && (
                    <circle r={R + 6} fill="none" stroke="var(--danger)" strokeOpacity={0.5} className="gg-hint" />
                  )}
                  <g className={shown && n.state === "conflict" ? "gg-pop" : undefined}>
                    <NodeMark state={n.state} color={color} animate={shown} />
                  </g>
                  {n.label && keepLabel && (
                    <text
                      y={R + 15}
                      textAnchor="middle"
                      fontSize={11}
                      fill={n.state === "conflict" ? "var(--danger)" : "var(--text-muted)"}
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <ol id={descId} className="sr-only">
        {description.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>

      <figcaption className="mt-2 flex items-center gap-4">
        <span className="text-xs text-muted">{scene.caption}</span>
        <button
          type="button"
          onClick={() => {
            setStep(0);
            setRun((r) => r + 1);
          }}
          className="ml-auto h-8 shrink-0 rounded-md px-3 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
        >
          Replay
        </button>
      </figcaption>
    </figure>
  );
}

/* One node, drawn at (0, 0). Check, cross and question mark are plain stroked paths. */
function NodeMark({ state, color, animate }: { state: NodeState; color: string; animate: boolean }) {
  const cross = "M -3 -3 L 3 3 M 3 -3 L -3 3";
  switch (state) {
    case "commit":
      return (
        <>
          <circle r={R} fill="var(--bg)" stroke={color} strokeWidth={2} />
          <circle r={3} fill={color} />
        </>
      );
    case "future":
      return <circle r={R} fill="var(--bg)" stroke="var(--border-strong)" strokeWidth={1.5} strokeDasharray="3 2" />;
    case "merge":
      return (
        <>
          <circle r={R} fill="var(--bg)" stroke="var(--success)" strokeWidth={2} />
          <path d="M -3.5 0 L -1 2.5 L 3.5 -2.5" stroke="var(--success)" strokeWidth={1.5} fill="none" />
        </>
      );
    case "conflict":
      return (
        <>
          <circle r={R} fill="var(--bg)" />
          <circle
            r={R}
            fill="var(--danger-bg)"
            stroke="var(--danger)"
            strokeWidth={2}
            className={animate ? "gg-redden" : undefined}
          />
          <path
            d={cross}
            pathLength={1}
            stroke="var(--danger)"
            strokeWidth={1.5}
            fill="none"
            className={animate ? "gg-cross" : undefined}
          />
        </>
      );
    case "warning":
      return (
        <>
          <circle r={R} fill="var(--bg)" stroke="var(--warning)" strokeWidth={2} />
          <circle r={3} fill="var(--warning)" />
        </>
      );
    case "ghost":
      return (
        <>
          <circle r={R} fill="var(--bg)" stroke="var(--text-subtle)" strokeWidth={1.5} strokeDasharray="3 2" />
          <path d={cross} stroke="var(--text-subtle)" strokeWidth={1.5} fill="none" />
        </>
      );
    case "unknown":
      return (
        <>
          <circle r={R} fill="var(--bg)" stroke="var(--text-muted)" strokeWidth={1.5} strokeDasharray="3 2" />
          <path
            d="M -2.5 -2 C -2.5 -4.5, 2.5 -4.5, 2.5 -2 C 2.5 -0.5, 0 -0.5, 0 1.5"
            stroke="var(--text-muted)"
            strokeWidth={1.5}
            fill="none"
          />
          <circle cy={3.8} r={0.9} fill="var(--text-muted)" />
        </>
      );
  }
}
