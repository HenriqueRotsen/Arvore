import { FamilyGraphExplorer } from "@/components/FamilyGraphExplorer";
import { TreeFocusSelect } from "@/components/TreeFocusSelect";
import { toAdjacency } from "@/lib/graph";
import { fullName, toTreePerson } from "@/lib/person";
import { loadFamilyGraph } from "@/lib/relationships";
import { resolveFocusId, toTreeNodes } from "@/lib/tree";
import Link from "next/link";

export default async function TreePage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  const { de } = await searchParams;
  const graph = await loadFamilyGraph();
  const people = [...graph.people.values()];
  const focusId = resolveFocusId(graph, de);

  if (!focusId || people.length === 0) {
    return (
      <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-4 py-16 text-center">
        <h1 className="page-title">Árvore da família</h1>
        <p className="mt-3 text-muted">
          Ainda não há pessoas na árvore. Qualquer um pode começar o cadastro
          — qualquer pessoa, em qualquer geração.
        </p>
        <Link href="/pessoas/nova" className="btn-solid mx-auto mt-8">
          Cadastrar pessoa
        </Link>
      </main>
    );
  }

  const peopleById = Object.fromEntries(
    people.map((person) => [person.id, toTreePerson(person)]),
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Árvore da família</h1>
          <p className="mt-1 max-w-2xl text-muted">
            Clique em dois nós para ver o grau de parentesco entre eles.
          </p>
        </div>
        <TreeFocusSelect
          currentId={focusId}
          people={people
            .map((person) => ({ id: person.id, name: fullName(person) }))
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))}
        />
      </div>
      <FamilyGraphExplorer
        nodes={toTreeNodes(graph)}
        people={peopleById}
        rootId={focusId}
        adjacency={toAdjacency(graph)}
      />
    </main>
  );
}
