import { fullName } from "@/lib/person";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 1) {
    return NextResponse.json({ people: [] as Array<{ id: string; name: string }> });
  }

  const tokens = query.split(/\s+/).filter(Boolean);
  const rows = await prisma.person.findMany({
    where: {
      AND: tokens.map((token) => ({
        OR: [
          { firstName: { contains: token, mode: "insensitive" } },
          { lastName: { contains: token, mode: "insensitive" } },
        ],
      })),
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 40,
  });

  const needle = fold(query);
  const people = rows
    .map((person) => ({ id: person.id, name: fullName(person) }))
    .sort((a, b) => {
      const aStarts = fold(a.name).startsWith(needle) ? 0 : 1;
      const bStarts = fold(b.name).startsWith(needle) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name, "pt-BR");
    })
    .slice(0, 12);

  return NextResponse.json({ people });
}
