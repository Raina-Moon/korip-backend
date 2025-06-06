import { PrismaClient } from "@prisma/client";
import express from "express";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  try {
    const reported = await prisma.reportReview.findMany({
      include: {
        review: {
          include: {
            lodge: true,
            user: true,
          },
        },
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(reported);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/review/:reviewId", async (req, res) => {
  const { reviewId } = req.params;
  try {
    const existingReview = await prisma.hotSpringLodgeReview.findUnique({
      where: { id: Number(reviewId) },
    });
    if (!existingReview) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    await prisma.reportReview.deleteMany({
      where: { reviewId: Number(reviewId) },
    });

    await prisma.hotSpringLodgeReview.delete({
      where: { id: Number(reviewId) },
    });

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/review/:reviewId/hide", async (req, res) => {
  const { reviewId } = req.params;
  try {
    const updated = await prisma.hotSpringLodgeReview.update({
      where: { id: Number(reviewId) },
      data: { isHidden: true },
    });
    res.status(200).json({
      message: "Review hidden successfully",
      updated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
