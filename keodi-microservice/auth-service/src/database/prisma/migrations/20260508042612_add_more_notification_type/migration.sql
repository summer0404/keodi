-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_LOW_RATING';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_FLAG_OUTCOME';
ALTER TYPE "NotificationType" ADD VALUE 'NEARBY_PLACE';
ALTER TYPE "NotificationType" ADD VALUE 'RECOMMENDATION';
