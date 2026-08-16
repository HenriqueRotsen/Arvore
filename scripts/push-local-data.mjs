import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const OUT = "/tmp/rotsen-family.sql";

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlDate(value) {
  if (!value) return "NULL";
  return `'${value.toISOString().slice(0, 10)}'`;
}

const prisma = new PrismaClient();
const people = await prisma.person.findMany({ orderBy: { createdAt: "asc" } });
const links = await prisma.parentChild.findMany();
const couples = await prisma.partnership.findMany();

const personRows = people.map(
  (person) =>
    `INSERT INTO public."Person" (id, "firstName", "lastName", gender, "birthDate", "deathDate", "birthCity", "photoUrl", notes, deceased, "createdAt", "updatedAt") VALUES (${[
      sqlLiteral(person.id),
      sqlLiteral(person.firstName),
      sqlLiteral(person.lastName),
      sqlLiteral(person.gender),
      sqlDate(person.birthDate),
      sqlDate(person.deathDate),
      sqlLiteral(person.birthCity),
      sqlLiteral(person.photoUrl),
      sqlLiteral(person.notes),
      sqlLiteral(person.deceased),
      sqlLiteral(person.createdAt),
      sqlLiteral(person.updatedAt),
    ].join(", ")});`,
);

const linkRows = links.map(
  (link) =>
    `INSERT INTO public."ParentChild" (id, "parentId", "childId") VALUES (${[
      sqlLiteral(link.id),
      sqlLiteral(link.parentId),
      sqlLiteral(link.childId),
    ].join(", ")});`,
);

const coupleRows = couples.map(
  (couple) =>
    `INSERT INTO public."Partnership" (id, "personAId", "personBId", type, "startDate", "endDate") VALUES (${[
      sqlLiteral(couple.id),
      sqlLiteral(couple.personAId),
      sqlLiteral(couple.personBId),
      sqlLiteral(couple.type),
      sqlDate(couple.startDate),
      sqlDate(couple.endDate),
    ].join(", ")});`,
);

writeFileSync(
  OUT,
  `-- Cadastro local → Supabase (SQL Editor → Run)
BEGIN;
TRUNCATE TABLE public."Partnership", public."ParentChild", public."Person" CASCADE;
${personRows.join("\n")}
${linkRows.join("\n")}
${coupleRows.join("\n")}
COMMIT;
`,
);

await prisma.$disconnect();
console.log(OUT);
console.log(`${people.length} pessoas, ${links.length} vínculos, ${couples.length} casal(is).`);
