/*
  Warnings:

  - Made the column `date` on table `RoomInventory` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "RoomInventory" ALTER COLUMN "date" SET NOT NULL;
