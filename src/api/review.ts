import express from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/lodge/:lodgeId",
  asyncHandler(async (req, res) => {
    const { lodgeId } = req.params;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 5;

    try {
      const [reviews, totalCount] = await Promise.all([
        prisma.hotSpringLodgeReview.findMany({
          where: { lodgeId: Number(lodgeId) },
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
              },
            },
            reservation: {
              include: {
                lodge: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.hotSpringLodgeReview.count({
          where: { lodgeId: Number(lodgeId) },
        }),
      ]);

      res.status(200).json({ reviews, totalCount });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.get(
  "/my",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user?.userId;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 5;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const [reviews, totalCount] = await Promise.all([
        prisma.hotSpringLodgeReview.findMany({
          where: { userId: userId },
          include: {
            lodge: {
              select: {
                id: true,
                name: true,
                address: true,
                images: true,
              },
            },
            reservation: {
              include: {
                lodge: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    images: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.hotSpringLodgeReview.count({
          where: { userId: userId },
        }),
      ]);

      res.status(200).json({ reviews, totalCount });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.post(
  "/",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { rating, comment, lodgeId, reservationId } = req.body;
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
          reservationId: Number(reservationId),
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

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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

      const validReservation = await prisma.reservation.findFirst({
        where: {
          userId: userId,
          lodgeId: existingReview.lodgeId,
          status: "CONFIRMED",
          checkOut: {
            lt: new Date(),
          },
        },
      });

      if (!validReservation) {
        return res
          .status(403)
          .json({ message: "You can only edit reviews for completed stays" });
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
