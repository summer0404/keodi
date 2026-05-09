-- CreateEnum
CREATE TYPE "GroupSessionActivityType" AS ENUM ('MEMBER_JOINED', 'MEMBER_LEFT', 'CATEGORIES_UPDATED', 'RECOMMENDATIONS_REFRESHED', 'VOTE_FINALIZED', 'SESSION_CLOSED');

-- CreateTable
CREATE TABLE "group_session_activities" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "type" "GroupSessionActivityType" NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_session_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_session_activities_session_id_created_at_idx" ON "group_session_activities"("session_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "group_session_activities" ADD CONSTRAINT "group_session_activities_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "group_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
