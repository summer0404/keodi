-- CreateTable
CREATE TABLE "group_session_candidates" (
    "session_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "added_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_session_candidates_pkey" PRIMARY KEY ("session_id","place_id")
);

-- AddForeignKey
ALTER TABLE "group_session_candidates" ADD CONSTRAINT "group_session_candidates_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "group_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_session_candidates" ADD CONSTRAINT "group_session_candidates_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_session_candidates" ADD CONSTRAINT "group_session_candidates_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "group_session_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
