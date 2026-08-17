import type { Adjacency } from "@/lib/graph";

export type Point = { x: number; y: number };

export type TreeConnector = {
  key: string;
  d: string;
  kind: "parent-child" | "spouse";
  onPath: boolean;
  label?: { x: number; y: number; text: string };
};

function pairKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function neighbors(adjacency: Adjacency, id: string, kind: "parent" | "child" | "spouse") {
  return (adjacency[id] ?? [])
    .filter((item) => item.kind === kind)
    .map((item) => item.id);
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

function pathPairsOf(pathIds: string[]) {
  const pairs = new Set<string>();
  for (let index = 0; index < pathIds.length - 1; index += 1) {
    pairs.add(pairKey(pathIds[index], pathIds[index + 1]));
  }
  return pairs;
}

function barYFor(stemTopY: number, children: Point[], nodeHeight: number) {
  const childTops = children.map((child) => child.y - nodeHeight / 2);
  return (stemTopY + Math.min(...childTops)) / 2;
}

function spouseGeometry(
  a: Point,
  b: Point,
  nodeWidth: number,
  nodeHeight: number,
) {
  const left = a.x <= b.x ? a : b;
  const right = a.x <= b.x ? b : a;
  const y = (a.y + b.y) / 2;
  const aligned = Math.abs(a.y - b.y) < nodeHeight * 0.4;
  const x1 = left.x + nodeWidth / 2 - 2;
  const x2 = right.x - nodeWidth / 2 + 2;
  const midX = (left.x + right.x) / 2;
  return { left, right, y, x1, x2, midX, aligned, canSplit: aligned && x2 - x1 > 8 };
}

function gapSegments(
  start: number,
  end: number,
  holes: Array<{ left: number; right: number }>,
) {
  if (end <= start) return [] as Array<[number, number]>;
  const cuts = [...holes]
    .filter((hole) => hole.right > start && hole.left < end)
    .sort((a, b) => a.left - b.left);
  const segments: Array<[number, number]> = [];
  let cursor = start;
  for (const hole of cuts) {
    if (hole.left > cursor) segments.push([cursor, Math.min(hole.left, end)]);
    cursor = Math.max(cursor, hole.right);
    if (cursor >= end) break;
  }
  if (cursor < end) segments.push([cursor, end]);
  return segments.filter(([from, to]) => to - from > 6);
}

/**
 * One parent → stem from that person. Two parents → stem from the marriage
 * bar. Sibling bars skip in-laws sitting beside a blood child.
 */
export function treeConnectors(
  adjacency: Adjacency,
  positions: Map<string, Point>,
  size: { nodeWidth: number; nodeHeight: number },
  pathIds: string[],
): TreeConnector[] {
  const { nodeWidth, nodeHeight } = size;
  const connectors: TreeConnector[] = [];
  const pathPairs = pathPairsOf(pathIds);
  const placed = (id: string) => positions.get(id);
  const spouseHalfPath = new Set<string>();

  const childrenByParents = new Map<string, { parents: string[]; children: string[] }>();

  for (const id of positions.keys()) {
    const parents = uniqueIds(neighbors(adjacency, id, "parent")).filter((parentId) =>
      positions.has(parentId),
    );
    if (parents.length === 0) continue;
    parents.sort();
    const key = parents.join("|");
    const group = childrenByParents.get(key);
    if (group) {
      group.children.push(id);
    } else {
      childrenByParents.set(key, { parents, children: [id] });
    }
  }

  for (const group of childrenByParents.values()) {
    const children = group.children.flatMap((id) => {
      const point = placed(id);
      return point ? [{ id, point }] : [];
    });
    const parents = group.parents.flatMap((id) => {
      const point = placed(id);
      return point ? [{ id, point }] : [];
    });
    if (children.length === 0 || parents.length === 0) continue;

    const twoParents = parents.length === 2;
    const married =
      twoParents && neighbors(adjacency, parents[0].id, "spouse").includes(parents[1].id);

    const attachX = twoParents
      ? (parents[0].point.x + parents[1].point.x) / 2
      : parents[0].point.x;
    const stemTopY = married
      ? (parents[0].point.y + parents[1].point.y) / 2
      : parents[0].point.y + nodeHeight / 2;

    const childPoints = children.map((child) => child.point);
    const barY = barYFor(stemTopY, childPoints, nodeHeight);
    const bloodXs = childPoints.map((point) => point.x);
    const barLeft = Math.min(attachX, ...bloodXs);
    const barRight = Math.max(attachX, ...bloodXs);

    const inLawHoles = children.flatMap((child) =>
      neighbors(adjacency, child.id, "spouse").flatMap((id) => {
        if (group.children.includes(id)) return [];
        const point = placed(id);
        if (!point) return [];
        return [{ left: point.x - nodeWidth / 2 + 8, right: point.x + nodeWidth / 2 - 8 }];
      }),
    );

    const pathChildren = children.filter((child) =>
      parents.some((parent) => pathPairs.has(pairKey(child.id, parent.id))),
    );
    const pathParentIds = new Set(
      pathChildren.flatMap((child) =>
        parents
          .filter((parent) => pathPairs.has(pairKey(child.id, parent.id)))
          .map((parent) => parent.id),
      ),
    );

    connectors.push({
      key: `stem:${group.parents.join("-")}`,
      d: `M ${attachX} ${stemTopY} L ${attachX} ${barY}`,
      kind: "parent-child",
      onPath: pathChildren.length > 0,
      label: { x: attachX, y: barY - 8, text: "pai/filho" },
    });

    for (const [from, to] of gapSegments(barLeft, barRight, inLawHoles)) {
      connectors.push({
        key: `bar:${group.parents.join("-")}:${from}:${to}`,
        d: `M ${from} ${barY} L ${to} ${barY}`,
        kind: "parent-child",
        onPath: false,
      });
    }

    for (const child of pathChildren) {
      if (child.point.x !== attachX) {
        connectors.push({
          key: `bar-path:${child.id}`,
          d: `M ${child.point.x} ${barY} L ${attachX} ${barY}`,
          kind: "parent-child",
          onPath: true,
        });
      }
    }

    for (const child of children) {
      connectors.push({
        key: `drop:${child.id}`,
        d: `M ${child.point.x} ${barY} L ${child.point.x} ${child.point.y - nodeHeight / 2}`,
        kind: "parent-child",
        onPath: pathChildren.some((item) => item.id === child.id),
      });
    }

    if (married && pathParentIds.size > 0) {
      const spouseKey = pairKey(parents[0].id, parents[1].id);
      for (const parentId of pathParentIds) {
        spouseHalfPath.add(`${spouseKey}:${parentId}`);
      }
    }
  }

  const seenSpouse = new Set<string>();
  for (const id of positions.keys()) {
    for (const spouseId of neighbors(adjacency, id, "spouse")) {
      const key = pairKey(id, spouseId);
      if (seenSpouse.has(key) || !positions.has(spouseId)) continue;
      seenSpouse.add(key);
      const a = placed(id);
      const b = placed(spouseId);
      if (!a || !b) continue;

      const geom = spouseGeometry(a, b, nodeWidth, nodeHeight);
      const fullOnPath = pathPairs.has(key);
      const leftId = geom.left === a ? id : spouseId;
      const rightId = geom.left === a ? spouseId : id;
      const leftOnPath = fullOnPath || spouseHalfPath.has(`${key}:${leftId}`);
      const rightOnPath = fullOnPath || spouseHalfPath.has(`${key}:${rightId}`);

      if (geom.canSplit) {
        connectors.push({
          key: `spouse-left:${key}`,
          d: `M ${geom.x1} ${geom.y} L ${geom.midX} ${geom.y}`,
          kind: "spouse",
          onPath: leftOnPath,
          label: { x: geom.midX, y: geom.y - 10, text: "cônjuge" },
        });
        connectors.push({
          key: `spouse-right:${key}`,
          d: `M ${geom.midX} ${geom.y} L ${geom.x2} ${geom.y}`,
          kind: "spouse",
          onPath: rightOnPath,
        });
      } else {
        const midY = (a.y + b.y) / 2;
        connectors.push({
          key: `spouse:${key}`,
          d: `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`,
          kind: "spouse",
          onPath: fullOnPath || leftOnPath || rightOnPath,
          label: {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2 - 10,
            text: "cônjuge",
          },
        });
      }
    }
  }

  return connectors;
}
