/*
  Warnings:

  - You are about to drop the column `ownerId` on the `places` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "places" DROP CONSTRAINT "places_ownerId_fkey";

-- AlterTable
ALTER TABLE "places" DROP COLUMN "ownerId",
ADD COLUMN     "owner_id" TEXT;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
