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
  const birth = formatDate(person.birthDate);
  const death = formatDate(person.deathDate);
  const deceased = Boolean(person.deceased || person.deathDate);

  if (birth && death) return `${birth} – ${death} · falecido(a)`;
  if (birth && deceased) return `${birth} · falecido(a)`;
  if (death) return `falecido(a) · ${death}`;
  if (deceased) return "falecido(a)";
  return birth;
}

export function livingLabel(person: {
  deathDate?: Date | string | null;
  deceased?: boolean;
}) {
  return person.deceased || person.deathDate ? "falecido(a)" : "vivo(a)";
}

export function partnershipLabel(union: {
  type: "married" | "partner";
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}) {
  const kind = union.type === "partner" ? "União" : "Casamento";
  const start = formatDate(union.startDate);
  const end = formatDate(union.endDate);
  if (start && end) return `${kind} · ${start} – ${end}`;
  if (start) return `${kind} · ${start}`;
  if (end) return `${kind} · até ${end}`;
  return kind;
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
