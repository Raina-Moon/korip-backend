-- CreateEnum
CREATE TYPE "CancelReason" AS ENUM ('AUTO_EXPIRED', 'USER_REQUESTED', 'ADMIN_FORCED');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "cancelReason" "CancelReason",
ALTER COLUMN "status" SET DEFAULT 'PENDING';
