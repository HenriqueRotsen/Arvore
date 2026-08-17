"use client";

import type { Node } from "relatives-tree/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { layoutForest } from "@/lib/forest";
import type { Adjacency } from "@/lib/graph";
import { treeConnectors } from "@/lib/tree-edges";

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
const UNIT_X = (NODE_WIDTH + COL_GAP) / 2;
const UNIT_Y = (NODE_HEIGHT + ROW_GAP) / 2;

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
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const moved = useRef(false);
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  scaleRef.current = scale;
  panRef.current = pan;

  function applyZoom(nextScale: number, clientX: number, clientY: number) {
    const clamped = Math.min(2.2, Math.max(0.25, nextScale));
    const prevScale = scaleRef.current;
    const el = viewportRef.current;
    if (!el || prevScale <= 0) {
      scaleRef.current = clamped;
      setScale(clamped);
      return;
    }
    const rect = el.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const ratio = clamped / prevScale;
    const prevPan = panRef.current;
    const nextPan = {
      x: mx - (mx - prevPan.x) * ratio,
      y: my - (my - prevPan.y) * ratio,
    };
    scaleRef.current = clamped;
    panRef.current = nextPan;
    setScale(clamped);
    setPan(nextPan);
  }

  function zoomFromCenter(nextScale: number) {
    const el = viewportRef.current;
    if (!el) {
      applyZoom(nextScale, 0, 0);
      return;
    }
    const rect = el.getBoundingClientRect();
    applyZoom(nextScale, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  const tree = useMemo(
    () => layoutForest(nodes, adjacency, rootId),
    [nodes, adjacency, rootId],
  );
  const treeRef = useRef(tree);
  treeRef.current = tree;

  function defaultScale() {
    return (viewportRef.current?.clientWidth ?? 800) < 640 ? 0.42 : 0.85;
  }

  function recenterOnLargestRoot() {
    const forest = treeRef.current;
    const el = viewportRef.current;
    const nextScale = defaultScale();
    const rootNode = forest.nodes.find(
      (node) => node.id === forest.largestRootId && !node.placeholder,
    );
    if (!el || !rootNode) {
      scaleRef.current = nextScale;
      panRef.current = { x: 16, y: 16 };
      setScale(nextScale);
      setPan({ x: 16, y: 16 });
      return;
    }
    const x = rootNode.left * UNIT_X + NODE_WIDTH / 2 + PAD;
    const y = rootNode.top * UNIT_Y + NODE_HEIGHT / 2 + PAD;
    const nextPan = {
      x: el.clientWidth / 2 - x * nextScale,
      y: el.clientHeight / 2 - y * nextScale,
    };
    scaleRef.current = nextScale;
    panRef.current = nextPan;
    setScale(nextScale);
    setPan(nextPan);
  }

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
    recenterOnLargestRoot();
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      applyZoom(scaleRef.current * factor, event.clientX, event.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  if (tree.nodes.length === 0) {
    return (
      <p className="border-y border-line py-6 text-muted">
        Não foi possível desenhar a árvore. Confira se os vínculos pai → filho
        estão consistentes.
      </p>
    );
  }

  const canvasWidth = Math.max(tree.canvas.width * UNIT_X + PAD * 2, 800);
  const canvasHeight = Math.max(tree.canvas.height * UNIT_Y + PAD * 2, 560);

  const positions = new Map(
    tree.nodes.map((node) => [
      node.id,
      {
        x: node.left * UNIT_X + NODE_WIDTH / 2 + PAD,
        y: node.top * UNIT_Y + NODE_HEIGHT / 2 + PAD,
      },
    ]),
  );

  const edges = treeConnectors(
    adjacency,
    positions,
    { nodeWidth: NODE_WIDTH, nodeHeight: NODE_HEIGHT },
    pathPairs,
  );

  function pointerDistance(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onViewportPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as Element | null;
    if (target?.closest("a, button")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointers.current.size === 1) {
      moved.current = false;
      drag.current = {
        startX: event.clientX,
        startY: event.clientY,
        origPanX: panRef.current.x,
        origPanY: panRef.current.y,
        moved: false,
      };
      pinch.current = null;
      return;
    }

    if (pointers.current.size >= 2) {
      drag.current = null;
      const [first, second] = [...pointers.current.values()];
      pinch.current = {
        distance: pointerDistance(first, second),
        scale: scaleRef.current,
      };
    }
  }

  function onViewportPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      const [first, second] = [...pointers.current.values()];
      const next =
        pinch.current.scale *
        (pointerDistance(first, second) / Math.max(pinch.current.distance, 1));
      applyZoom(next, (first.x + second.x) / 2, (first.y + second.y) / 2);
      moved.current = true;
      return;
    }

    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.moved) {
      if (Math.abs(dx) + Math.abs(dy) <= 10) return;
      current.moved = true;
      moved.current = true;
    }
    setPan({ x: current.origPanX + dx, y: current.origPanY + dy });
  }

  function onViewportPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const wasTap = Boolean(drag.current) && !moved.current;
    const { clientX, clientY } = event;
    pointers.current.delete(event.pointerId);
    pinch.current = null;
    drag.current = null;

    if (pointers.current.size === 0) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } else {
      const remaining = [...pointers.current.values()][0];
      if (remaining) {
        drag.current = {
          startX: remaining.x,
          startY: remaining.y,
          origPanX: panRef.current.x,
          origPanY: panRef.current.y,
          moved: moved.current,
        };
      }
      return;
    }

    if (!wasTap) return;
    const hit = document.elementFromPoint(clientX, clientY);
    if (hit?.closest("a, button")) return;
    const id = hit?.closest("[data-person-id]")?.getAttribute("data-person-id");
    if (id) onSelectPerson?.(id);
  }

  return (
    <div className="flex min-h-[min(32rem,calc(100dvh-11rem))] flex-1 select-none flex-col sm:min-h-[70vh]">
      <div className="relative min-h-0 flex-1 touch-none overflow-hidden border-y border-line bg-[radial-gradient(circle_at_top,_#f7f4ea,_#ece6d6)]">
        <div
          ref={viewportRef}
          className="absolute inset-0 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
          onCopy={(event) => event.preventDefault()}
          onCut={(event) => event.preventDefault()}
          onPointerDown={onViewportPointerDown}
          onPointerMove={onViewportPointerMove}
          onPointerUp={onViewportPointerUp}
          onPointerCancel={onViewportPointerUp}
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
              const spouse = edge.kind === "spouse";
              return (
                <g key={edge.key}>
                  <path
                    d={edge.d}
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
                    x={edge.label.x}
                    y={edge.label.y}
                    textAnchor="middle"
                    className="fill-[#5c4e3c]"
                    style={{ fontSize: 11, fontFamily: "inherit" }}
                  >
                    {edge.label.text}
                  </text>
                </g>
              );
            })}
          </svg>
          {tree.nodes.map((node) => {
            const person = people[node.id];
            if (!person || node.placeholder) return null;
            const onPath = highlightSet.has(node.id);
            const isFrom = selectedFrom === node.id;
            const isTo = selectedTo === node.id;
            const selected = isFrom || isTo;
            const loose = (adjacency[node.id] ?? []).length === 0;
            const className = [
              "absolute block cursor-pointer overflow-hidden border p-2.5 select-none",
              selected
                ? "border-[#7a6bb8] bg-[linear-gradient(145deg,#cfe0f6_0%,#d5d0f0_48%,#e3cdee_100%)] shadow-[0_0_0_2px_rgba(122,107,184,0.28)]"
                : onPath
                  ? "border-[#8b7ec4] bg-[linear-gradient(145deg,#e4eaf7_0%,#ebe6f6_100%)]"
                  : loose
                    ? "border-dashed border-accent/55 bg-[#f7f4ea] hover:border-accent"
                    : "border-line bg-[#f7f4ea] hover:border-accent",
            ].join(" ");

            return (
              <div
                key={`${node.id}-${node.left}-${node.top}`}
                data-person-id={node.id}
                role="button"
                tabIndex={0}
                className={className}
                style={{
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                  transform: `translate(${node.left * UNIT_X + PAD}px, ${node.top * UNIT_Y + PAD}px)`,
                  textAlign: "left",
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectPerson?.(node.id);
                  }
                }}
              >
                <div className="flex h-full items-start gap-2.5">
                  {person.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.photoUrl}
                      alt=""
                      draggable={false}
                      width={720}
                      height={720}
                      className="h-12 w-12 shrink-0 rounded-full object-cover object-top"
                    />
                  ) : (
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-serif text-base ${
                        person.gender === "female"
                          ? "bg-[#ead7d0] text-terracotta"
                          : "bg-[#d7e2d8] text-accent-dark"
                      }`}
                    >
                      {person.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-[11px] leading-snug text-muted">
                    <p className="font-serif text-[13px] leading-snug font-normal italic break-words text-foreground">
                      {person.name}
                    </p>
                    {isFrom ? (
                      <p className="mt-0.5 font-medium text-[#4e3f86]">origem</p>
                    ) : isTo ? (
                      <p className="mt-0.5 font-medium text-[#4e3f86]">destino</p>
                    ) : loose ? (
                      <p className="mt-0.5">sem vínculo · nova árvore</p>
                    ) : null}
                    <p className="mt-0.5 break-words">
                      {person.gender === "female"
                        ? "Feminino"
                        : person.gender === "male"
                          ? "Masculino"
                          : "Outro"}
                    </p>
                    {person.years ? (
                      <p className="break-words">{person.years}</p>
                    ) : null}
                    {person.deceased ? <p>falecido(a)</p> : null}
                    {person.birthCity ? (
                      <p className="break-words">{person.birthCity}</p>
                    ) : null}
                    <a
                      href={`/pessoa/${node.id}`}
                      className="mt-0.5 inline-flex items-center text-accent-dark underline-offset-2 hover:underline"
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
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
          <p className="hidden max-w-[12rem] rounded-sm bg-[#f4f1e6]/85 px-2 py-1 text-[11px] leading-snug text-muted sm:block">
            Arraste para mover. Roda ou belisque para zoom.
          </p>
          <div className="pointer-events-auto ml-auto flex gap-2">
            <button
              type="button"
              className="btn-outline btn-sm size-11 p-0 text-lg"
              aria-label="Diminuir zoom"
              onClick={() => zoomFromCenter(scaleRef.current - 0.15)}
            >
              −
            </button>
            <button
              type="button"
              className="btn-outline btn-sm size-11 p-0 text-lg"
              aria-label="Aumentar zoom"
              onClick={() => zoomFromCenter(scaleRef.current + 0.15)}
            >
              +
            </button>
            <button
              type="button"
              className="btn-outline btn-sm h-11 px-3"
              onClick={() => recenterOnLargestRoot()}
            >
              Recentrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
