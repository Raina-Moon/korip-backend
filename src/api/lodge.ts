import express from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/:id/review", authToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user?.userId;
  try {
    const lodge = await prisma.hotSpringLodge.findUnique({
      where: { id: Number(id) },
    });

    if (!lodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }

    const existingReview = await prisma.hotSpringLodgeReview.findFirst({
      where: {
        lodgeId: lodge.id,
        userId: userId!,
      },
    });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this lodge" });
    }

    const newReview = await prisma.hotSpringLodgeReview.create({
      data: {
        lodgeId: lodge.id,
        userId: userId!,
        rating,
        comment,
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
});

router.get("/:id/reviews", async (req, res) => {
  const { id } = req.params;
  try {
    const reviews = await prisma.hotSpringLodgeReview.findMany({
      where: { lodgeId: Number(id) },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const lodge = await prisma.hotSpringLodge.findUnique({
      where: { id: Number(id) },
      include: {
        HotSpringLodgeImage: true,
        HotSpringLodgeDetail: true,
      },
    });

    if (!lodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }

    res.status(200).json(lodge);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  const { name, address, description, accommodationType } = req.query;

  try {
    const lodges = await prisma.hotSpringLodge.findMany({
      where: {
        name: name
          ? { contains: String(name), mode: "insensitive" }
          : undefined,
        address: address
          ? { contains: String(address), mode: "insensitive" }
          : undefined,
        description: description
          ? { contains: String(description), mode: "insensitive" }
          : undefined,
        accommodationType: accommodationType
          ? { equals: String(accommodationType) }
          : undefined,
      },
      include: {
        HotSpringLodgeImage: true,
        HotSpringLodgeDetail: true,
      },
    });

    res.status(200).json(lodges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
