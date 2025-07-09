import { CancelReason, PrismaClient, ReservationStatus } from "@prisma/client";
import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { addDays, startOfDay } from "date-fns";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const reservation = await prisma.reservation.findMany({
      include: {
        lodge: true,
        roomType: true,
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(reservation);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        lodge: true,
        roomType: true,
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
          },
        },
      },
    });
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    res.status(200).json(reservation);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { status, cancelReason } = req.body;
    const reservationId = Number(req.params.id);

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    if (!Object.values(ReservationStatus).includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new Error("Reservation not found");
      }

      const previousStatus = reservation.status;

      const newReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status,
          cancelReason:
            status === ReservationStatus.CANCELLED
              ? (cancelReason as CancelReason) || CancelReason.ADMIN_FORCED
              : null,
        },
      });

      if (
        previousStatus === ReservationStatus.CONFIRMED &&
        newReservation.status === ReservationStatus.CANCELLED &&
        (newReservation.cancelReason === CancelReason.USER_REQUESTED ||
          newReservation.cancelReason === CancelReason.ADMIN_FORCED)
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
                date: {
                  gte: startOfDay(date),
                  lt: startOfDay(addDays(date, 1)),
                },
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

      return newReservation;
    });
    res.status(200).json(updated);
  })
);

export default router;
