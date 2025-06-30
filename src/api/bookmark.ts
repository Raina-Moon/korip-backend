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
    const { lodgeId } = req.body;
    const userId = req.user?.userId;

    if (!lodgeId || !userId) {
      return res
        .status(400)
        .json({ message: "Lodge ID and User ID are required" });
    }

    try {
      const existingBookmark = await prisma.hotSpringLodgeBookmark.findFirst({
        where: {
          userId: Number(userId),
          lodgeId: Number(lodgeId),
        },
      });

      if (existingBookmark) {
        return res.status(409).json({ message: "Bookmark already exists" });
      }

      const bookmark = await prisma.hotSpringLodgeBookmark.create({
        data: {
          userId: Number(userId),
          lodgeId: Number(lodgeId),
        },
      });

      return res.status(201).json(bookmark);
    } catch (error) {
      return res.status(500).json({ message: "Error creating bookmark" });
    }
  })
);

router.delete(
  "/:lodgeId",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { lodgeId } = req.params;
    const userId = req.user?.userId;

    if (!lodgeId || !userId) {
      return res
        .status(400)
        .json({ message: "Lodge ID and User ID are required" });
    }

    try {
      const deleted = await prisma.hotSpringLodgeBookmark.deleteMany({
        where: {
          lodgeId: Number(lodgeId),
          userId: Number(userId),
        },
      });

      if (deleted.count === 0) {
        return res.status(404).json({ message: "Bookmark not found" });
      }

      return res.status(200).json({ message: "Bookmark deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Error deleting bookmark" });
    }
  })
);

router.get(
  "/",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    try {
      const bookmarks = await prisma.hotSpringLodgeBookmark.findMany({
        where: {
          userId: Number(userId),
        },
        include: { lodge: true },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json(bookmarks);
    } catch (error) {
      return res.status(500).json({ message: "Error fetching bookmarks" });
    }
  })
);

export default router;
