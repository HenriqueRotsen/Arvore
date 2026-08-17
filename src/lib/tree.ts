import type { Node } from "relatives-tree/lib/types";
import type { FamilyGraph } from "@/lib/relationships";

export function toTreeNodes(graph: FamilyGraph): Node[] {
  return [...graph.people.values()].map((person) => {
    const parents = (graph.parentsOf.get(person.id) ?? []).map((id) => ({
      id,
      type: "blood" as const,
    }));
    const children = (graph.childrenOf.get(person.id) ?? []).map((id) => ({
      id,
      type: "blood" as const,
    }));
    const siblingIds = new Set(
      parents.flatMap((parent) => graph.childrenOf.get(parent.id) ?? []),
    );
    siblingIds.delete(person.id);
    const spouses = (graph.spousesOf.get(person.id) ?? [])
      .filter((spouse) => !siblingIds.has(spouse.id))
      .map((spouse) => ({
        id: spouse.id,
        type: "married" as const,
      }));

    return {
      id: person.id,
      gender: person.gender === "female" ? "female" : "male",
      parents,
      children,
      spouses,
      siblings: [...siblingIds].map((id) => ({ id, type: "blood" as const })),
    } as Node;
  });
}

function descendantCount(graph: FamilyGraph, personId: string) {
  const seen = new Set<string>();
  const stack = [...(graph.childrenOf.get(personId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(graph.childrenOf.get(current) ?? []));
  }
  return seen.size;
}

export function resolveFocusId(graph: FamilyGraph, requestedId?: string | null) {
  if (requestedId && graph.people.has(requestedId)) {
    return requestedId;
  }

  const people = [...graph.people.values()];
  if (people.length === 0) return null;

  const roots = people.filter(
    (person) => (graph.parentsOf.get(person.id)?.length ?? 0) === 0,
  );
  const candidates = roots.length > 0 ? roots : people;

  candidates.sort((a, b) => {
    const byDesc =
      descendantCount(graph, b.id) - descendantCount(graph, a.id);
    if (byDesc !== 0) return byDesc;
    const aBirth = a.birthDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const bBirth = b.birthDate?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aBirth !== bBirth) return aBirth - bBirth;
    return `${a.firstName} ${a.lastName}`.localeCompare(
      `${b.firstName} ${b.lastName}`,
      "pt-BR",
    );
  });

  return candidates[0]?.id ?? null;
}
