-- DropForeignKey
ALTER TABLE "ReportReview" DROP CONSTRAINT "ReportReview_reviewId_fkey";

-- AddForeignKey
ALTER TABLE "ReportReview" ADD CONSTRAINT "ReportReview_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "HotSpringLodgeReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
