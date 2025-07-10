/*
  Warnings:

  - Added the required column `lodgeId` to the `TicketInventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTickets` to the `TicketType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TicketInventory" ADD COLUMN     "lodgeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TicketType" ADD COLUMN     "totalTickets" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "TicketInventory" ADD CONSTRAINT "TicketInventory_lodgeId_fkey" FOREIGN KEY ("lodgeId") REFERENCES "HotSpringLodge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
