import { PrismaClient } from "@prisma/client";
import express from "express";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";
import { start } from "repl";
import { addDays, startOfDay } from "date-fns";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/reviews", authToken, async (req: AuthRequest, res) => {
  const userId = req.user?.userId;

  try {
    const reviews = await prisma.hotSpringLodgeReview.findMany({
      where: {
        userId: userId ? Number(userId) : undefined,
      },
      include: {
        lodge: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/bookmarks", authToken, async (req: AuthRequest, res) => {
  const userId = req.user?.userId;

  try {
    const bookmarks = await prisma.hotSpringLodgeBookmark.findMany({
      where: {
        userId: userId ? Number(userId) : undefined,
      },
      include: {
        lodge: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(bookmarks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch(
  "/nickname",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user?.userId;
    const { nickname } = req.body;

    if (!nickname) {
      return res.status(400).json({ message: "Nickname is required" });
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { nickname },
      });

      if (existingUser && existingUser.id !== Number(userId)) {
        return res.status(400).json({ message: "Nickname already exists" });
      }

      await prisma.user.update({
        where: { id: Number(userId) },
        data: { nickname },
      });

      res.status(200).json({ message: "Nickname updated successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.delete("/", authToken, async (req: AuthRequest, res) => {
  const userId = req.user?.userId;

  try {
    await prisma.$transaction(async (tx) => {
      const reservations = await tx.reservation.findMany({
        where: { userId: Number(userId) },
      });

      for (const reservation of reservations) {
        if (reservation.status === "CONFIRMED") {
          const { lodgeId, roomTypeId, checkIn, checkOut, roomCount } =
            reservation;

          let current = new Date(checkIn);
          const end = new Date(checkOut);

          while (current < end) {
            await tx.roomInventory.updateMany({
              where: {
                lodgeId,
                roomTypeId,
                date: {
                  gte: startOfDay(current),
                  lt: startOfDay(addDays(current, 1)),
                },
              },
              data: {
                availableRooms: {
                  increment: roomCount,
                },
              },
            });
            current.setDate(current.getDate() + 1);
          }
        }
      }

      await tx.reservation.deleteMany({
        where: { userId: Number(userId) },
      });

      await tx.reportReview.deleteMany({
        where: { userId: Number(userId) },
      });

      await tx.hotSpringLodgeReview.deleteMany({
        where: { userId: Number(userId) },
      });

      await tx.hotSpringLodgeBookmark.deleteMany({
        where: { userId: Number(userId) },
      });

      await tx.emailVerification.deleteMany({
        where: { userId: Number(userId) },
      });

      await tx.user.delete({
        where: { id: Number(userId) },
      });
    });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
