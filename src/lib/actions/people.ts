"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deletePhotoFile, savePersonPhoto } from "@/lib/photos";
import { parseOptionalDate, personSchema } from "@/lib/validations";

function readPersonForm(formData: FormData) {
  const deceased = formData.get("deceased") === "on";
  const data = personSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") ?? "",
    gender: formData.get("gender") || "other",
    birthDate: formData.get("birthDate") || undefined,
    birthCity: formData.get("birthCity") || undefined,
    deathDate: deceased ? formData.get("deathDate") || undefined : undefined,
    notes: formData.get("notes") || undefined,
    deceased,
  });

  return {
    ...data,
    deathDate: deceased ? parseOptionalDate(data.deathDate) : null,
    birthDate: parseOptionalDate(data.birthDate),
    birthCity: data.birthCity?.trim() || null,
  };
}

export async function createPerson(formData: FormData) {
  const data = readPersonForm(formData);
  const photo = formData.get("photo");

  const person = await prisma.person.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName ?? "",
      gender: data.gender,
      birthDate: data.birthDate,
      birthCity: data.birthCity,
      deathDate: data.deathDate,
      deceased: data.deceased,
      notes: data.notes?.trim() || null,
    },
  });

  if (photo instanceof File && photo.size > 0) {
    const photoUrl = await savePersonPhoto(person.id, photo);
    if (photoUrl) {
      await prisma.person.update({
        where: { id: person.id },
        data: { photoUrl },
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/arvore");
  revalidatePath("/pessoas");
  revalidatePath(`/pessoa/${person.id}`);
  redirect(`/pessoas/${person.id}`);
}

export async function updatePerson(personId: string, formData: FormData) {
  const data = readPersonForm(formData);
  const photo = formData.get("photo");
  const existing = await prisma.person.findUnique({ where: { id: personId } });
  if (!existing) {
    throw new Error("Pessoa não encontrada.");
  }

  let photoUrl = existing.photoUrl;
  if (photo instanceof File && photo.size > 0) {
    await deletePhotoFile(existing.photoUrl);
    photoUrl = await savePersonPhoto(personId, photo);
  }

  await prisma.person.update({
    where: { id: personId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName ?? "",
      gender: data.gender,
      birthDate: data.birthDate,
      birthCity: data.birthCity,
      deathDate: data.deathDate,
      deceased: data.deceased,
      notes: data.notes?.trim() || null,
      photoUrl,
    },
  });

  revalidatePath("/");
  revalidatePath("/arvore");
  revalidatePath("/pessoas");
  revalidatePath(`/pessoas/${personId}`);
  revalidatePath(`/pessoa/${personId}`);
}

export async function deletePerson(personId: string) {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) {
    throw new Error("Pessoa não encontrada.");
  }
  await deletePhotoFile(person.photoUrl);
  await prisma.person.delete({ where: { id: personId } });
  revalidatePath("/");
  revalidatePath("/arvore");
  revalidatePath("/pessoas");
  redirect("/pessoas");
}
