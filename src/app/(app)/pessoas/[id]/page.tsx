import { DeletePersonButton } from "@/components/DeletePersonButton";
import { PersonForm } from "@/components/PersonForm";
import { RelationBlocks } from "@/components/RelationBlocks";
import { updatePerson } from "@/lib/actions/people";
import { fullName } from "@/lib/person";
import { inferRelatives, loadFamilyGraph } from "@/lib/relationships";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const graph = await loadFamilyGraph();
  const person = graph.people.get(id);
  if (!person) notFound();

  const relatives = inferRelatives(id, graph);
  const candidates = [...graph.people.values()];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
            <Link href="/pessoas" className="hover:text-foreground">
              Pessoas
            </Link>{" "}
            / editar
          </p>
          <h1 className="page-title mt-1">{fullName(person)}</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href={`/pessoa/${person.id}`} className="btn-outline w-full sm:w-auto">
            Ver ficha
          </Link>
          <DeletePersonButton personId={person.id} name={fullName(person)} />
        </div>
      </div>

      <PersonForm
        person={person}
        action={updatePerson.bind(null, person.id)}
        submitLabel="Salvar dados"
      />

      <div className="mt-8">
        <RelationBlocks
          person={person}
          parents={relatives.parents}
          childPeople={relatives.children}
          spouses={relatives.spouses}
          candidates={candidates}
          otherParentByChildId={Object.fromEntries(
            relatives.children.map((child) => {
              const parentIds = graph.parentsOf.get(child.id) ?? [];
              const otherId = parentIds.find((parentId) => parentId !== person.id);
              return [child.id, otherId ? (graph.people.get(otherId) ?? null) : null];
            }),
          )}
        />
      </div>
    </main>
  );
}
