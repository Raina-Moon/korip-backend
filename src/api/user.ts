import { PrismaClient } from "@prisma/client";
import express from "express";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/reservations",
  authToken,
  async (req: AuthRequest, res) => {
    const userId = req.user?.userId;

    try {
      const reservations = await prisma.reservation.findMany({
        where: {
          userId: userId ? Number(userId) : undefined,
        },
        include: {
          lodge: true,
          roomType: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.status(200).json(reservations);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

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
})

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
})

export default router;
