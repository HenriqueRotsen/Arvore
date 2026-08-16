"use client";

import calcTree from "relatives-tree";
import type { Node } from "relatives-tree/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { toUndirectedEdges, type Adjacency } from "@/lib/graph";

export type TreePerson = {
  id: string;
  name: string;
  photoUrl: string | null;
  years: string | null;
  gender: string;
  deceased?: boolean;
  birthCity?: string | null;
};

const NODE_WIDTH = 280;
const NODE_HEIGHT = 156;
const COL_GAP = 180;
const ROW_GAP = 140;
const PAD = 80;

function elbowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  kind: "parent-child" | "spouse",
) {
  if (kind === "spouse") {
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  }
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
}

function edgeLabelPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  kind: "parent-child" | "spouse",
) {
  if (kind === "spouse") {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 10 };
  }
  const upper = a.y <= b.y ? a : b;
  const lower = a.y <= b.y ? b : a;
  const gapTop = upper.y + NODE_HEIGHT / 2;
  const gapBottom = lower.y - NODE_HEIGHT / 2;
  return {
    x: lower.x,
    y: (gapTop + gapBottom) / 2 - 8,
  };
}

type DragState = {
  startX: number;
  startY: number;
  origPanX: number;
  origPanY: number;
  moved: boolean;
};

