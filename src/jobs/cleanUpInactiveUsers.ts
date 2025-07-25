import { PrismaClient } from "@prisma/client";
import cron from "node-cron";
import { subMinutes } from "date-fns";

const prisma = new PrismaClient();

cron.schedule("*/10 * * * *", async () => {
  console.log("Running cleanup task...");

  const cutoffTime = subMinutes(new Date(), 15);

  const usersToDelete = await prisma.user.findMany({
    where: {
      nickname: "",
      password: null,
      EmailVerification: {
        some: {
          verified: false,
          createdAt: { lt: cutoffTime },
        },
      },
    },
    include: {
      EmailVerification: true,
    },
  });

  for (const user of usersToDelete) {
    await prisma.emailVerification.deleteMany({
      where: { email: user.email },
    });

    await prisma.user.delete({
      where: { id: user.id },
    });

    console.log(`Deleted unverified user: ${user.email}`);
  }
});
