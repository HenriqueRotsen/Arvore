import type { Gender } from "@prisma/client";

function asDate(date: Date | string | null | undefined) {
  if (!date) return null;
  const value = date instanceof Date ? date : new Date(date);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function fullName(person: { firstName: string; lastName: string }) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
}

export function toTreePerson(person: {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  gender: string;
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
  deceased?: boolean;
  birthCity?: string | null;
}) {
  return {
    id: person.id,
    name: fullName(person),
    photoUrl: person.photoUrl,
    years: lifespan(person),
    gender: person.gender,
    deceased: Boolean(person.deceased || person.deathDate),
    birthCity: person.birthCity ?? null,
  };
}

export function formatDate(date: Date | string | null | undefined) {
  const value = asDate(date);
  if (!value) return null;
  return value.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function lifespan(person: {
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
  deceased?: boolean;
}) {
  const birth = asDate(person.birthDate);
  const death = asDate(person.deathDate);
  const deceased = Boolean(person.deceased || death);
  const birthYear = birth ? birth.toISOString().slice(0, 4) : null;
  const deathYear = death ? death.toISOString().slice(0, 4) : null;

  if (birthYear && deathYear) return `${birthYear} – ${deathYear}`;
  if (birthYear && deceased) return `${birthYear} – †`;
  if (birthYear) return String(birthYear);
  if (deathYear) return `† ${deathYear}`;
  if (deceased) return "falecido(a)";
  return null;
}

export function livingLabel(person: {
  deathDate?: Date | string | null;
  deceased?: boolean;
}) {
  return person.deceased || person.deathDate ? "Falecido(a)" : "Vivo(a)";
}

export function genderLabel(gender: Gender) {
  switch (gender) {
    case "male":
      return "Masculino";
    case "female":
      return "Feminino";
    default:
      return "Outro";
  }
}

export function dateInputValue(date: Date | string | null | undefined) {
  if (!date) return "";
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return value.toISOString().slice(0, 10);
}
