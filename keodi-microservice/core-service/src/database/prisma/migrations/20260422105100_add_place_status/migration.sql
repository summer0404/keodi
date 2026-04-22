-- CreateEnum
CREATE TYPE "PlaceStatus" AS ENUM ('UNDER_REVIEW', 'PUBLISHED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "places"
ADD COLUMN "status" "PlaceStatus" NOT NULL DEFAULT 'PUBLISHED';
