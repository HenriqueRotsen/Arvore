"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isDescendant, loadFamilyGraph } from "@/lib/relationships";
import { parseOptionalDate, parentChildSchema, partnershipSchema } from "@/lib/validations";

function orderedPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

function revalidateFamily(ids: string[]) {
  revalidatePath("/");
  revalidatePath("/arvore");
  revalidatePath("/pessoas");
  for (const id of new Set(ids)) {
    revalidatePath(`/pessoa/${id}`);
    revalidatePath(`/pessoas/${id}`);
  }
}

export async function addParentChild(formData: FormData): Promise<{ error?: string }> {
  const { parentId, childId } = parentChildSchema.parse({
    parentId: formData.get("parentId"),
    childId: formData.get("childId"),
  });

  if (parentId === childId) {
    return { error: "Uma pessoa não pode ser pai ou mãe de si mesma." };
  }

  const graph = await loadFamilyGraph();
  if (!graph.people.has(parentId) || !graph.people.has(childId)) {
    return { error: "Pessoa não encontrada." };
  }

  if (isDescendant(graph, childId, parentId)) {
    return {
      error:
        "Esse vínculo formaria um ciclo. O pai/mãe não pode ser descendente do filho.",
    };
  }

  const currentParents = graph.parentsOf.get(childId) ?? [];
  if (currentParents.length >= 2 && !currentParents.includes(parentId)) {
    return { error: "Uma pessoa pode ter no máximo dois pais cadastrados." };
  }

  const otherParentId = String(formData.get("otherParentId") ?? "").trim();
  if (otherParentId) {
    if (otherParentId === parentId || otherParentId === childId) {
      return { error: "Escolha outro progenitor diferente." };
    }
    if (!graph.people.has(otherParentId)) {
      return { error: "O outro progenitor não foi encontrado." };
    }
    if (isDescendant(graph, childId, otherParentId)) {
      return {
        error:
          "Esse vínculo formaria um ciclo. O pai/mãe não pode ser descendente do filho.",
      };
    }
    const parentsAfter = new Set([...currentParents, parentId, otherParentId]);
    if (parentsAfter.size > 2) {
      return {
        error:
          "Este filho já tem outro pai/mãe. Remova o vínculo antigo para ligá-lo a este casamento.",
      };
    }
  }

  await prisma.parentChild.upsert({
    where: {
      parentId_childId: { parentId, childId },
    },
    update: {},
    create: { parentId, childId },
  });

  if (otherParentId) {
    await prisma.parentChild.upsert({
      where: {
        parentId_childId: { parentId: otherParentId, childId },
      },
      update: {},
      create: { parentId: otherParentId, childId },
    });
    const [personAId, personBId] = orderedPair(parentId, otherParentId);
    await prisma.partnership.upsert({
      where: { personAId_personBId: { personAId, personBId } },
      update: {},
      create: { personAId, personBId, type: "married" },
    });
  }

  revalidateFamily(
    otherParentId ? [parentId, childId, otherParentId] : [parentId, childId],
  );
  return {};
}

export async function removeParentChild(formData: FormData) {
  const { parentId, childId } = parentChildSchema.parse({
    parentId: formData.get("parentId"),
    childId: formData.get("childId"),
  });

  await prisma.parentChild.deleteMany({
    where: { parentId, childId },
  });

  revalidateFamily([parentId, childId]);
}

export async function addPartnership(formData: FormData): Promise<{ error?: string }> {
  const parsed = partnershipSchema.parse({
    personAId: formData.get("personAId"),
    personBId: formData.get("personBId"),
    type: formData.get("type") || "married",
    startDate: String(formData.get("startDate") ?? "").trim() || undefined,
    endDate: String(formData.get("endDate") ?? "").trim() || undefined,
  });

  if (parsed.personAId === parsed.personBId) {
    return { error: "Selecione duas pessoas diferentes." };
  }

  const [personAId, personBId] = orderedPair(parsed.personAId, parsed.personBId);

  await prisma.partnership.upsert({
    where: { personAId_personBId: { personAId, personBId } },
    update: {
      type: parsed.type,
      startDate: parseOptionalDate(parsed.startDate),
      endDate: parseOptionalDate(parsed.endDate),
    },
    create: {
      personAId,
      personBId,
      type: parsed.type,
      startDate: parseOptionalDate(parsed.startDate),
      endDate: parseOptionalDate(parsed.endDate),
    },
  });

  revalidateFamily([personAId, personBId]);
  return {};
}

export async function removePartnership(formData: FormData) {
  const personAId = String(formData.get("personAId") ?? "");
  const personBId = String(formData.get("personBId") ?? "");
  const [a, b] = orderedPair(personAId, personBId);

  await prisma.partnership.deleteMany({
    where: { personAId: a, personBId: b },
  });

  revalidateFamily([a, b]);
}
