-- CreateEnum
CREATE TYPE "VoteStatus" AS ENUM ('OPEN', 'FINALIZED');

-- AlterTable
ALTER TABLE "group_sessions" ADD COLUMN     "finalized_at" TIMESTAMP(3),
ADD COLUMN     "vote_status" "VoteStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "winning_place_id" TEXT;

-- CreateTable
CREATE TABLE "session_votes" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_votes_member_id_key" ON "session_votes"("member_id");

-- AddForeignKey
ALTER TABLE "session_votes" ADD CONSTRAINT "session_votes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "group_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_votes" ADD CONSTRAINT "session_votes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "group_session_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_votes" ADD CONSTRAINT "session_votes_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_sessions" ADD CONSTRAINT "group_sessions_winning_place_id_fkey" FOREIGN KEY ("winning_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
