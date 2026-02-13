-- CreateEnum
CREATE TYPE "GroupSessionStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "group_sessions" (
    "session_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "share_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "GroupSessionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "group_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_sessions_share_code_key" ON "group_sessions"("share_code");

-- AddForeignKey
ALTER TABLE "group_sessions" ADD CONSTRAINT "group_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
