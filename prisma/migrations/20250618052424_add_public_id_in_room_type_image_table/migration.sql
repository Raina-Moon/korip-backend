/*
  Warnings:

  - Added the required column `publicId` to the `RoomTypeImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RoomTypeImage" ADD COLUMN     "publicId" TEXT NOT NULL;
