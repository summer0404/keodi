-- CreateEnum
CREATE TYPE "OwnershipClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISPUTED');

-- CreateTable
CREATE TABLE "ownership_claims" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "proof_document_urls" TEXT[],
    "additional_notes" TEXT,
    "status" "OwnershipClaimStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ownership_claims_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ownership_claims" ADD CONSTRAINT "ownership_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_claims" ADD CONSTRAINT "ownership_claims_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
