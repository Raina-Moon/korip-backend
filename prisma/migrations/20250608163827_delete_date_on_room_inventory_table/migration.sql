/*
  Warnings:

  - You are about to drop the column `date` on the `RoomInventory` table. All the data in the column will be lost.
  - Added the required column `totalRooms` to the `RoomInventory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RoomInventory" DROP COLUMN "date",
ADD COLUMN     "totalRooms" INTEGER NOT NULL;
