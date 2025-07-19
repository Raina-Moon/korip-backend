import express from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/ticket/:ticketTypeId",
  asyncHandler(async (req, res) => {
    const { ticketTypeId } = req.params;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 5;

    try {
      const [reviews, totalCount] = await Promise.all([
        prisma.ticketReview.findMany({
          where: { ticketTypeId: Number(ticketTypeId), isHidden: false },
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.ticketReview.count({
          where: { ticketTypeId: Number(ticketTypeId), isHidden: false },
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
        prisma.ticketReview.findMany({
          where: { userId },
          include: {
            ticketType: {
              select: {
                id: true,
                name: true,
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
            reservation: {
              include: {
                ticketType: {
                  include: {
                    lodge: true,
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
        prisma.ticketReview.count({
          where: { userId },
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
    const { rating, comment, ticketTypeId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validReservation = await prisma.ticketReservation.findFirst({
        where: {
          userId,
          ticketTypeId: Number(ticketTypeId),
          status: "CONFIRMED",
          createdAt: {
            lt: new Date(),
          },
        },
      });

      if (!validReservation) {
        return res
          .status(403)
          .json({ message: "You can only review completed tickets" });
      }

      const newReview = await prisma.ticketReview.create({
        data: {
          rating,
          comment,
          ticketTypeId: Number(ticketTypeId),
          userId,
          ticketReservationId: validReservation.id,
        },
        include: {
          ticketType: true,
          user: true,
          reservation: true,
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

    if (typeof rating !== "number" || typeof comment !== "string") {
      return res.status(400).json({ message: "Invalid rating or comment" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const existingReview = await prisma.ticketReview.findUnique({
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

      const validReservation = await prisma.ticketReservation.findFirst({
        where: {
          userId,
          ticketTypeId: existingReview.ticketTypeId,
          status: "CONFIRMED",
          createdAt: {
            lt: new Date(),
          },
        },
      });

      if (!validReservation) {
        return res
          .status(403)
          .json({ message: "You can only edit reviews for completed tickets" });
      }

      const updatedReview = await prisma.ticketReview.update({
        where: { id: Number(id) },
        data: {
          rating,
          comment,
        },
        include: {
          ticketType: true,
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
      const existingReview = await prisma.ticketReview.findUnique({
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

      await prisma.ticketReview.delete({
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
