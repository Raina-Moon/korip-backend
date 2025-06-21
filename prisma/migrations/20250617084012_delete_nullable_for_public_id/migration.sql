/*
  Warnings:

  - Made the column `publicId` on table `HotSpringLodgeImage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "HotSpringLodgeImage" ALTER COLUMN "publicId" SET NOT NULL;
