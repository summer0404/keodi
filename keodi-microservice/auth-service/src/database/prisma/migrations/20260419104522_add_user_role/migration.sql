-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'OWNER_PENDING', 'OWNER', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
