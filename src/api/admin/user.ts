import { PrismaClient } from "@prisma/client";
import express from "express";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const prisma = new PrismaClient();
const router = express.Router();

router.get(
  "/",
  asyncHandler(async (_, res) => {
    const page = parseInt(_.query.page as string) || 1;
    const limit = parseInt(_.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    try {
      const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          nickname: true,
          role: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);
      res.status(200).json({ data: users, total, page, limit });
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const userId = Number(id);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, nickname: true, email: true },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      return res
        .status(200)
        .json({ message: "User deleted successfully", user });
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.patch(
  "/:id/role",
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const userId = Number(id);
    const { role } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (typeof role !== "string" || !["USER", "ADMIN"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        createdAt: true,
      },
    });

    return res
      .status(200)
      .json({ message: "User role updated successfully", user: updatedUser });
  })
);

router.get(
  "/:id/reservations",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = Number(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where: { userId },
        include: {
          lodge: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.reservation.count({
        where: { userId },
      }),
    ]);

    return res.status(200).json({ data: reservations, total, page, limit });
  })
);

router.get(
  "/:id/reviews",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = Number(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [reviews,total] = await Promise.all([
      prisma.hotSpringLodgeReview.findMany({
        where: { userId },
        include: {
          lodge: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.hotSpringLodgeReview.count({
        where: { userId },
      }),
    ]);

    return res.status(200).json({ data: reviews, total, page, limit });
  })
);

export default router;
