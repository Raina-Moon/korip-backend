import { PrismaClient } from "@prisma/client";
import express from "express";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  const { name, address, latitude, longitude, description, accommodationType } =
    req.body;
  if (
    !name ||
    !address ||
    !latitude ||
    !longitude ||
    !description ||
    !accommodationType
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const lodge = await prisma.hotSpringLodge.create({
    data: {
      name,
      address,
      latitude,
      longitude,
      description,
      accommodationType,
    },
  });
  res.status(201).json({ message: "Lodge created successfully", lodge });
});

router.get("/", async (_req, res) => {
  const lodges = await prisma.hotSpringLodge.findMany();
  res.json(lodges);
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, address, latitude, longitude, description, accommodationType } =
    req.body;

  const updated = await prisma.hotSpringLodge.update({
    where: { id: Number(id) },
    data: {
      name,
      address,
      latitude,
      longitude,
      description,
      accommodationType,
    },
  });
  res.status(200).json({ message: "Lodge updated successfully", updated });
});


router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    await prisma.hotSpringLodge.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({ message: "Lodge deleted successfully" });
})

export default router;