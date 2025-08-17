/*
  Warnings:

  - You are about to drop the `SupportTicket` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('PENDING', 'ANSWERED');

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_userId_fkey";

-- DropTable
DROP TABLE "SupportTicket";

-- DropEnum
DROP TYPE "TicketStatus";

-- CreateTable
CREATE TABLE "Support" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" "SupportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "Support_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Support" ADD CONSTRAINT "Support_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
