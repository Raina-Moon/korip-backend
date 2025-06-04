import { PrismaClient } from "@prisma/client";
import express from "express";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/", authToken, async (req: AuthRequest, res) => {
  const {
    lodgeId,
    roomTypeId,
    checkIn,
    checkOut,
    adults,
    children,
    roomCount,
  } = req.body;

  const userId = req.user?.userId;

  if (
    !lodgeId ||
    !roomTypeId ||
    !checkIn ||
    !checkOut ||
    !adults ||
    !children ||
    !roomCount ||
    !userId
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const dates: Date[] = [];
    let current = new Date(checkIn);
    const end = new Date(checkOut);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const inventories = await prisma.roomInventory.findMany({
      where: {
        lodgeId,
        roomTypeId,
        date: {
          in: dates,
        },
      },
    });
    const isAvailable = inventories.every(
      (inventory) => inventory.availableRooms >= roomCount
    );

    if (!isAvailable) {
      return res.status(400).json({ error: "Not enough rooms available" });
    }

    const reservation = await prisma.reservation.create({
      data: {
        lodgeId,
        roomTypeId,
        userId: userId!,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        adults,
        children,
        roomCount,
      },
    });

    const updates = inventories.map((inventory) => {
      prisma.roomInventory.update({
        where: {
          id: inventory.id,
        },
        data: {
          availableRooms: { decrement: roomCount },
        },
      });
    });
    await Promise.all(updates);

    return res.status(201).json(reservation);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
