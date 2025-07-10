-- CreateTable
CREATE TABLE "TicketType" (
    "id" SERIAL NOT NULL,
    "lodgeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "adultPrice" INTEGER NOT NULL,
    "childPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketInventory" (
    "id" SERIAL NOT NULL,
    "ticketTypeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalTickets" INTEGER NOT NULL,
    "availableTickets" INTEGER NOT NULL,

    CONSTRAINT "TicketInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketReservation" (
    "id" SERIAL NOT NULL,
    "ticketTypeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "totalPrice" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "cancelReason" "CancelReason",
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "specialRequests" TEXT,

    CONSTRAINT "TicketReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketReview" (
    "id" SERIAL NOT NULL,
    "ticketTypeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TicketReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketBookmark" (
    "id" SERIAL NOT NULL,
    "ticketTypeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketReportReview" (
    "id" SERIAL NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketReportReview_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_lodgeId_fkey" FOREIGN KEY ("lodgeId") REFERENCES "HotSpringLodge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketInventory" ADD CONSTRAINT "TicketInventory_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReservation" ADD CONSTRAINT "TicketReservation_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReservation" ADD CONSTRAINT "TicketReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReview" ADD CONSTRAINT "TicketReview_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReview" ADD CONSTRAINT "TicketReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketBookmark" ADD CONSTRAINT "TicketBookmark_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketBookmark" ADD CONSTRAINT "TicketBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReportReview" ADD CONSTRAINT "TicketReportReview_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "TicketReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReportReview" ADD CONSTRAINT "TicketReportReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
