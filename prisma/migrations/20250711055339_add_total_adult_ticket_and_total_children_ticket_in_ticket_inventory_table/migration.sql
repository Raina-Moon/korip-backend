/*
  Warnings:

  - You are about to drop the column `availableTickets` on the `TicketInventory` table. All the data in the column will be lost.
  - You are about to drop the column `totalTickets` on the `TicketInventory` table. All the data in the column will be lost.
  - You are about to drop the column `totalTickets` on the `TicketType` table. All the data in the column will be lost.
  - Added the required column `availableAdultTickets` to the `TicketInventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `availableChildTickets` to the `TicketInventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAdultTickets` to the `TicketInventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalChildTickets` to the `TicketInventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAdultTickets` to the `TicketType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalChildTickets` to the `TicketType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TicketInventory" DROP COLUMN "availableTickets",
DROP COLUMN "totalTickets",
ADD COLUMN     "availableAdultTickets" INTEGER NOT NULL,
ADD COLUMN     "availableChildTickets" INTEGER NOT NULL,
ADD COLUMN     "totalAdultTickets" INTEGER NOT NULL,
ADD COLUMN     "totalChildTickets" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TicketType" DROP COLUMN "totalTickets",
ADD COLUMN     "totalAdultTickets" INTEGER NOT NULL,
ADD COLUMN     "totalChildTickets" INTEGER NOT NULL;
