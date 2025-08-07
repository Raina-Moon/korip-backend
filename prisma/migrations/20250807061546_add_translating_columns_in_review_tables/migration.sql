-- AlterTable
ALTER TABLE "HotSpringLodgeReview" ADD COLUMN     "enTranslated" TEXT,
ADD COLUMN     "koTranslated" TEXT,
ADD COLUMN     "originalLang" TEXT;

-- AlterTable
ALTER TABLE "TicketReview" ADD COLUMN     "enTranslated" TEXT,
ADD COLUMN     "koTranslated" TEXT,
ADD COLUMN     "originalLang" TEXT;
