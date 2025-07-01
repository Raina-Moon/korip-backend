import { PrismaClient } from "@prisma/client";
import express from "express";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.post(
  "/",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { reviewId, reason } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!reviewId || !reason) {
      return res
        .status(400)
        .json({ message: "Review ID and reason are required" });
    }

    try {
      const report = await prisma.reportReview.create({
        data: {
          reviewId: Number(reviewId),
          reason,
          userId: Number(userId),
        },
      });
      return res.status(201).json({
        message: "Review reported successfully",
        report,
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  })
);

export default router;
