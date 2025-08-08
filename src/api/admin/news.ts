import express from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../../utils/asyncHandler";
import { translateText } from "../../utils/deepl";
import { translateHtmlContent } from "../../utils/translateHtml";

const router = express.Router();
const prisma = new PrismaClient();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { title, content } = req.body;

    const titleEn = await translateText(title, "EN");
    const contentEn = await translateHtmlContent(content, "EN");
    const news = await prisma.news.create({
      data: { title, content, titleEn, contentEn },
    });
    res.status(201).json(news);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const [data, total] = await prisma.$transaction([
      prisma.news.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.news.count(),
    ]);

    res.json({ data, total, page, limit });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const news = await prisma.news.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!news) return res.status(404).json({ message: "News not found" });
    res.json(news);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { title, content } = req.body;
    const updated = await prisma.news.update({
      where: { id: Number(req.params.id) },
      data: { title, content },
    });
    res.json(updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.news.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "News deleted" });
  })
);

export default router;
