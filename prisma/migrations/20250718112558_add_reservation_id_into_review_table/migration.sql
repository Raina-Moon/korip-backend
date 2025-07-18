-- AlterTable
ALTER TABLE "HotSpringLodgeReview" ADD COLUMN     "reservationId" INTEGER;

-- AddForeignKey
ALTER TABLE "HotSpringLodgeReview" ADD CONSTRAINT "HotSpringLodgeReview_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
