import { PrismaClient } from "@prisma/client";
import express from "express";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.post(
  "/",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
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
      const reservation = await prisma.$transaction(async (tx) => {
        const dates: Date[] = [];
        let current = new Date(checkIn);
        const end = new Date(checkOut);
        while (current <= end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }

        const inventories = await tx.roomInventory.findMany({
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
          throw new Error("Not enough available rooms for the selected dates");
        }

        const createdReservation = await tx.reservation.create({
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

        await Promise.all(
          inventories.map((inventory) =>
            tx.roomInventory.update({
              where: {
                id: inventory.id,
              },
              data: {
                availableRooms: { decrement: roomCount },
              },
            })
          )
        );
        return createdReservation;
      });
      return res.status(201).json(reservation);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  })
);

router.get("/", authToken, async (req: AuthRequest, res) => {
  const userId = req.user?.userId;

  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        userId: userId ? Number(userId) : undefined,
      },
      include: {
        lodge: true,
        roomType: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(reservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});
