import { PrismaClient } from "@prisma/client";
import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/", asyncHandler(async (req, res) => {
  try {
    const {
      lodgeId,
      name,
      description,
      basePrice,
      maxAdults,
      maxChildren,
      totalRooms,
    } = req.body;

    if (
      !lodgeId ||
      !name ||
      !description ||
      !basePrice ||
      !maxAdults ||
      !maxChildren ||
      !totalRooms
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const roomType = await prisma.roomType.create({
      data: {
        lodgeId,
        name,
        description,
        basePrice,
        maxAdults,
        maxChildren,
        totalRooms,
      },
    });

    res
      .status(201)
      .json({ message: "Room type created successfully", roomType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, basePrice, maxAdults, maxChildren, totalRooms } =
      req.body;

    const existingRoom = await prisma.roomType.findUnique({
      where: { id: Number(id) },
    });
    if (!existingRoom) {
      return res.status(404).json({ message: "Room type not found" });
    }

    const updatedRoomType = await prisma.roomType.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        basePrice,
        maxAdults,
        maxChildren,
        totalRooms,
      },
    });
    res
      .status(200)
      .json({ message: "Room type updated successfully", updatedRoomType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const roomType = await prisma.roomType.findUnique({
      where: { id: Number(id) },
    });
    if (!roomType) {
      return res.status(404).json({ message: "Room type not found" });
    }
    await prisma.roomType.delete({
      where: { id: Number(id) },
    });
    return res.status(200).json({ message: "Room type deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}));

router.get("/", async (_req, res) => {
  const { lodgeId } = _req.query;
  try {
    const roomTypes = await prisma.roomType.findMany({
      where: lodgeId ? { lodgeId: Number(lodgeId) } : {},
      include: {
        lodge: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    res.status(200).json(roomTypes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;