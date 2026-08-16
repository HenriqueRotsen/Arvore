import { PrismaClient } from "@prisma/client";
import { applySupabaseDbUrls } from "./apply-db-urls";

applySupabaseDbUrls();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: number;
};

const SCHEMA_VERSION = 4;

if (globalForPrisma.prisma && globalForPrisma.prismaSchemaVersion !== SCHEMA_VERSION) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
}
