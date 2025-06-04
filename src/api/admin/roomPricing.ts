import { PrismaClient,PriceType } from "@prisma/client";
import express from "express";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  try {
    const { roomTypeId, date, price, priceType } = req.body;
    if (!roomTypeId || !date || !price || !priceType) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingPrice = await prisma.roomPricing.findFirst({
      where: {
        roomTypeId,
        date: new Date(date),
      },
    });
    if (existingPrice) {
      return res
        .status(400)
        .json({ message: "Price for this date already exists" });
    }

    const roomPricing = await prisma.roomPricing.create({
      data: {
        roomTypeId,
        date: new Date(date),
        price,
        priceType,
      },
    });
    res
      .status(201)
      .json({ message: "Room pricing created successfully", roomPricing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { date, price, priceType } = req.body;
  try {
    const existingPrice = await prisma.roomPricing.findUnique({
      where: { id: Number(id) },
    });
    if (!existingPrice) {
      return res.status(404).json({ message: "Room pricing not found" });
    }

    const data: { date?: Date; price?: number; priceType?: PriceType } = {};
    if (date) data.date = new Date(date);
    if (price) data.price = price;
    if (priceType) data.priceType = priceType;

    const updatedPrice = await prisma.roomPricing.update({
      where: { id: Number(id) },
      data,
    });
    res
      .status(200)
      .json({ message: "Room pricing updated successfully", updatedPrice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const existingPrice = await prisma.roomPricing.findUnique({
      where: { id: Number(id) },
    });
    if (!existingPrice) {
      return res.status(404).json({ message: "Room pricing not found" });
    }
    await prisma.roomPricing.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({ message: "Room pricing deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;