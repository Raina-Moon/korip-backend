import { PrismaClient } from "@prisma/client";
import express from "express";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  try {
    const {
      name,
      address,
      latitude,
      longitude,
      description,
      accommodationType,
    } = req.body;
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const lodges = await prisma.hotSpringLodge.findMany();
    res.json(lodges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      latitude,
      longitude,
      description,
      accommodationType,
    } = req.body;

    const existingLodge = await prisma.hotSpringLodge.findUnique({
      where: { id: Number(id) },
    });

    if (!existingLodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingLodge = await prisma.hotSpringLodge.findUnique({
      where: { id: Number(id) },
    });
    if (!existingLodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }

    await prisma.hotSpringLodge.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({ message: "Lodge deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
