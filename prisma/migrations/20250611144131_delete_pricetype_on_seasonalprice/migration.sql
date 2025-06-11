/*
  Warnings:

  - You are about to drop the column `price` on the `SeasonalPricing` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `SeasonalPricing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SeasonalPricing" DROP COLUMN "price",
DROP COLUMN "type",
ADD COLUMN     "basePrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weekendPrice" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "SeasonalType";
