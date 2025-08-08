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

    const event = await prisma.event.create({
      data: { title, content, titleEn, contentEn },
    });
    res.status(201).json(event);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const [data, total] = await prisma.$transaction([
      prisma.event.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.event.count(),
    ]);

    res.json({ data, total, page, limit });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { title, content } = req.body;
    const updated = await prisma.event.update({
      where: { id: Number(req.params.id) },
      data: { title, content },
    });
    res.json(updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.event.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Event deleted" });
  })
);

export default router;
