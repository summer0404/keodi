-- CreateEnum
CREATE TYPE "ReviewFlagReason" AS ENUM ('SPAM', 'FAKE', 'OFFENSIVE', 'IRRELEVANT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewFlagStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "flag_reason" "ReviewFlagReason",
ADD COLUMN     "flag_status" "ReviewFlagStatus",
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "owner_responded_at" TIMESTAMP(3),
ADD COLUMN     "owner_response" TEXT,
ADD COLUMN     "owner_response_edited_at" TIMESTAMP(3);