export function FamilyTreeView({
  nodes,
  people,
  rootId,
  adjacency,
  highlightedIds = [],
  selectedFrom,
  selectedTo,
  onSelectPerson,
}: {
  nodes: Node[];
  people: Record<string, TreePerson>;
  rootId: string;
  adjacency: Adjacency;
  highlightedIds?: string[];
  selectedFrom?: string;
  selectedTo?: string;
  onSelectPerson?: (id: string) => void;
}) {
  const [scale, setScale] = useState(0.85);
  const [pan, setPan] = useState({ x: 24, y: 24 });
  const drag = useRef<DragState | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const tree = useMemo(() => {
    try {
      return calcTree(nodes, { rootId });
    } catch {
      return null;
    }
  }, [nodes, rootId]);

  const highlightSet = useMemo(() => new Set(highlightedIds), [highlightedIds]);
  const pathPairs = useMemo(() => {
    const pairs = new Set<string>();
    for (let i = 0; i < highlightedIds.length - 1; i += 1) {
      pairs.add([highlightedIds[i], highlightedIds[i + 1]].sort().join(":"));
    }
    return pairs;
  }, [highlightedIds]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      setScale((value) => Math.min(2.2, Math.max(0.25, value * factor)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  if (!tree) {
    return (
      <p className="border-y border-line py-6 text-muted">
        Não foi possível desenhar a árvore. Confira se os vínculos pai → filho
        estão consistentes.
      </p>
    );
  }

  const unitX = (NODE_WIDTH + COL_GAP) / 2;
  const unitY = (NODE_HEIGHT + ROW_GAP) / 2;
  const canvasWidth = Math.max(tree.canvas.width * unitX + PAD * 2, 800);
  const canvasHeight = Math.max(tree.canvas.height * unitY + PAD * 2, 560);

  const positions = new Map(
    tree.nodes.map((node) => [
      node.id,
      {
        x: node.left * unitX + NODE_WIDTH / 2 + PAD,
        y: node.top * unitY + NODE_HEIGHT / 2 + PAD,
      },
    ]),
  );

  const edges = toUndirectedEdges(adjacency)
    .map((edge) => {
      const a = positions.get(edge.from);
      const b = positions.get(edge.to);
      if (!a || !b) return null;
      const key = [edge.from, edge.to].sort().join(":");
      return { ...edge, a, b, onPath: pathPairs.has(key) };
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true;
    setPan({ x: current.origPanX + dx, y: current.origPanY + dy });
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    drag.current = null;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Zoom</span>
        <button
          type="button"
          className="btn-outline btn-sm"
          onClick={() => setScale((value) => Math.max(0.25, value - 0.15))}
        >
          −
        </button>
        <button
          type="button"
          className="btn-outline btn-sm"
          onClick={() => setScale((value) => Math.min(2.2, value + 0.15))}
        >
          +
        </button>
        <button
          type="button"
          className="btn-outline btn-sm"
          onClick={() => {
            setScale(0.85);
            setPan({ x: 24, y: 24 });
          }}
        >
          Recentrar
        </button>
        <span className="ml-2 flex items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-6 bg-[#8d7a62]" />
            pai/filho
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-6 border-t-2 border-dashed border-[#a45a3a]" />
            cônjuge
          </span>
        </span>
        <span className="text-sm text-muted">
          Arraste o fundo para navegar. Roda do mouse = zoom.
        </span>
      </div>
      <div
        ref={viewportRef}
        className="relative flex-1 cursor-grab overflow-hidden border-y border-line bg-[radial-gradient(circle_at_top,_#f7f4ea,_#ece6d6)] active:cursor-grabbing"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          drag.current = {
            startX: event.clientX,
            startY: event.clientY,
            origPanX: pan.x,
            origPanY: pan.y,
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endDrag(event)}
        onPointerCancel={(event) => endDrag(event)}
      >
        <div
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <svg
            className="pointer-events-none absolute inset-0"
            width={canvasWidth}
            height={canvasHeight}
            aria-hidden
          >
            <defs>
              <linearGradient
                id="kinship-stroke"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#5b8fd4" />
                <stop offset="55%" stopColor="#7a6bb8" />
                <stop offset="100%" stopColor="#a56bb8" />
              </linearGradient>
            </defs>
            {edges.map((edge) => {
              const d = elbowPath(edge.a.x, edge.a.y, edge.b.x, edge.b.y, edge.kind);
              const spouse = edge.kind === "spouse";
              const label = edgeLabelPoint(edge.a, edge.b, edge.kind);
              return (
                <g key={`${edge.from}-${edge.to}-${edge.kind}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke={
                      edge.onPath
                        ? "url(#kinship-stroke)"
                        : spouse
                          ? "#a45a3a"
                          : "#8d7a62"
                    }
                    strokeWidth={edge.onPath ? 5 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={spouse ? "7 5" : undefined}
                  />
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    className="fill-[#5c4e3c]"
                    style={{ fontSize: 11, fontFamily: "inherit" }}
                  >
                    {spouse ? "cônjuge" : "pai/filho"}
                  </text>
                </g>
              );
            })}
          </svg>
          {edges.length === 0 ? (
            <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 w-max max-w-[90%] -translate-x-1/2 bg-background/90 px-4 py-2 text-center text-sm text-muted">
              Ainda não há arestas: vincule pai → filho ou cônjuge no painel.
            </p>
          ) : null}
          {tree.nodes.map((node) => {
            const person = people[node.id];
            if (!person || node.placeholder) return null;
            const onPath = highlightSet.has(node.id);
            const isFrom = selectedFrom === node.id;
            const isTo = selectedTo === node.id;
            const selected = isFrom || isTo;
            const className = [
              "absolute block cursor-pointer border p-3",
              selected
                ? "border-[#7a6bb8] bg-[linear-gradient(145deg,#cfe0f6_0%,#d5d0f0_48%,#e3cdee_100%)] shadow-[0_0_0_2px_rgba(122,107,184,0.28)]"
                : onPath
                  ? "border-[#8b7ec4] bg-[linear-gradient(145deg,#e4eaf7_0%,#ebe6f6_100%)]"
                  : "border-line bg-[#f7f4ea] hover:border-accent",
            ].join(" ");

            return (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                className={className}
                style={{
                  width: NODE_WIDTH,
                  minHeight: NODE_HEIGHT,
                  transform: `translate(${node.left * unitX + PAD}px, ${node.top * unitY + PAD}px)`,
                  textAlign: "left",
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={() => {
                  onSelectPerson?.(node.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectPerson?.(node.id);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {person.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.photoUrl}
                      alt=""
                      width={720}
                      height={720}
                      className="h-14 w-14 rounded-full object-cover object-top"
                    />
                  ) : (
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-serif text-lg ${
                        person.gender === "female"
                          ? "bg-[#ead7d0] text-terracotta"
                          : "bg-[#d7e2d8] text-accent-dark"
                      }`}
                    >
                      {person.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-[15px] leading-snug font-normal italic break-words">
                      {person.name}
                    </p>
                    {isFrom ? (
                      <p className="text-xs font-medium text-[#4e3f86]">origem</p>
                    ) : isTo ? (
                      <p className="text-xs font-medium text-[#4e3f86]">destino</p>
                    ) : (
                      <p className="truncate text-xs text-muted">
                        {[person.years, person.birthCity].filter(Boolean).join(" · ") ||
                          "selecionar"}
                      </p>
                    )}
                    <a
                      href={`/pessoa/${node.id}`}
                      className="text-xs text-accent-dark underline-offset-2 hover:underline"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      ficha
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
