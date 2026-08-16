import { PersonAvatar } from "@/components/PersonChip";
import { prisma } from "@/lib/prisma";
import { fullName, lifespan } from "@/lib/person";
import Link from "next/link";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const people = await prisma.person.findMany({
    where: query
      ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Pessoas</h1>
          <p className="mt-2 max-w-xl text-muted">
            Qualquer pessoa pode cadastrar parentes. Os vínculos de pai/mãe,
            filhos e cônjuges ficam na ficha de cada um.
          </p>
        </div>
        <Link href="/pessoas/nova" className="btn-solid self-start">
          Nova pessoa
        </Link>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif text-2xl font-normal italic">
            Cadastrados ({people.length})
          </h2>
          <form className="sm:w-72">
            <input
              name="q"
              defaultValue={query}
              placeholder="Filtrar pelo nome"
              className="input-line"
            />
          </form>
        </div>
        <ul className="divide-y divide-line">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                href={`/pessoas/${person.id}`}
                className="flex items-center gap-3 py-4 transition hover:text-accent"
              >
                <PersonAvatar person={person} />
                <span className="flex-1">
                  <span className="font-medium">{fullName(person)}</span>
                  {person.deceased || person.deathDate ? (
                    <span className="ml-2 text-[11px] uppercase tracking-[0.16em] text-terracotta">
                      falecido(a)
                    </span>
                  ) : null}
                  {lifespan(person) ? (
                    <span className="block text-sm text-muted">
                      {lifespan(person)}
                    </span>
                  ) : null}
                </span>
                <span className="link-nav">Editar</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
