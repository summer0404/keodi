-- AlterTable
ALTER TABLE "group_sessions"
ADD COLUMN "close_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "group_sessions_status_vote_status_close_at_idx"
ON "group_sessions"("status", "vote_status", "close_at");
