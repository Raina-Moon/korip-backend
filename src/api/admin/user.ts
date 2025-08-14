import { Prisma, PrismaClient } from "@prisma/client";
import express from "express";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const prisma = new PrismaClient();
const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nickname: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.ticketReportReview.deleteMany({ where: { userId } });
        await tx.reportReview.deleteMany({ where: { userId } });

        await tx.ticketBookmark.deleteMany({ where: { userId } });
        await tx.hotSpringLodgeBookmark.deleteMany({ where: { userId } });

        await tx.ticketReview.deleteMany({ where: { userId } });
        await tx.hotSpringLodgeReview.deleteMany({ where: { userId } });

        await tx.emailVerification.deleteMany({ where: { userId } });

        await tx.ticketReservation.deleteMany({ where: { userId } });

        await tx.reservation.deleteMany({ where: { userId } });

        await tx.user.delete({ where: { id: userId } });
      });

      return res
        .status(200)
        .json({ message: "User deleted successfully", user });
    } catch (err: any) {
      console.error("DELETE /v1/admin/user/:id error:", err);

      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        return res
          .status(409)
          .json({ message: "Cannot delete user due to related records." });
      }

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

    const [reviews, total] = await Promise.all([
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
