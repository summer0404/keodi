/*
  Warnings:

  - The primary key for the `friendships` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `friendships` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "friendships_user_id_friend_id_key";

-- AlterTable
ALTER TABLE "friendships" DROP CONSTRAINT "friendships_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("user_id", "friend_id");
