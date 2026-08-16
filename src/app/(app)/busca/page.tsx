import { PersonAvatar } from "@/components/PersonChip";
import { SearchBox } from "@/components/SearchBox";
import { prisma } from "@/lib/prisma";
import { fullName, lifespan } from "@/lib/person";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const people =
    query.length === 0
      ? []
      : await prisma.person.findMany({
          where: {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
            ],
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          take: 50,
        });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-5 sm:py-12">
      <h1 className="page-title">Buscar</h1>
      <div className="mt-8 max-w-md">
        <SearchBox defaultQuery={query} />
      </div>
      {query ? (
        <p className="mt-8 text-sm text-muted">Resultados para “{query}”</p>
      ) : (
        <p className="mt-8 text-sm text-muted">Digite um nome para encontrar alguém na família.</p>
      )}
      <ul className="mt-4 divide-y divide-line">
        {query && people.length === 0 ? (
          <li className="py-4 text-muted">Ninguém encontrado com esse nome.</li>
        ) : (
          people.map((person) => (
            <li key={person.id}>
              <Link
                href={`/pessoa/${person.id}`}
                className="flex items-center gap-3 py-4 transition hover:text-accent"
              >
                <PersonAvatar person={person} />
                <span>
                  <span className="block">{fullName(person)}</span>
                  {lifespan(person) ? (
                    <span className="text-sm text-muted">{lifespan(person)}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
