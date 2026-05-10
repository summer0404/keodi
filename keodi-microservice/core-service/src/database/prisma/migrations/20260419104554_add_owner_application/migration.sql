-- CreateEnum
CREATE TYPE "OwnerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "owner_applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "business_phone" TEXT NOT NULL,
    "business_address" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,
    "business_website" TEXT,
    "proof_document_urls" TEXT[],
    "status" "OwnerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_applications_user_id_key" ON "owner_applications"("user_id");
