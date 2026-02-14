-- CreateTable
CREATE TABLE "group_session_members" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "guest_id" TEXT,
    "nickname" VARCHAR(50),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_session_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_session_members_session_id_user_id_key" ON "group_session_members"("session_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_session_members_session_id_guest_id_key" ON "group_session_members"("session_id", "guest_id");

-- AddForeignKey
ALTER TABLE "group_session_members" ADD CONSTRAINT "group_session_members_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "group_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_session_members" ADD CONSTRAINT "group_session_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
