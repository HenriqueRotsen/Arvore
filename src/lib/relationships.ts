import type { Person } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SpouseLink = {
  id: string;
  type: "married" | "partner";
  startDate: Date | null;
  endDate: Date | null;
};

export type FamilyGraph = {
  people: Map<string, Person>;
  parentsOf: Map<string, string[]>;
  childrenOf: Map<string, string[]>;
  spousesOf: Map<string, SpouseLink[]>;
};

function push(map: Map<string, string[]>, key: string, value: string) {
  const list = map.get(key) ?? [];
  if (!list.includes(value)) {
    list.push(value);
  }
  map.set(key, list);
}

export async function loadFamilyGraph(): Promise<FamilyGraph> {
  const [people, filiations, partnerships] = await Promise.all([
    prisma.person.findMany({ orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.parentChild.findMany(),
    prisma.partnership.findMany(),
  ]);

  const graph: FamilyGraph = {
    people: new Map(people.map((person) => [person.id, person])),
    parentsOf: new Map(),
    childrenOf: new Map(),
    spousesOf: new Map(),
  };

  for (const link of filiations) {
    push(graph.parentsOf, link.childId, link.parentId);
    push(graph.childrenOf, link.parentId, link.childId);
  }

  for (const link of partnerships) {
    const a = graph.spousesOf.get(link.personAId) ?? [];
    const b = graph.spousesOf.get(link.personBId) ?? [];
    a.push({
      id: link.personBId,
      type: link.type,
      startDate: link.startDate,
      endDate: link.endDate,
    });
    b.push({
      id: link.personAId,
      type: link.type,
      startDate: link.startDate,
      endDate: link.endDate,
    });
    graph.spousesOf.set(link.personAId, a);
    graph.spousesOf.set(link.personBId, b);
  }

  return graph;
}

function peopleByIds(graph: FamilyGraph, ids: string[]) {
  return ids
    .map((id) => graph.people.get(id))
    .filter((person): person is Person => Boolean(person));
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

export function isDescendant(
  graph: FamilyGraph,
  ancestorId: string,
  maybeDescendantId: string,
) {
  const seen = new Set<string>();
  const stack = [...(graph.childrenOf.get(ancestorId) ?? [])];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === maybeDescendantId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(graph.childrenOf.get(current) ?? []));
  }

  return false;
}

export type SpouseRelative = {
  person: Person;
  type: "married" | "partner";
  startDate: Date | null;
  endDate: Date | null;
};

export type InferredRelatives = {
  parents: Person[];
  children: Person[];
  spouses: SpouseRelative[];
  siblings: Person[];
  grandparents: Person[];
  grandchildren: Person[];
  unclesAunts: Person[];
  cousins: Person[];
};

export function inferRelatives(
  personId: string,
  graph: FamilyGraph,
): InferredRelatives {
  const parentIds = graph.parentsOf.get(personId) ?? [];
  const childIds = graph.childrenOf.get(personId) ?? [];
  const spouseLinks = graph.spousesOf.get(personId) ?? [];

  const siblingIds = uniqueIds(
    parentIds.flatMap((parentId) => graph.childrenOf.get(parentId) ?? []),
  ).filter((id) => id !== personId);

  const grandparentIds = uniqueIds(
    parentIds.flatMap((parentId) => graph.parentsOf.get(parentId) ?? []),
  );

  const grandchildIds = uniqueIds(
    childIds.flatMap((childId) => graph.childrenOf.get(childId) ?? []),
  );

  const uncleAuntIds = uniqueIds(
    parentIds.flatMap((parentId) => {
      const grandparents = graph.parentsOf.get(parentId) ?? [];
      return grandparents.flatMap((gp) => graph.childrenOf.get(gp) ?? []);
    }),
  ).filter((id) => id !== personId && !parentIds.includes(id));

  const cousinIds = uniqueIds(
    uncleAuntIds.flatMap((id) => graph.childrenOf.get(id) ?? []),
  ).filter((id) => id !== personId && !siblingIds.includes(id));

  return {
    parents: peopleByIds(graph, parentIds),
    children: peopleByIds(graph, childIds),
    spouses: spouseLinks.flatMap((link) => {
      const person = graph.people.get(link.id);
      if (!person) return [];
      return [
        {
          person,
          type: link.type,
          startDate: link.startDate,
          endDate: link.endDate,
        },
      ];
    }),
    siblings: peopleByIds(graph, siblingIds),
    grandparents: peopleByIds(graph, grandparentIds),
    grandchildren: peopleByIds(graph, grandchildIds),
    unclesAunts: peopleByIds(graph, uncleAuntIds),
    cousins: peopleByIds(graph, cousinIds),
  };
}
