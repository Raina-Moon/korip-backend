import { PrismaClient } from "@prisma/client";
import cron from "node-cron";

const prisma = new PrismaClient();

cron.schedule("* * * * *", async () => {
  const now = new Date();
  const expiredTime = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago

  try {
    const expiredReservations = await prisma.reservation.updateMany({
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
        `Canceled ${expiredReservations.count} expired reservations.`
      );
    } else {
      console.log("No expired reservations to cancel.");
    }
  } catch (error) {
    console.error("Error canceling expired reservations:", error);
  }
});
