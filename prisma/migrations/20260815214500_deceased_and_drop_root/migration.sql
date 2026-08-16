-- AlterTable
ALTER TABLE "Person" DROP COLUMN "isRoot",
ADD COLUMN     "deceased" BOOLEAN NOT NULL DEFAULT false;
