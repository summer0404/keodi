/*
  Warnings:

  - You are about to drop the column `embedding` on the `categories` table. All the data in the column will be lost.
  - Added the required column `raw_query` to the `searches` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "group_sessions_status_vote_status_close_at_idx";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "embedding";

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "embedding_full" vector(384),
ADD COLUMN     "embedding_title" vector(384);

-- AlterTable
ALTER TABLE "searches" ADD COLUMN     "raw_query" TEXT NOT NULL,
ALTER COLUMN "extracted_term" DROP NOT NULL;
