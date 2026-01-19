-- CreateEnum
CREATE TYPE "PlaceImageType" AS ENUM ('FEATURE', 'COVER', 'GALLERY');

-- CreateEnum
CREATE TYPE "UserImageType" AS ENUM ('PICTURE', 'GALLERY');

-- CreateEnum
CREATE TYPE "UserActionType" AS ENUM ('CLICK', 'RATE_1', 'RATE_2', 'RATE_3', 'RATE_4', 'RATE_5', 'READ_REVIEWS', 'FAVORITE', 'GET_DIRECTION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone_number" VARCHAR(12),
    "first_name" VARCHAR(50),
    "last_name" VARCHAR(50),
    "date_of_birth" TIMESTAMP(3),
    "picture_url" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_images" (
    "user_id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "type" "UserImageType" NOT NULL DEFAULT 'GALLERY',

    CONSTRAINT "user_images_pkey" PRIMARY KEY ("user_id","image_id")
);

-- CreateTable
CREATE TABLE "place_images" (
    "place_id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "type" "PlaceImageType" NOT NULL DEFAULT 'GALLERY',

    CONSTRAINT "place_images_pkey" PRIMARY KEY ("place_id","image_id")
);

-- CreateTable
CREATE TABLE "review_images" (
    "review_id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,

    CONSTRAINT "review_images_pkey" PRIMARY KEY ("review_id","image_id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "from_google" BOOLEAN NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "main_category" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "google_map_link" TEXT NOT NULL,
    "website" TEXT,
    "phone_number" TEXT,
    "feature_image_url" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "ward" TEXT,
    "street" TEXT,
    "city" TEXT,
    "country_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_hours" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "open_time" TIME NOT NULL,
    "close_time" TIME NOT NULL,

    CONSTRAINT "opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attributes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_attributes" (
    "place_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "place_attributes_pkey" PRIMARY KEY ("place_id","attribute_id")
);

-- CreateTable
CREATE TABLE "user_attributes" (
    "user_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "user_attributes_pkey" PRIMARY KEY ("user_id","attribute_id")
);

-- CreateTable
CREATE TABLE "user_actions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "action" "UserActionType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "user_id" TEXT,
    "from_google" BOOLEAN NOT NULL,
    "name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "original_language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "attributes_name_key" ON "attributes"("name");

-- AddForeignKey
ALTER TABLE "user_images" ADD CONSTRAINT "user_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_images" ADD CONSTRAINT "user_images_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_images" ADD CONSTRAINT "place_images_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_images" ADD CONSTRAINT "place_images_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_attributes" ADD CONSTRAINT "place_attributes_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_attributes" ADD CONSTRAINT "place_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attributes" ADD CONSTRAINT "user_attributes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attributes" ADD CONSTRAINT "user_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_actions" ADD CONSTRAINT "user_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_actions" ADD CONSTRAINT "user_actions_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
