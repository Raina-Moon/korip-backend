/*
  Warnings:

  - You are about to drop the `RoomPricing` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SeasonalType" AS ENUM ('PEAK', 'OFF');

-- DropForeignKey
ALTER TABLE "RoomPricing" DROP CONSTRAINT "RoomPricing_roomTypeId_fkey";

-- AlterTable
ALTER TABLE "RoomType" ADD COLUMN     "weekendPrice" INTEGER;

-- DropTable
DROP TABLE "RoomPricing";

-- DropEnum
DROP TYPE "PriceType";

-- CreateTable
CREATE TABLE "SeasonalPricing" (
    "id" SERIAL NOT NULL,
    "roomTypeId" INTEGER NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "price" INTEGER NOT NULL,
    "type" "SeasonalType" NOT NULL,

    CONSTRAINT "SeasonalPricing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SeasonalPricing" ADD CONSTRAINT "SeasonalPricing_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
