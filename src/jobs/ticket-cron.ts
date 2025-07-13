import { PrismaClient } from "@prisma/client";
import cron from "node-cron";

const prisma = new PrismaClient();

cron.schedule("* * * * *", async () => {
  const now = new Date();
  const expiredTime = new Date(now.getTime() - 15 * 60 * 1000); // 15 mins ago

  try {
    const expiredReservations = await prisma.ticketReservation.updateMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: expiredTime,
        },
      },
      data: {
        status: "CANCELLED",
        cancelReason: "AUTO_EXPIRED",
      },
    });

    if (expiredReservations.count > 0) {
      console.log(
        `Canceled ${expiredReservations.count} expired ticket reservations.`
      );
    } else {
      console.log("No expired ticket reservations to cancel.");
    }
  } catch (error) {
    console.error("Error canceling expired ticket reservations:", error);
  }
});
