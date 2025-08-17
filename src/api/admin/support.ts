import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../../utils/asyncHandler";

const admin = Router();
const prisma = new PrismaClient();

admin.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const [items, total] = await Promise.all([
      prisma.support.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.support.count(),
    ]);
    res.json({ items, total, page, pageSize });
  })
);

admin.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { answer, status } = req.body;

    const updated = await prisma.support.update({
      where: { id },
      data: {
        ...(answer !== undefined ? { answer } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });
    res.json(updated);
  })
);

export default admin;
