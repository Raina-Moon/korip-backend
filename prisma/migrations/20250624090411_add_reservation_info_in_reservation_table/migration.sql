/*
  Warnings:

  - Added the required column `firstName` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nationality` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `Reservation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "nationality" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL,
ADD COLUMN     "specialRequests" TEXT;
