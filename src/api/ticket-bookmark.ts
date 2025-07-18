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
    const { ticketId } = req.body;
    const userId = req.user?.userId;

    if (!ticketId || !userId) {
      return res
        .status(400)
        .json({ message: "Ticket ID and User ID are required" });
    }

    try {
      const existingBookmark = await prisma.ticketBookmark.findFirst({
        where: {
          userId: Number(userId),
          ticketTypeId: Number(ticketId),
        },
      });

      if (existingBookmark) {
        return res.status(409).json({ message: "Bookmark already exists" });
      }

      const bookmark = await prisma.ticketBookmark.create({
        data: {
          userId: Number(userId),
          ticketTypeId: Number(ticketId),
        },
      });

      return res.status(201).json(bookmark);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error creating bookmark" });
    }
  })
);

router.delete(
  "/:ticketId",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { ticketId } = req.params;
    const userId = req.user?.userId;

    if (!ticketId || !userId) {
      return res
        .status(400)
        .json({ message: "Ticket ID and User ID are required" });
    }

    try {
      const deleted = await prisma.ticketBookmark.deleteMany({
        where: {
          ticketTypeId: Number(ticketId),
          userId: Number(userId),
        },
      });

      if (deleted.count === 0) {
        return res.status(404).json({ message: "Bookmark not found" });
      }

      return res
        .status(200)
        .json({ message: "Bookmark deleted successfully" });
    } catch (error) {
      console.error(error);
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
      const bookmarks = await prisma.ticketBookmark.findMany({
        where: {
          userId: Number(userId),
        },
        include: {
          ticketType: {
            include: {
              lodge: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json(bookmarks);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error fetching bookmarks" });
    }
  })
);

export default router;
