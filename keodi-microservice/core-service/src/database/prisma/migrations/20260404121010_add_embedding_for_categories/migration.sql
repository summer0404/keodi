-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "embedding" vector(384);
