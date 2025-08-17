import express from "express";
import { PrismaClient, SupportStatus } from "@prisma/client";
import { asyncHandler } from "../../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const [items, total] = await Promise.all([
      prisma.support.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          name: true,
          question: true,
          answer: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          answeredAt: true,
        },
      }),
      prisma.support.count(),
    ]);
    res.json({ items, total, page, pageSize });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
      return res.status(400).json({ message: "Invalid id" });

    const { answer, status } = req.body as {
      answer?: string;
      status?: SupportStatus;
    };

    if (status && !["PENDING", "ANSWERED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const data: Record<string, any> = {};

    if (answer !== undefined) {
      data.answer = answer;
      if (answer && (!status || status === "PENDING")) {
        data.status = "ANSWERED";
      }
      data.answeredAt = answer ? new Date() : null;
    }

    if (status !== undefined) {
      data.status = status;
      if (status === "ANSWERED" && data.answeredAt === undefined) {
        data.answeredAt = new Date();
      }
    }

    const updated = await prisma.support.update({
      where: { id },
      data,
      select: {
        id: true,
        userId: true,
        name: true,
        question: true,
        answer: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        answeredAt: true,
      },
    });
    res.json(updated);
  })
);

export default router;
