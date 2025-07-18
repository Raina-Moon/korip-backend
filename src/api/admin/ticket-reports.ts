import { PrismaClient } from "@prisma/client";
import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    try {
      const [reported, total] = await prisma.$transaction([
        prisma.ticketReportReview.findMany({
          include: {
            review: {
              include: {
                ticketType: {
                  include: {
                    lodge: true,
                  },
                },
                user: true,
              },
            },
            user: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.ticketReportReview.count(),
      ]);

      res.status(200).json({ data: reported, total, page, limit });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.patch(
  "/review/:reviewId/hide",
  asyncHandler(async (req, res) => {
    const { reviewId } = req.params;
    const { isHidden } = req.body;

    if (typeof isHidden !== "boolean") {
      return res.status(400).json({ message: "isHidden must be a boolean" });
    }

    try {
      const updated = await prisma.ticketReview.update({
        where: { id: Number(reviewId) },
        data: { isHidden },
      });

      res.status(200).json({
        message: "Review hidden successfully",
        updated,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.delete(
  "/report-only/:reviewId",
  asyncHandler(async (req, res) => {
    const { reviewId } = req.params;

    try {
      await prisma.ticketReportReview.deleteMany({
        where: { reviewId: Number(reviewId) },
      });

      res.status(200).json({
        message: "Review reports deleted successfully",
        reviewId: Number(reviewId),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.delete(
  "/review-only/:reviewId",
  asyncHandler(async (req, res) => {
    const { reviewId } = req.params;

    try {
      const existingReview = await prisma.ticketReview.findUnique({
        where: { id: Number(reviewId) },
      });

      if (!existingReview) {
        return res.status(404).json({ message: "Review not found" });
      }

      await prisma.ticketReview.delete({
        where: { id: Number(reviewId) },
      });

      res.status(200).json({
        message: "Review deleted successfully",
        reviewId: Number(reviewId),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

export default router;
