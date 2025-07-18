-- AlterTable
ALTER TABLE "TicketReview" ADD COLUMN     "ticketReservationId" INTEGER;

-- AddForeignKey
ALTER TABLE "TicketReview" ADD CONSTRAINT "TicketReview_ticketReservationId_fkey" FOREIGN KEY ("ticketReservationId") REFERENCES "TicketReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
