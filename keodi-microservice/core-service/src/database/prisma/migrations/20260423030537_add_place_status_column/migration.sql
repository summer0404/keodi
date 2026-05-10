-- CreateEnum
CREATE TYPE "PlaceStatus" AS ENUM ('UNDER_REVIEW', 'PUBLISHED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "status" "PlaceStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AddForeignKey
ALTER TABLE "owner_applications" ADD CONSTRAINT "owner_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
