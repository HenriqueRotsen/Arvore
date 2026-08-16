import { PersonAvatar } from "@/components/PersonChip";
import { inferRelatives, loadFamilyGraph } from "@/lib/relationships";
import {
  formatDate,
  fullName,
  genderLabel,
  lifespan,
  livingLabel,
  partnershipLabel,
} from "@/lib/person";
import type { Person } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

function RelativeGroup({
  title,
  people,
  notes,
}: {
  title: string;
  people: Person[];
  notes?: Record<string, string>;
}) {
  if (people.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 font-serif text-2xl font-normal italic">{title}</h2>
      <ul className="divide-y divide-line sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
        {people.map((person) => (
          <li key={person.id} className="sm:border-b sm:border-line">
            <Link
              href={`/pessoa/${person.id}`}
              className="flex items-center gap-3 py-4 transition hover:text-accent"
            >
              <PersonAvatar person={person} />
              <span>
                <span className="block font-medium">{fullName(person)}</span>
                {lifespan(person) ? (
                  <span className="block text-sm text-muted">{lifespan(person)}</span>
                ) : null}
                {notes?.[person.id] ? (
                  <span className="block text-sm text-muted">{notes[person.id]}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const graph = await loadFamilyGraph();
  const person = graph.people.get(id);
  if (!person) notFound();

  const relatives = inferRelatives(id, graph);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <PersonAvatar person={person} size="lg" />
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Ficha</p>
          <h1 className="page-title mt-1">{fullName(person)}</h1>
          <div className="mt-2 space-y-0.5 text-muted">
            <p>{genderLabel(person.gender)}</p>
            {lifespan(person) ? <p>{lifespan(person)}</p> : null}
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Situação</dt>
              <dd>{livingLabel(person)}</dd>
            </div>
            <div>
              <dt className="text-muted">Nascimento</dt>
              <dd>{formatDate(person.birthDate) ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Cidade de nascimento</dt>
              <dd>{person.birthCity?.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Falecimento</dt>
              <dd>
                {person.deceased || person.deathDate
                  ? (formatDate(person.deathDate) ?? "data não informada")
                  : "—"}
              </dd>
            </div>
          </dl>
          {person.notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
              {person.notes}
            </p>
          ) : null}
          <Link href={`/pessoas/${person.id}`} className="btn-solid mt-6 inline-flex w-full sm:w-auto">
            Editar
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <RelativeGroup title="Pais" people={relatives.parents} />
        <RelativeGroup
          title="Cônjuges e uniões"
          people={relatives.spouses.map((union) => union.person)}
          notes={Object.fromEntries(
            relatives.spouses.map((union) => [
              union.person.id,
              partnershipLabel(union),
            ]),
          )}
        />
        <RelativeGroup title="Filhos" people={relatives.children} />
        <RelativeGroup title="Irmãos" people={relatives.siblings} />
        <RelativeGroup title="Avós" people={relatives.grandparents} />
        <RelativeGroup title="Netos" people={relatives.grandchildren} />
        <RelativeGroup title="Tios e tias" people={relatives.unclesAunts} />
        <RelativeGroup title="Primos" people={relatives.cousins} />
      </div>
    </main>
  );
}
