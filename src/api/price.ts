import express from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.post(
  "/caculate",
  asyncHandler(async (req, res) => {
    const { checkIn, checkOut, lodgeId, roomTypeId, roomCount } = req.body;
    const dates: Date[] = [];
    let current = new Date(checkIn);
    const end = new Date(checkOut);
    while (current < end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: { seasonalPricing: true },
    });
    if (!roomType) {
      return res.status(404).json({ message: "Room type not found" });
    }

    const totalPrice = dates.reduce((total, date) => {
      const season = roomType.seasonalPricing.find(
        (season) => date >= season.from && date <= season.to
      );

      const isWeekend = [0, 6].includes(date.getDay());
      const price = season
        ? isWeekend
          ? season.weekendPrice
          : season.basePrice
        : isWeekend
        ? roomType.weekendPrice ?? roomType.basePrice
        : roomType.basePrice;

      return total + price;
    }, 0);

    const finalPrice = totalPrice * roomCount;

    return res.status(200).json({
      totalPrice: finalPrice,
    });
  })
);
