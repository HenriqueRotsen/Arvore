import { z } from "zod";

export const personSchema = z.object({
  firstName: z.string().trim().min(1, "Informe o nome"),
  lastName: z.string().trim().optional().default(""),
  gender: z.enum(["male", "female", "other"]).default("other"),
  birthDate: z.string().optional(),
  birthCity: z.string().optional(),
  deathDate: z.string().optional(),
  notes: z.string().optional(),
  deceased: z.boolean().optional().default(false),
});

export const parentChildSchema = z.object({
  parentId: z.string().min(1),
  childId: z.string().min(1),
});

export const partnershipSchema = z.object({
  personAId: z.string().min(1),
  personBId: z.string().min(1),
  type: z.enum(["married", "partner"]).default("married"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export function parseOptionalDate(value: string | undefined | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
