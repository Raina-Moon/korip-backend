import express from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.post(
  "/",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { rating, comment, lodgeId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validReservation = await prisma.reservation.findFirst({
        where: {
          userId: userId,
          lodgeId: Number(lodgeId),
          status: "CONFIRMED",
          checkOut: {
            lt: new Date(),
          },
        },
      });
      if (!validReservation) {
        return res
          .status(403)
          .json({ message: "You can only review completed stays" });
      }

      const newReview = await prisma.hotSpringLodgeReview.create({
        data: {
          rating,
          comment,
          lodgeId: Number(lodgeId),
          userId: userId,
        },
        include: {
          lodge: true,
          user: true,
        },
      });

      res.status(201).json(newReview);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.patch(
  "/:id",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.userId;

    try {
      const existingReview = await prisma.hotSpringLodgeReview.findUnique({
        where: { id: Number(id) },
      });

      if (!existingReview) {
        return res.status(404).json({ message: "Review not found" });
      }

      if (existingReview.userId !== userId) {
        return res
          .status(403)
          .json({ message: "You can only edit your own reviews" });
      }

      const updatedReview = await prisma.hotSpringLodgeReview.update({
        where: { id: Number(id) },
        data: {
          rating,
          comment,
        },
        include: {
          lodge: true,
          user: true,
        },
      });

      res.status(200).json(updatedReview);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.delete(
  "/:id",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    try {
      const existingReview = await prisma.hotSpringLodgeReview.findUnique({
        where: { id: Number(id) },
      });

      if (!existingReview) {
        return res.status(404).json({ message: "Review not found" });
      }

      if (existingReview.userId !== userId) {
        return res
          .status(403)
          .json({ message: "You can only delete your own reviews" });
      }

      await prisma.hotSpringLodgeReview.delete({
        where: { id: Number(id) },
      });

      res.status(200).json({ message: "Review deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

export default router;
