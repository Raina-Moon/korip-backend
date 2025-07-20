/*
  Warnings:

  - Made the column `ticketReservationId` on table `TicketReview` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "TicketReview" DROP CONSTRAINT "TicketReview_ticketReservationId_fkey";

-- AlterTable
ALTER TABLE "TicketReview" ALTER COLUMN "ticketReservationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "TicketReview" ADD CONSTRAINT "TicketReview_ticketReservationId_fkey" FOREIGN KEY ("ticketReservationId") REFERENCES "TicketReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
