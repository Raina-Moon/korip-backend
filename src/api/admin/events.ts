import express from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { title, content } = req.body;
    const event = await prisma.event.create({ data: { title, content } });
    res.status(201).json(event);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(events);
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
