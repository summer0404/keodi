-- AlterTable
ALTER TABLE "user_categories" ADD COLUMN     "is_onboard_selected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_interacted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "extracted_term" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
