import express from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authToken } from "../middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";
import { detectLanguage, translateText } from "../utils/deepl";

const router = express.Router();
const prisma = new PrismaClient();

router.post(
  "/",
  authToken,
  asyncHandler(async (req: any, res) => {
    const userId = req.user?.userId;
    const { name, question } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!name || !question)
      return res.status(400).json({ message: "Missing fields" });

    const lang = await detectLanguage(question);

    let questionKo: string | null = null;
    if (lang === "EN") {
      try {
        questionKo = await translateText(question, "KO");
      } catch (e) {
        questionKo = question;
      }
    } else {
      questionKo = question;
    }

    const support = await prisma.support.create({
      data: {
        userId,
        name: String(name).trim(),
        question: String(question).trim(),
        questionKo,
        originalLang: lang,
      },
    });
    res.status(201).json(support);
  })
);

router.get(
  "/my",
  authToken,
  asyncHandler(async (req: any, res) => {
    const userId = req.user?.userId;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [items, total] = await Promise.all([
      prisma.support.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          question: true,
          originalLang: true,
          answer: true,
          answerEn: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          answeredAt: true,
        },
      }),
      prisma.support.count({ where: { userId } }),
    ]);

    const mapped = await Promise.all(
      items.map(async (it) => {
        if (it.originalLang === "EN") {
          const answerForUser =
            it.answerEn ??
            (it.answer ? await translateText(it.answer, "EN") : null);
          return { ...it, answerForUser };
        }
        return { ...it, answerForUser: it.answer ?? null };
      })
    );

    res.json({ items: mapped, total, page, pageSize });
  })
);

router.get(
  "/:id",
  authToken,
  asyncHandler(async (req: any, res) => {
    const userId = req.user?.userId;
    const id = Number(req.params.id);

    const support = await prisma.support.findUnique({ where: { id } });
    if (!support) return res.status(404).json({ message: "Not found" });

    if (support.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json(support);
  })
);

export default router;
