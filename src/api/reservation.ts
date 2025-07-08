import { PrismaClient } from "@prisma/client";
import express from "express";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";
import { CancelReason } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";

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
      firstName,
      lastName,
      email,
      phoneNumber,
      specialRequests,
      nationality,
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
      !userId ||
      !firstName ||
      !lastName ||
      !phoneNumber
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      const reservation = await prisma.$transaction(async (tx) => {
        const dates: Date[] = [];
        let current = new Date(checkIn);
        const end = new Date(checkOut);
        while (current < end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }

        const inventories = await tx.roomInventory.findMany({
          where: {
            lodgeId: Number(lodgeId),
            roomTypeId: Number(roomTypeId),
            date: {
              in: dates,
            },
          },
        });

        const isAvailable = inventories.every(
          (inventory) => inventory.availableRooms >= Number(roomCount)
        );

        if (!isAvailable) {
          throw new Error("Not enough available rooms for the selected dates");
        }

        const roomType = await tx.roomType.findUnique({
          where: { id: Number(roomTypeId) },
          select: {
            basePrice: true,
            weekendPrice: true,
          },
        });

        if (!roomType) {
          throw new Error("Room type not found");
        }

        const isWeekend = (date: Date) => {
          const day = date.getDay();
          return day === 0 || day === 6;
        };

        let totalPrice = 0;

        for (const date of dates) {
          const seasonal = await tx.seasonalPricing.findFirst({
            where: {
              roomTypeId: Number(roomTypeId),
              from: { lte: date },
              to: { gte: date },
            },
            select: {
              basePrice: true,
              weekendPrice: true,
            },
          });

          let priceForDate: number;

          if (seasonal) {
            priceForDate = isWeekend(date)
              ? seasonal.weekendPrice
              : seasonal.basePrice;
          } else {
            priceForDate = isWeekend(date)
              ? roomType.weekendPrice ?? 0
              : roomType.basePrice ?? 0;
          }

          totalPrice += priceForDate;
        }

        totalPrice *= Number(roomCount);

        const createdReservation = await tx.reservation.create({
          data: {
            lodgeId: Number(lodgeId),
            roomTypeId: Number(roomTypeId),
            userId: userId!,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            adults: Number(adults),
            children: Number(children),
            roomCount: Number(roomCount),
            firstName,
            lastName,
            email,
            phoneNumber,
            nationality,
            specialRequests: JSON.stringify(specialRequests || []),
            status: "PENDING",
            totalPrice,
          },
        });

        return createdReservation;
      });
      return res.status(201).json(reservation);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  })
);

router.post(
  "/confirm",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { reservationId } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: "Reservation ID is required" });
    }

    try {
      const confirmed = await prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
        });

        if (!reservation) {
          throw new Error("Reservation not found");
        }

        if (reservation.status !== "PENDING") {
          throw new Error("Reservation cannot be confirmed");
        }

        const dates: Date[] = [];
        let current = new Date(reservation.checkIn);
        const end = new Date(reservation.checkOut);
        while (current < end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }

        const inventories = await tx.roomInventory.findMany({
          where: {
            lodgeId: reservation.lodgeId,
            roomTypeId: reservation.roomTypeId,
            OR: dates.map((date) => ({
              date: {
                gte: startOfDay(date),
                lt: startOfDay(addDays(date, 1)),
              },
            })),
          },
        });

        const isAvailable = inventories.every(
          (inventory) => inventory.availableRooms >= reservation.roomCount
        );

        if (!isAvailable) {
          throw new Error("Not enough available rooms for the selected dates");
        }

        await Promise.all(
          inventories.map((inventory) =>
            tx.roomInventory.update({
              where: {
                id: inventory.id,
              },
              data: {
                availableRooms: {
                  decrement: reservation.roomCount,
                },
              },
            })
          )
        );

        const updatedReservation = await tx.reservation.update({
          where: { id: reservationId },
          data: { status: "CONFIRMED" },
        });
        return updatedReservation;
      });
      return res.status(200).json({ reservation: confirmed });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  })
);

router.patch(
  "/:id/cancel",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const reservationId = Number(req.params.id);
    const { cancelReason } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: "Reservation ID is required" });
    }

    if (!cancelReason || !Object.values(CancelReason).includes(cancelReason)) {
      return res.status(400).json({ error: "Valid cancel reason is required" });
    }

    try {
      const cancelled = await prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
        });

        if (!reservation) {
          throw new Error("Reservation not found");
        }

        if (
          reservation.status === "CONFIRMED" &&
          (cancelReason === "USER_REQUESTED" || cancelReason === "ADMIN_FORCED")
        ) {
          const dates: Date[] = [];
          let current = new Date(reservation.checkIn);
          const end = new Date(reservation.checkOut);
          while (current < end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
          }

          await Promise.all(
            dates.map((date) =>
              tx.roomInventory.updateMany({
                where: {
                  lodgeId: reservation.lodgeId,
                  roomTypeId: reservation.roomTypeId,
                  date,
                },
                data: {
                  availableRooms: {
                    increment: reservation.roomCount,
                  },
                },
              })
            )
          );
        }

        const updated = await tx.reservation.update({
          where: { id: reservationId },
          data: { status: "CANCELLED" },
        });

        return updated;
      });

      return res.status(200).json({ reservation: cancelled });
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
        roomType: {
          include: {
            images: true,
          },
        },
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

export default router;
