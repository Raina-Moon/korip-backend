import { PrismaClient, CancelReason } from "@prisma/client";
import express from "express";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";
import { startOfDay, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const router = express.Router();
const prisma = new PrismaClient();

function toKSTMidnightUTC(inputDate: string | Date): Date {
  const date = typeof inputDate === "string" ? new Date(inputDate) : inputDate;
  const zoned = toZonedTime(date, "Asia/Seoul");
  const localMidnight = startOfDay(zoned);
  return new Date(localMidnight.toISOString());
}

router.post(
  "/",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const {
      ticketTypeId,
      date,
      adults,
      children,
      firstName,
      lastName,
      email,
      phoneNumber,
      nationality,
      specialRequests,
    } = req.body;

    console.log("✅ Request date:", req.body.date);

    const userId = req.user?.userId;

    if (
      !ticketTypeId ||
      !date ||
      adults === undefined ||
      children === undefined ||
      !firstName ||
      !lastName ||
      !phoneNumber ||
      !userId
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const KST = "Asia/Seoul";
    const zonedDate = toZonedTime(new Date(date), KST);
    const dayStart = startOfDay(zonedDate);
    const nextDayStart = addDays(dayStart, 1);

    try {
      const reservation = await prisma.$transaction(async (tx) => {
        const inventory = await tx.ticketInventory.findFirst({
          where: {
            ticketTypeId: Number(ticketTypeId),
            date: {
              gte: dayStart,
              lt: nextDayStart,
            },
          },
        });

        if (!inventory) {
          console.error("❌ Inventory not found for:", {
            ticketTypeId,
            gte: dayStart.toISOString(),
            lt: nextDayStart.toISOString(),
          });
          return res
            .status(400)
            .json({ error: "Inventory not found for selected date" });
        }

        if (
          inventory.availableAdultTickets < Number(adults) ||
          inventory.availableChildTickets < Number(children)
        ) {
          throw new Error("Not enough tickets available for the selected date");
        }

        const ticketType = await tx.ticketType.findUnique({
          where: { id: Number(ticketTypeId) },
          select: {
            adultPrice: true,
            childPrice: true,
          },
        });

        if (!ticketType) {
          throw new Error("Ticket type not found");
        }

        const totalPrice =
          Number(adults) * ticketType.adultPrice +
          Number(children) * ticketType.childPrice;

        const createdReservation = await tx.ticketReservation.create({
          data: {
            ticketTypeId: Number(ticketTypeId),
            userId: userId!,
            date: toKSTMidnightUTC(date),
            adults: Number(adults),
            children: Number(children),
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
      if (err instanceof Error) {
        console.error("❌ Ticket reservation error:", err.message);
      } else {
        console.error("❌ Unknown error:", err);
      }
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
        const reservation = await tx.ticketReservation.findUnique({
          where: { id: reservationId },
        });

        if (!reservation) {
          throw new Error("Reservation not found");
        }

        if (reservation.status !== "PENDING") {
          throw new Error("Reservation cannot be confirmed");
        }

        const normalizedDate = toKSTMidnightUTC(reservation.date);

        const inventory = await tx.ticketInventory.findFirst({
          where: {
            ticketTypeId: reservation.ticketTypeId,
            date: {
              gte: normalizedDate,
              lt: addDays(normalizedDate, 1),
            },
          },
        });

        if (!inventory) {
          return res
            .status(404)
            .json({ error: "Inventory not found for selected date" });
        }

        if (
          inventory.availableAdultTickets < reservation.adults ||
          inventory.availableChildTickets < reservation.children
        ) {
          throw new Error("Not enough tickets available for the selected date");
        }

        await tx.ticketInventory.update({
          where: { id: inventory.id },
          data: {
            availableAdultTickets: {
              decrement: reservation.adults,
            },
            availableChildTickets: {
              decrement: reservation.children,
            },
          },
        });

        const updatedReservation = await tx.ticketReservation.update({
          where: { id: reservationId },
          data: { status: "CONFIRMED" },
        });

        return updatedReservation;
      });

      return res.status(200).json(confirmed);
    } catch (err) {
      if (err instanceof Error) {
        console.error("❌ Ticket reservation error:", err.message);
      } else {
        console.error("❌ Unknown error:", err);
      }
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
        const reservation = await tx.ticketReservation.findUnique({
          where: { id: reservationId },
        });

        if (!reservation) {
          throw new Error("Reservation not found");
        }

        const previousStatus = reservation.status;

        const updated = await tx.ticketReservation.update({
          where: { id: reservationId },
          data: { status: "CANCELLED", cancelReason: cancelReason },
        });

        if (
          previousStatus === "CONFIRMED" &&
          updated.status === "CANCELLED" &&
          (cancelReason === "USER_REQUESTED" || cancelReason === "ADMIN_FORCED")
        ) {
          await tx.ticketInventory.updateMany({
            where: {
              ticketTypeId: reservation.ticketTypeId,
              date: toKSTMidnightUTC(reservation.date),
            },
            data: {
              availableAdultTickets: {
                increment: reservation.adults,
              },
              availableChildTickets: {
                increment: reservation.children,
              },
            },
          });
        }

        return updated;
      });

      return res.status(200).json(cancelled);
    } catch (err) {
      if (err instanceof Error) {
        console.error("❌ Ticket reservation error:", err.message);
      } else {
        console.error("❌ Unknown error:", err);
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  })
);

router.get(
  "/",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user?.userId;

    try {
      const reservations = await prisma.ticketReservation.findMany({
        where: {
          userId: userId ? Number(userId) : undefined,
          OR: [
            { status: { not: "CANCELLED" } },
            {
              AND: [
                { status: "CANCELLED" },
                { cancelReason: { not: "AUTO_EXPIRED" } },
              ],
            },
          ],
        },
        include: {
          ticketType: true,
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
  })
);

export default router;
