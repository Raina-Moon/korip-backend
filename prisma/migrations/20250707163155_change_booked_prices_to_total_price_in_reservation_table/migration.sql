/*
  Warnings:

  - You are about to drop the column `bookedBasePrice` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `bookedWeekendPrice` on the `Reservation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "bookedBasePrice",
DROP COLUMN "bookedWeekendPrice",
ADD COLUMN     "totalPrice" INTEGER;
