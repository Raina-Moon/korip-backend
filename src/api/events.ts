import express from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.event.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.event.count(),
    ]);

    res.json({ items, total, page, limit });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json(event);
  })
);

router.get(
  "/:id/adjacent",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const current = await prisma.event.findUnique({
      where: { id },
      select: { id: true, createdAt: true },
    });
    if (!current) return res.status(404).json({ message: "Event not found" });

    const prev = await prisma.event.findFirst({
      where: {
        OR: [
          { createdAt: { gt: current.createdAt } },
          { createdAt: current.createdAt, id: { gt: current.id } },
        ],
      },
      select: {
        id: true,
        title: true,
        titleEn: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const next = await prisma.event.findFirst({
      where: {
        OR: [
          { createdAt: { lt: current.createdAt } },
          { createdAt: current.createdAt, id: { lt: current.id } },
        ],
      },
      select: {
        id: true,
        title: true,
        titleEn: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    res.json({ prev, next });
  })
);

export default router;
