/*
  Warnings:

  - You are about to drop the column `settings` on the `user_settings` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'FRIENDS_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "SearchRadius" AS ENUM ('KM_2', 'KM_5', 'KM_10', 'KM_20');

-- CreateEnum
CREATE TYPE "MinRating" AS ENUM ('ABOVE_1', 'ABOVE_2', 'ABOVE_3', 'ABOVE_4', 'FIVE_STAR');

-- CreateEnum
CREATE TYPE "AppLanguage" AS ENUM ('VI', 'EN');

-- AlterTable
ALTER TABLE "user_settings" DROP COLUMN "settings",
ADD COLUMN     "dark_mode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "default_min_rating" "MinRating" NOT NULL DEFAULT 'ABOVE_3',
ADD COLUMN     "default_search_radius" "SearchRadius" NOT NULL DEFAULT 'KM_5',
ADD COLUMN     "language" "AppLanguage" NOT NULL DEFAULT 'VI',
ADD COLUMN     "notify_group_invites" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_nearby_places" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_recommendations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_voting_results" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profile_visibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "share_location" BOOLEAN NOT NULL DEFAULT true;
