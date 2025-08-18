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
      prisma.news.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.news.count(),
    ]);

    res.json({ items, total, page, limit });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const news = await prisma.news.findUnique({
      where: { id },
    });

    if (!news) return res.status(404).json({ message: "News not found" });

    res.json(news);
  })
);

router.get(
  "/:id/adjacent",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const current = await prisma.news.findUnique({
      where: { id },
      select: { id: true, createdAt: true },
    });
    if (!current) return res.status(404).json({ message: "News not found" });

    const prev = await prisma.news.findFirst({
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

    const next = await prisma.news.findFirst({
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
