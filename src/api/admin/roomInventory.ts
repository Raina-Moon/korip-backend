import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  try {
    const { lodgeId, roomTypeId, date, availableRooms } = req.body;
    if (!lodgeId || !roomTypeId || !date || availableRooms === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingInventory = await prisma.roomInventory.findFirst({
      where: {
        lodgeId,
        roomTypeId,
        date: new Date(date),
      },
    });
    if (existingInventory) {
      return res
        .status(400)
        .json({ message: "Inventory for this date already exists" });
    }
    const updatedInventory = await prisma.roomInventory.create({
      data: {
        lodgeId,
        roomTypeId,
        date: new Date(date),
        availableRooms,
      },
    });
    res.status(201).json({
      message: "Room inventory created successfully",
      updatedInventory,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
    const { lodgeId, roomTypeId } = req.query;
  try {
    const inventory = await prisma.roomInventory.findMany({
      where: {
        lodgeId: lodgeId ? Number(lodgeId) : undefined,
        roomTypeId: roomTypeId ? Number(roomTypeId) : undefined,
      },
        include: {
        lodge: true,
        roomType: true,
      },
    });
    res.status(200).json(inventory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { date, availableRooms } = req.body;
  try {
    const existingInventory = await prisma.roomInventory.findUnique({
      where: { id: Number(id) },
    });
    if (!existingInventory) {
      return res.status(404).json({ message: "Room inventory not found" });
    }

    const data: { date?: Date; availableRooms?: number } = {};
    if (date) data.date = new Date(date);
    if (availableRooms !== undefined) data.availableRooms = availableRooms;

    const updatedInventory = await prisma.roomInventory.update({
      where: { id: Number(id) },
      data,
    });
    res.status(200).json({
      message: "Room inventory updated successfully",
      updatedInventory,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const existingInventory = await prisma.roomInventory.findUnique({
      where: { id: Number(id) },
    });
    if (!existingInventory) {
      return res.status(404).json({ message: "Room inventory not found" });
    }
    await prisma.roomInventory.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({ message: "Room inventory deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
