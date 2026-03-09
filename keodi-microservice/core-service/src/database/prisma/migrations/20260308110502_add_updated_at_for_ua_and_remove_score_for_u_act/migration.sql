/*
  Warnings:

  - You are about to drop the column `score` on the `user_actions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_actions" DROP COLUMN "score";

-- AlterTable
ALTER TABLE "user_attributes" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
