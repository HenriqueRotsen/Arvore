import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SOURCES = `Fontes públicas (vínculos de parentesco não publicados — a família confirma no painel):
• SISU/UFMG 2020 — Henrique Rotsen Santos Ferreira, Ciência da Computação, Belo Horizonte
• Memorial acadêmico (2017) e perfil profissional — Leonardo Rotsen Santos Ferreira, Educação Física UFMG, Colégio Santo Agostinho e Minas Tênis Clube, BH`;

async function upsertPerson(data: {
  firstName: string;
  lastName: string;
  gender: "male" | "female" | "other";
  deceased?: boolean;
  notes: string;
}) {
  const existing = await prisma.person.findFirst({
    where: { firstName: data.firstName, lastName: data.lastName },
  });

  if (existing) {
    return prisma.person.update({
      where: { id: existing.id },
      data: {
        gender: data.gender,
        deceased: data.deceased ?? false,
        notes: data.notes,
      },
    });
  }

  return prisma.person.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      deceased: data.deceased ?? false,
      notes: data.notes,
    },
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "admin" },
    create: { email, passwordHash, role: "admin" },
  });

  await prisma.person.deleteMany({
    where: {
      firstName: "Rotsen",
      lastName: "",
      notes: { contains: "Pessoa âncora" },
    },
  });

  await upsertPerson({
    firstName: "Henrique Rotsen",
    lastName: "Santos Ferreira",
    gender: "male",
    notes: `Belo Horizonte, Minas Gerais. Ciência da Computação na UFMG (SISU 2020). ${SOURCES}`,
  });

  await upsertPerson({
    firstName: "Leonardo Rotsen",
    lastName: "Santos Ferreira",
    gender: "male",
    notes: `Belo Horizonte, Minas Gerais. Formado no Colégio Santo Agostinho; Educação Física na UFMG. Atleta e treinador de basquete (Minas Tênis Clube). Cerca de 18 anos em maio de 2017. ${SOURCES}`,
  });

  console.log(`Admin pronto: ${email}`);
  console.log(
    "Pessoas Rotsen de MG importadas dos registros públicos encontrados. Não há árvore genealógica publicada com pais/avós — vincule no painel.",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
